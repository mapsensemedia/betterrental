import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createAuditLog } from "./use-admin";
import { notifyAdmin, type AdminNotifyEventType } from "./use-admin-notify";
import type { Database } from "@/integrations/supabase/types";

type AlertType = Database["public"]["Enums"]["alert_type"];
type AlertStatus = Database["public"]["Enums"]["alert_status"];

export interface AdminAlert {
  id: string;
  alertType: AlertType;
  status: AlertStatus;
  title: string;
  message: string | null;
  bookingId: string | null;
  vehicleId: string | null;
  userId: string | null;
  createdAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  expiresAt: string | null;
}

// Priority tiers for alert grouping
export const ALERT_PRIORITY: Record<string, "critical" | "action" | "info"> = {
  damage_reported: "critical",
  emergency: "critical",
  payment_pending: "critical",
  verification_pending: "action",
  overdue: "action",
  late_return: "action",
  return_due_soon: "action",
  customer_issue: "info",
  cleaning_required: "info",
  hold_expiring: "info",
};

export function getAlertPriority(alertType: string): "critical" | "action" | "info" {
  return ALERT_PRIORITY[alertType] || "info";
}

// Expiry durations by alert type (in days)
const ALERT_EXPIRY_DAYS: Record<string, number | null> = {
  verification_pending: 7,
  return_due_soon: 2,
  overdue: 7,
  customer_issue: 3,
  late_return: 7,
  hold_expiring: 3,
  cleaning_required: 2,
  damage_reported: null, // never expires
  emergency: null,
  payment_pending: null,
};

export function getExpiresAt(alertType: string): string | null {
  const days = ALERT_EXPIRY_DAYS[alertType];
  if (days === null || days === undefined) return null;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

interface AlertFilters {
  status?: AlertStatus;
  alertType?: AlertType;
  dateFrom?: string;
  dateTo?: string;
  includeResolved?: boolean;
}

/**
 * Fetch all admin alerts with optional filters
 */
export function useAdminAlerts(filters?: AlertFilters) {
  return useQuery({
    queryKey: ["admin-alerts", filters],
    queryFn: async () => {
      let query = supabase
        .from("admin_alerts")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      } else if (!filters?.includeResolved) {
        // Default: exclude resolved
        query = query.in("status", ["pending", "acknowledged"]);
      }

      if (filters?.alertType) {
        query = query.eq("alert_type", filters.alertType);
      }
      if (filters?.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("created_at", filters.dateTo);
      }

      // Exclude expired alerts
      query = query.or("expires_at.is.null,expires_at.gt.now()");

      const { data, error } = await query.limit(100);

      if (error) {
        console.error("Error fetching alerts:", error);
        return [];
      }

      return (data || []).map((a) => ({
        id: a.id,
        alertType: a.alert_type,
        status: a.status,
        title: a.title,
        message: a.message,
        bookingId: a.booking_id,
        vehicleId: a.vehicle_id,
        userId: a.user_id,
        createdAt: a.created_at,
        acknowledgedAt: a.acknowledged_at,
        acknowledgedBy: a.acknowledged_by,
        resolvedAt: a.resolved_at,
        resolvedBy: a.resolved_by,
        expiresAt: a.expires_at,
      })) as AdminAlert[];
    },
    staleTime: 10000,
    refetchInterval: 15000,
  });
}

/**
 * Resolve an alert
 */
export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("admin_alerts")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq("id", alertId);

      if (error) throw error;
      await createAuditLog("resolve_alert", "admin_alerts", alertId);
      return alertId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });
    },
  });
}

/**
 * Acknowledge an alert
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("admin_alerts")
        .update({
          status: "acknowledged",
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user.id,
        })
        .eq("id", alertId);

      if (error) throw error;
      await createAuditLog("acknowledge_alert", "admin_alerts", alertId);
      return alertId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });
    },
  });
}

/**
 * Bulk-resolve all resolved alerts (clear them)
 */
export function useBulkResolveAlerts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertIds: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("admin_alerts")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .in("id", alertIds);

      if (error) throw error;
      return alertIds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });
    },
  });
}

/**
 * Auto-resolve non-critical alerts when a booking is completed
 */
export async function autoResolveBookingAlerts(bookingId: string, userId: string) {
  const autoResolveTypes: AlertType[] = [
    "verification_pending",
    "return_due_soon",
    "overdue",
    "customer_issue",
    "late_return",
  ];

  const { error } = await supabase
    .from("admin_alerts")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
    })
    .eq("booking_id", bookingId)
    .in("alert_type", autoResolveTypes)
    .in("status", ["pending", "acknowledged"]);

  if (error) {
    console.error("Error auto-resolving alerts:", error);
  }
}

/**
 * Create a new alert
 */
export function useCreateAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alert: {
      alertType: AlertType;
      title: string;
      message?: string;
      bookingId?: string;
      vehicleId?: string;
      userId?: string;
    }) => {
      const { data, error } = await supabase
        .from("admin_alerts")
        .insert([{
          alert_type: alert.alertType,
          title: alert.title,
          message: alert.message || null,
          booking_id: alert.bookingId || null,
          vehicle_id: alert.vehicleId || null,
          user_id: alert.userId || null,
          status: "pending",
          expires_at: getExpiresAt(alert.alertType),
        }])
        .select()
        .single();

      if (error) throw error;

      await createAuditLog("create_alert", "admin_alerts", data.id);

      // Send admin notification for critical alerts
      const notifiableTypes: AlertType[] = [
        "emergency",
        "damage_reported",
        "late_return",
        "overdue",
        "customer_issue",
      ];
      
      if (notifiableTypes.includes(alert.alertType)) {
        const eventTypeMap: Record<string, AdminNotifyEventType> = {
          emergency: "issue_reported",
          damage_reported: "damage_reported",
          late_return: "late_return",
          overdue: "overdue",
          customer_issue: "issue_reported",
        };
        
        const eventType = eventTypeMap[alert.alertType] || "issue_reported";
        
        notifyAdmin({
          eventType,
          bookingId: alert.bookingId,
          details: `${alert.title}${alert.message ? `: ${alert.message}` : ""}`,
        }).catch(console.error);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });
    },
  });
}
