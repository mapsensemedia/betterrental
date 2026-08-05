/**
 * Pickup progress derivation
 *
 * A booking sitting in `pending` / `confirmed` says nothing about how far the
 * pickup wizard actually got. Backdated bookings that were fully handed over,
 * abandoned reservations, and half-finished handovers all look identical from
 * `status` alone — which is why they all piled up under "needs processing".
 *
 * This module derives the real stage from the records the wizard writes:
 * agreements, check-in records, walkarounds and payments.
 */

import { supabase } from "@/integrations/supabase/client";

export type PickupStage = "not_started" | "in_progress" | "handed_over";

export interface PickupProgress {
  stage: PickupStage;
  hasAgreement: boolean;
  hasCheckin: boolean;
  hasWalkaround: boolean;
  hasPayment: boolean;
}

export const EMPTY_PROGRESS: PickupProgress = {
  stage: "not_started",
  hasAgreement: false,
  hasCheckin: false,
  hasWalkaround: false,
  hasPayment: false,
};

/**
 * Batch-load progress signals for a set of bookings.
 * One query per source table — never per booking.
 */
export async function fetchPickupProgress(
  bookingIds: string[],
): Promise<Map<string, PickupProgress>> {
  const result = new Map<string, PickupProgress>();
  if (bookingIds.length === 0) return result;

  const [agreements, checkins, walkarounds, payments] = await Promise.all([
    supabase.from("rental_agreements").select("booking_id").in("booking_id", bookingIds),
    supabase.from("checkin_records").select("booking_id").in("booking_id", bookingIds),
    supabase.from("walkaround_inspections").select("booking_id").in("booking_id", bookingIds),
    supabase
      .from("payments")
      .select("booking_id, status")
      .in("booking_id", bookingIds)
      .in("status", ["completed", "captured", "authorized"]),
  ]);

  const toSet = (rows: { booking_id: string }[] | null) =>
    new Set((rows || []).map((r) => r.booking_id));

  const agreementIds = toSet(agreements.data as any);
  const checkinIds = toSet(checkins.data as any);
  const walkaroundIds = toSet(walkarounds.data as any);
  const paymentIds = toSet(payments.data as any);

  for (const id of bookingIds) {
    const hasAgreement = agreementIds.has(id);
    const hasCheckin = checkinIds.has(id);
    const hasWalkaround = walkaroundIds.has(id);
    const hasPayment = paymentIds.has(id);
    const touched = hasAgreement || hasCheckin || hasWalkaround || hasPayment;
    result.set(id, {
      stage: touched ? "in_progress" : "not_started",
      hasAgreement,
      hasCheckin,
      hasWalkaround,
      hasPayment,
    });
  }

  return result;
}

/**
 * Final stage for a booking: `handed_over` always wins over record signals.
 */
export function resolvePickupStage(
  progress: PickupProgress | undefined,
  handedOverAt: string | null | undefined,
  activatedAt: string | null | undefined,
): PickupStage {
  if (handedOverAt || activatedAt) return "handed_over";
  return progress?.stage ?? "not_started";
}

export type PickupAttentionReason =
  | "handed_over_not_activated"
  | "in_progress"
  | "expired_no_show";

/**
 * Classify a backdated / problem pickup into an actionable bucket.
 * Returns null when the booking is a normal upcoming pickup.
 */
export function classifyPickupAttention(args: {
  startAt: string;
  endAt: string;
  handedOverAt?: string | null;
  activatedAt?: string | null;
  progress?: PickupProgress;
  now?: Date;
}): PickupAttentionReason | null {
  const now = args.now ?? new Date();
  const stage = resolvePickupStage(args.progress, args.handedOverAt, args.activatedAt);

  if (stage === "handed_over") return "handed_over_not_activated";

  const start = new Date(args.startAt);
  const end = new Date(args.endAt);

  if (stage === "in_progress") {
    // Only a problem once the pickup time has passed.
    return start < now ? "in_progress" : null;
  }

  // Nothing done and the whole rental window has elapsed → dead reservation.
  if (end < now) return "expired_no_show";
  return null;
}

export const ATTENTION_LABELS: Record<PickupAttentionReason, string> = {
  handed_over_not_activated: "Handed over — not activated",
  in_progress: "In progress — finish handover",
  expired_no_show: "Expired / no-show",
};

export const ATTENTION_DESCRIPTIONS: Record<PickupAttentionReason, string> = {
  handed_over_not_activated:
    "The vehicle was handed over but the booking status was never flipped to active.",
  in_progress:
    "Pickup was started (agreement, check-in or payment exists) but never completed.",
  expired_no_show:
    "The rental window has passed and no pickup step was ever started.",
};
