/**
 * use-pre-activation-check
 *
 * Fetches whether a booking has both a rental payment row AND a deposit hold
 * before staff can activate the rental. Used to gate the activation button
 * with a confirmation modal when either is missing.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PreActivationStatus {
  missingRental: boolean;
  missingDeposit: boolean;
  ok: boolean;
}

export function usePreActivationCheck() {
  return useCallback(async (bookingId: string): Promise<PreActivationStatus> => {
    const [{ data: booking }, { data: rentalRows }, { data: holdRows }] = await Promise.all([
      supabase
        .from("bookings")
        .select("wl_deposit_auth_status, deposit_status")
        .eq("id", bookingId)
        .single(),
      supabase
        .from("payments")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("payment_type", "rental")
        .limit(1),
      supabase
        .from("deposit_ledger")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("action", "hold")
        .limit(1),
    ]);

    const missingRental = !rentalRows || rentalRows.length === 0;
    const depositAuthStr = ((booking as any)?.wl_deposit_auth_status || booking?.deposit_status || "")
      .toString()
      .toLowerCase();
    const depositAuthorized = ["authorized", "captured", "hold_created"].includes(depositAuthStr);
    const hasLedgerHold = !!holdRows && holdRows.length > 0;
    const missingDeposit = !depositAuthorized && !hasLedgerHold;

    return {
      missingRental,
      missingDeposit,
      ok: !missingRental && !missingDeposit,
    };
  }, []);
}

export async function logActivationOverride(
  bookingId: string,
  status: PreActivationStatus,
  source: "ops_handover" | "delivery_portal",
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      action: "activation_without_deposit",
      entity_type: "booking",
      entity_id: bookingId,
      user_id: user?.id ?? null,
      new_data: {
        source,
        missing_rental: status.missingRental,
        missing_deposit: status.missingDeposit,
        confirmed_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.warn("[pre-activation] audit log failed:", err);
  }
}
