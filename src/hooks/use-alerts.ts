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
}

interface AlertFilters {
  status?: AlertStatus;
  alertType?: AlertType;
  dateFrom?: string;
  dateTo?: string;
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
      })) as AdminAlert[];
    },
    staleTime: 10000, // 10 seconds - reduced for faster updates
    refetchInterval: 15000, // Poll every 15s as fallback for realtime
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

      // Create audit log
      await createAuditLog("resolve_alert", "admin_alerts", alertId);

      return alertId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
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
    },
  });
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
        // Map alert types to notification event types
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
    },
  });
}
