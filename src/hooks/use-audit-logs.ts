/**
 * Hook to fetch and manage audit logs
 * Tracks all admin changes: who, what, when
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  userId: string | null;
  createdAt: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  ipAddress: string | null;
  userName?: string;
  userEmail?: string;
}

interface UseAuditLogsOptions {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}

/**
 * Fetch audit logs with optional filters
 */
export function useAuditLogs(options: UseAuditLogsOptions = {}) {
  const { entityType, entityId, userId, action, limit = 100, offset = 0 } = options;

  return useQuery({
    queryKey: ["audit-logs", { entityType, entityId, userId, action, limit, offset }],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select(`
          id,
          action,
          entity_type,
          entity_id,
          user_id,
          created_at,
          old_data,
          new_data,
          ip_address
        `)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (entityType) {
        query = query.eq("entity_type", entityType);
      }
      if (entityId) {
        query = query.eq("entity_id", entityId);
      }
      if (userId) {
        query = query.eq("user_id", userId);
      }
      if (action) {
        query = query.eq("action", action);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching audit logs:", error);
        throw error;
      }

      // Fetch user profiles for display names
      const userIds = [...new Set((data || []).map(log => log.user_id).filter(Boolean))];
      let profiles: Record<string, { fullName: string | null; email: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        
        profiles = (profileData || []).reduce((acc, p) => {
          acc[p.id] = { fullName: p.full_name, email: p.email };
          return acc;
        }, {} as Record<string, { fullName: string | null; email: string | null }>);
      }

      return (data || []).map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entity_type,
        entityId: log.entity_id,
        userId: log.user_id,
        createdAt: log.created_at,
        oldData: log.old_data as Record<string, unknown> | null,
        newData: log.new_data as Record<string, unknown> | null,
        ipAddress: log.ip_address,
        userName: log.user_id ? profiles[log.user_id]?.fullName || undefined : undefined,
        userEmail: log.user_id ? profiles[log.user_id]?.email || undefined : undefined,
      })) as AuditLog[];
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch audit logs for a specific booking
 */
export function useBookingAuditLogs(bookingId: string | undefined) {
  return useAuditLogs({
    entityType: "booking",
    entityId: bookingId,
    limit: 50,
  });
}

/**
 * Get audit log stats
 */
export function useAuditStats() {
  return useQuery({
    queryKey: ["audit-stats"],
    queryFn: async () => {
      // Get counts by action type in last 24h
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data, error } = await supabase
        .from("audit_logs")
        .select("action, entity_type, created_at")
        .gte("created_at", yesterday.toISOString());

      if (error) {
        console.error("Error fetching audit stats:", error);
        return { total: 0, byAction: {}, byEntity: {} };
      }

      const byAction: Record<string, number> = {};
      const byEntity: Record<string, number> = {};

      (data || []).forEach((log) => {
        byAction[log.action] = (byAction[log.action] || 0) + 1;
        byEntity[log.entity_type] = (byEntity[log.entity_type] || 0) + 1;
      });

      return {
        total: data?.length || 0,
        byAction,
        byEntity,
      };
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Create an audit log entry with proper typing
 */
export function useCreateAuditLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      action,
      entityType,
      entityId,
      oldData,
      newData,
    }: {
      action: string;
      entityType: string;
      entityId: string | null;
      oldData?: Record<string, unknown>;
      newData?: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase.from("audit_logs").insert([{
        user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_data: oldData as Json ?? null,
        new_data: newData as Json ?? null,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["audit-stats"] });
    },
  });
}
