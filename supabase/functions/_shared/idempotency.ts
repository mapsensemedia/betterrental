/**
 * Idempotency utilities for Edge Functions
 * 
 * Prevents duplicate processing of webhooks and other operations.
 * PR5: Enhanced with configurable dedup windows and atomic operations.
 */

import { getAdminClient } from "./auth.ts";

/**
 * Check if an event has already been processed within a time window
 */
export async function hasEventBeenProcessed(
  eventType: string,
  eventId: string,
  windowMinutes: number = 60
): Promise<boolean> {
  const supabase = getAdminClient();
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  
  const { data } = await supabase
    .from("notification_logs")
    .select("id")
    .eq("idempotency_key", `${eventType}:${eventId}`)
    .gte("created_at", cutoff)
    .limit(1)
    .maybeSingle();
  
  return !!data;
}

/**
 * Mark an event as processed with optional metadata
 */
export async function markEventProcessed(
  eventType: string,
  eventId: string,
  metadata?: {
    bookingId?: string;
    userId?: string;
    providerId?: string;
  }
): Promise<void> {
  const supabase = getAdminClient();
  
  await supabase.from("notification_logs").insert({
    channel: "webhook",
    notification_type: eventType,
    idempotency_key: `${eventType}:${eventId}`,
    status: "processed",
    sent_at: new Date().toISOString(),
    booking_id: metadata?.bookingId || null,
    user_id: metadata?.userId || null,
    provider_id: metadata?.providerId || null,
  });
}

/**
 * Generate idempotency key for operations
 * Uses hour-based bucketing for deduplication
 */
export function generateIdempotencyKey(
  operation: string,
  ...identifiers: string[]
): string {
  const hourKey = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
  return `${operation}:${identifiers.join(":")}:${hourKey}`;
}

/**
 * Atomic check-and-mark operation
 * Returns true if this is the first call, false if duplicate
 */
export async function claimIdempotencyKey(
  key: string,
  windowMinutes: number = 60
): Promise<boolean> {
  const supabase = getAdminClient();
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  
  // Check if already processed
  const { data: existing } = await supabase
    .from("notification_logs")
    .select("id")
    .eq("idempotency_key", key)
    .gte("created_at", cutoff)
    .limit(1)
    .maybeSingle();
  
  if (existing) {
    return false; // Already processed
  }
  
  // Try to insert (race condition handled by unique constraint if exists)
  try {
    await supabase.from("notification_logs").insert({
      channel: "idempotency",
      notification_type: "claim",
      idempotency_key: key,
      status: "claimed",
      sent_at: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    // If insert fails due to duplicate, another worker claimed it
    console.log(`[idempotency] Key already claimed: ${key}`);
    return false;
  }
}
