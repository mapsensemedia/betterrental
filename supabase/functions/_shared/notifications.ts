/**
 * Unified Notification Dispatcher
 * 
 * Provides idempotent notification sending with deduplication.
 * PR5: Edge Function Deduplication
 */

import { getAdminClient } from "./auth.ts";

export interface NotificationRequest {
  bookingId: string;
  userId?: string;
  channel: "email" | "sms" | "both";
  templateType: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationResult {
  sent: boolean;
  skipped: boolean;
  reason?: string;
  channels: {
    email?: boolean;
    sms?: boolean;
  };
}

/**
 * Generate idempotency key for notification
 * Uses booking ID, template type, and hour to prevent duplicates within same hour
 */
export function generateNotificationKey(
  bookingId: string,
  templateType: string,
  suffix?: string
): string {
  const hourKey = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
  return `${templateType}:${bookingId}:${hourKey}${suffix ? `:${suffix}` : ""}`;
}

/**
 * Check if notification was already sent (within dedup window)
 */
export async function wasNotificationSent(
  idempotencyKey: string,
  windowMinutes: number = 60
): Promise<boolean> {
  const supabase = getAdminClient();
  
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  
  const { data } = await supabase
    .from("notification_logs")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .gte("created_at", cutoff)
    .limit(1)
    .maybeSingle();
  
  return !!data;
}

/**
 * Log notification attempt
 */
export async function logNotification(params: {
  bookingId: string;
  userId?: string;
  notificationType: string;
  channel: string;
  status: "sent" | "failed" | "skipped";
  idempotencyKey: string;
  errorMessage?: string;
  providerId?: string;
}): Promise<void> {
  const supabase = getAdminClient();
  
  await supabase.from("notification_logs").insert({
    booking_id: params.bookingId,
    user_id: params.userId || null,
    notification_type: params.notificationType,
    channel: params.channel,
    status: params.status,
    idempotency_key: params.idempotencyKey,
    error_message: params.errorMessage || null,
    provider_id: params.providerId || null,
    sent_at: params.status === "sent" ? new Date().toISOString() : null,
  });
}

/**
 * Send notification with idempotency check
 * This is the main entry point for sending notifications
 */
export async function sendNotificationWithIdempotency(
  request: NotificationRequest
): Promise<NotificationResult> {
  const idempotencyKey = request.idempotencyKey || 
    generateNotificationKey(request.bookingId, request.templateType);
  
  // Check for recent duplicate
  const alreadySent = await wasNotificationSent(idempotencyKey);
  if (alreadySent) {
    console.log(`[notifications] Skipping duplicate: ${idempotencyKey}`);
    return {
      sent: false,
      skipped: true,
      reason: "Duplicate notification within dedup window",
      channels: {},
    };
  }
  
  // Dispatch to actual notification functions
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const result: NotificationResult = {
    sent: false,
    skipped: false,
    channels: {},
  };
  
  const sendChannel = async (channel: "email" | "sms") => {
    try {
      const endpoint = channel === "email" 
        ? `${supabaseUrl}/functions/v1/send-booking-email`
        : `${supabaseUrl}/functions/v1/send-booking-sms`;
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          bookingId: request.bookingId,
          templateType: request.templateType,
          ...request.metadata,
        }),
      });
      
      result.channels[channel] = response.ok;
      if (response.ok) result.sent = true;
    } catch (err) {
      console.error(`[notifications] ${channel} failed:`, err);
      result.channels[channel] = false;
    }
  };
  
  // Send to requested channels
  const promises: Promise<void>[] = [];
  if (request.channel === "email" || request.channel === "both") {
    promises.push(sendChannel("email"));
  }
  if (request.channel === "sms" || request.channel === "both") {
    promises.push(sendChannel("sms"));
  }
  
  await Promise.all(promises);
  
  // Log the notification
  await logNotification({
    bookingId: request.bookingId,
    userId: request.userId,
    notificationType: request.templateType,
    channel: request.channel,
    status: result.sent ? "sent" : "failed",
    idempotencyKey,
  });
  
  return result;
}

/**
 * Fire-and-forget notification helper
 * Use when you don't need to wait for result
 */
export function fireAndForgetNotification(request: NotificationRequest): void {
  sendNotificationWithIdempotency(request).catch(err => {
    console.error("[notifications] Fire-and-forget failed:", err);
  });
}
