/**
 * Idempotency utilities for Edge Functions
 * 
 * Prevents duplicate processing of webhooks and other operations
 */

import { getAdminClient } from "./auth.ts";

/**
 * Check if an event has already been processed
 * Uses a simple table-based approach
 */
export async function hasEventBeenProcessed(
  eventType: string,
  eventId: string
): Promise<boolean> {
  const supabase = getAdminClient();
  
  // Check notification_logs or a dedicated idempotency table
  const { data } = await supabase
    .from("notification_logs")
    .select("id")
    .eq("idempotency_key", `${eventType}:${eventId}`)
    .limit(1)
    .maybeSingle();
  
  return !!data;
}

/**
 * Mark an event as processed
 */
export async function markEventProcessed(
  eventType: string,
  eventId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = getAdminClient();
  
  await supabase.from("notification_logs").insert({
    channel: "webhook",
    notification_type: eventType,
    idempotency_key: `${eventType}:${eventId}`,
    status: "processed",
    sent_at: new Date().toISOString(),
  });
}

/**
 * Generate idempotency key for operations
 */
export function generateIdempotencyKey(
  operation: string,
  ...identifiers: string[]
): string {
  return `${operation}:${identifiers.join(":")}:${Date.now()}`;
}
