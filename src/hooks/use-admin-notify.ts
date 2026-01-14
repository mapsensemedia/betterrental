import { supabase } from "@/integrations/supabase/client";

export type AdminNotifyEventType = 
  | "new_booking"
  | "license_uploaded"
  | "agreement_signed"
  | "payment_received"
  | "issue_reported"
  | "ticket_created"
  | "damage_reported"
  | "late_return"
  | "overdue"
  | "verification_pending"
  | "hold_expiring"
  | "return_due_soon"
  | "rental_activated"
  | "return_completed";

interface NotifyAdminParams {
  eventType: AdminNotifyEventType;
  bookingId?: string;
  bookingCode?: string;
  customerName?: string;
  vehicleName?: string;
  details?: string;
}

/**
 * Send admin email notification for important events.
 * This is fire-and-forget - errors are logged but don't block the caller.
 */
export async function notifyAdmin(params: NotifyAdminParams): Promise<void> {
  try {
    console.log(`[Admin Notify] Sending ${params.eventType} notification`, params);
    
    const { data, error } = await supabase.functions.invoke("notify-admin", {
      body: params,
    });

    if (error) {
      console.error("[Admin Notify] Error:", error);
    } else {
      console.log("[Admin Notify] Success:", data);
    }
  } catch (err) {
    console.error("[Admin Notify] Failed to send notification:", err);
  }
}

/**
 * Hook version for components
 */
export function useAdminNotify() {
  const sendNotification = async (params: NotifyAdminParams) => {
    await notifyAdmin(params);
  };

  return { sendNotification };
}
