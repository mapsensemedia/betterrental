// Auto-reconciles rental payments that are 'authorized' in our DB but already
// captured at Bambora. Read-only Bambora calls (GET /payments/{id}) - no charges.
// Triggered by pg_cron every 6 hours, or manually by admin.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { worldlineRequest } from "../_shared/worldline.ts";

interface BamboraAdjustment {
  id?: number | string;
  type?: string; // PAC = pre-auth completion, VP = void
  amount?: number;
  approval_code?: string;
  processed_at?: string;
}

interface BamboraPaymentResponse {
  id?: string | number;
  amount?: number;
  total_completions?: number;
  total_refunds?: number;
  type?: string;
  adjusted_by?: BamboraAdjustment[];
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const startedAt = new Date().toISOString();
  const reconciled: Array<{ booking_code: string | null; transaction_id: string; amount: number; pac_id?: string | number }> = [];
  const unchanged: Array<{ transaction_id: string; reason: string }> = [];
  const errors: Array<{ transaction_id: string | null; error: string }> = [];

  try {
    // Pull authorized rental payments from the last 60 days
    const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    const { data: candidates, error: selErr } = await supabase
      .from("payments")
      .select("id, booking_id, transaction_id, amount, status, payment_type, created_at, bookings:booking_id (id, booking_code, wl_auth_status)")
      .eq("payment_type", "rental")
      .eq("status", "authorized")
      .not("transaction_id", "is", null)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(500);

    if (selErr) throw selErr;

    console.log(`[wl-reconcile-authorized] scanning ${candidates?.length ?? 0} authorized rental payments`);

    for (const p of candidates ?? []) {
      const txnId = p.transaction_id as string;
      try {
        const res = await worldlineRequest<BamboraPaymentResponse>("GET", `/payments/${txnId}`);

        if (!res.ok || !res.data) {
          errors.push({ transaction_id: txnId, error: `bambora_query_failed status=${res.status}` });
          continue;
        }

        const data = res.data;
        const totalCompletions = Number(data.total_completions ?? 0);
        const totalRefunds = Number(data.total_refunds ?? 0);
        const originalAmount = Number(data.amount ?? p.amount ?? 0);
        const pac = (data.adjusted_by ?? []).find((a) => (a?.type ?? "").toUpperCase() === "PAC");

        const isFullyCaptured = !!pac && totalCompletions >= originalAmount && totalRefunds === 0;

        if (!isFullyCaptured) {
          unchanged.push({
            transaction_id: txnId,
            reason: pac ? `partial: completed=${totalCompletions}/${originalAmount}` : "no_pac",
          });
          continue;
        }

        // Promote payment row to completed
        const { error: payUpdErr } = await supabase
          .from("payments")
          .update({ status: "completed" })
          .eq("id", p.id)
          .eq("status", "authorized"); // guard against races
        if (payUpdErr) throw payUpdErr;

        // Promote booking.wl_auth_status if still 'authorized'
        const bookingAuthStatus = (p as any).bookings?.wl_auth_status;
        if (bookingAuthStatus === "authorized") {
          const { error: bkUpdErr } = await supabase
            .from("bookings")
            .update({ wl_auth_status: "completed" })
            .eq("id", p.booking_id)
            .eq("wl_auth_status", "authorized");
          if (bkUpdErr) {
            console.warn("[wl-reconcile-authorized] booking update failed", bkUpdErr);
          }
        }

        // Audit log
        await supabase.from("audit_logs").insert({
          action: "rental_payment_auto_completed",
          entity_type: "payment",
          entity_id: p.id,
          new_data: {
            transaction_id: txnId,
            amount: originalAmount,
            pac_id: pac?.id ?? null,
            pac_processed_at: pac?.processed_at ?? null,
            source: "wl-reconcile-authorized",
            verified_via: "GET /payments/{id} (PAC confirmed)",
          },
        });

        reconciled.push({
          booking_code: (p as any).bookings?.booking_code ?? null,
          transaction_id: txnId,
          amount: originalAmount,
          pac_id: pac?.id,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[wl-reconcile-authorized] error on", txnId, msg);
        errors.push({ transaction_id: txnId, error: msg });
      }
    }

    const summary = {
      success: true,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      scanned: candidates?.length ?? 0,
      reconciled_count: reconciled.length,
      unchanged_count: unchanged.length,
      error_count: errors.length,
      reconciled,
      unchanged,
      errors,
    };

    console.log(`[wl-reconcile-authorized] done`, {
      scanned: summary.scanned,
      reconciled: summary.reconciled_count,
      unchanged: summary.unchanged_count,
      errors: summary.error_count,
    });

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[wl-reconcile-authorized] fatal", msg);
    return new Response(JSON.stringify({ success: false, error: msg, reconciled, unchanged, errors }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
