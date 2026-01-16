import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Deposit Job Processor
 * 
 * Processes queued deposit operations to prevent race conditions.
 * Can be called via cron or manually from admin panel.
 * 
 * Job types:
 * - release: Full deposit release
 * - withhold: Full deposit withhold (for damages)
 * - partial_release: Partial release with deduction
 */

interface DepositJob {
  id: string;
  booking_id: string;
  job_type: "release" | "withhold" | "partial_release";
  amount: number;
  reason: string | null;
  status: string;
  attempts: number;
  max_attempts: number;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req, false);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get pending jobs (limit to prevent long-running function)
    const { data: jobs, error: fetchError } = await supabase
      .from("deposit_jobs")
      .select("*")
      .eq("status", "pending")
      .lt("attempts", 3)
      .order("created_at", { ascending: true })
      .limit(10);

    if (fetchError) {
      throw new Error(`Failed to fetch jobs: ${fetchError.message}`);
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending jobs", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${jobs.length} deposit jobs`);

    const results: { jobId: string; success: boolean; error?: string }[] = [];

    for (const job of jobs as DepositJob[]) {
      try {
        // Mark as processing
        await supabase
          .from("deposit_jobs")
          .update({ status: "processing", attempts: job.attempts + 1 })
          .eq("id", job.id);

        // Get booking and payment info
        const { data: booking, error: bookingError } = await supabase
          .from("bookings")
          .select("id, user_id, deposit_amount")
          .eq("id", job.booking_id)
          .single();

        if (bookingError || !booking) {
          throw new Error(`Booking not found: ${job.booking_id}`);
        }

        // Get deposit payment
        const { data: depositPayment } = await supabase
          .from("payments")
          .select("id, amount, status")
          .eq("booking_id", job.booking_id)
          .eq("payment_type", "deposit")
          .eq("status", "completed")
          .maybeSingle();

        if (!depositPayment) {
          // No deposit to process, mark as completed
          await supabase
            .from("deposit_jobs")
            .update({ 
              status: "completed", 
              processed_at: new Date().toISOString(),
              last_error: "No deposit payment found"
            })
            .eq("id", job.id);

          results.push({ jobId: job.id, success: true, error: "No deposit to process" });
          continue;
        }

        // Process based on job type
        let releaseAmount = 0;
        let withholdAmount = 0;

        switch (job.job_type) {
          case "release":
            releaseAmount = job.amount;
            break;
          case "withhold":
            withholdAmount = job.amount;
            break;
          case "partial_release":
            // job.amount is the amount to withhold, rest is released
            withholdAmount = job.amount;
            releaseAmount = depositPayment.amount - job.amount;
            break;
        }

        // Update payment status
        if (releaseAmount > 0 || withholdAmount > 0) {
          await supabase
            .from("payments")
            .update({ status: "refunded" })
            .eq("id", depositPayment.id);
        }

        // Record in ledger
        if (releaseAmount > 0) {
          await supabase.from("deposit_ledger").insert({
            booking_id: job.booking_id,
            payment_id: depositPayment.id,
            action: "release",
            amount: releaseAmount,
            reason: job.reason || `Processed via job queue (${job.job_type})`,
            created_by: booking.user_id,
          });
        }

        if (withholdAmount > 0) {
          await supabase.from("deposit_ledger").insert({
            booking_id: job.booking_id,
            payment_id: depositPayment.id,
            action: "deduct",
            amount: withholdAmount,
            reason: job.reason || "Deducted for damages/fees",
            created_by: booking.user_id,
          });
        }

        // Send notification
        try {
          await supabase.functions.invoke("send-deposit-notification", {
            body: {
              bookingId: job.booking_id,
              action: releaseAmount > 0 ? "released" : "withheld",
              amount: depositPayment.amount,
              reason: job.reason,
              withheldAmount: withholdAmount,
              releasedAmount: releaseAmount,
            },
          });
        } catch (notifyErr) {
          console.warn("Failed to send deposit notification:", notifyErr);
          // Don't fail the job for notification failure
        }

        // Log to audit
        await supabase.from("audit_logs").insert({
          action: `deposit_${job.job_type}`,
          entity_type: "payment",
          entity_id: depositPayment.id,
          user_id: booking.user_id,
          new_data: {
            job_id: job.id,
            booking_id: job.booking_id,
            released: releaseAmount,
            withheld: withholdAmount,
            reason: job.reason,
          },
        });

        // Mark job as completed
        await supabase
          .from("deposit_jobs")
          .update({ 
            status: "completed", 
            processed_at: new Date().toISOString() 
          })
          .eq("id", job.id);

        console.log(`Job ${job.id} completed: released=$${releaseAmount}, withheld=$${withholdAmount}`);
        results.push({ jobId: job.id, success: true });

      } catch (jobError: any) {
        console.error(`Job ${job.id} failed:`, jobError.message);

        // Check if max attempts reached
        const newStatus = job.attempts + 1 >= job.max_attempts ? "failed" : "pending";

        await supabase
          .from("deposit_jobs")
          .update({ 
            status: newStatus, 
            last_error: jobError.message,
          })
          .eq("id", job.id);

        results.push({ jobId: job.id, success: false, error: jobError.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({ 
        message: `Processed ${jobs.length} jobs`,
        processed: jobs.length,
        success: successCount,
        failed: failCount,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in process-deposit-jobs:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
