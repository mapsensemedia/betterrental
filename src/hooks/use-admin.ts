import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import type { Json } from "@/integrations/supabase/types";

export type AppRole = "admin" | "staff" | "cleaner" | "finance" | "support";

interface UserRole {
  id: string;
  userId: string;
  role: AppRole;
  createdAt: string;
}

/**
 * Check if current user has admin/staff access
 */
export function useIsAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-is-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "staff", "cleaner", "finance"]);

      if (error) {
        console.error("Error checking admin status:", error);
        return false;
      }

      return data && data.length > 0;
    },
    enabled: !!user,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get current user's roles
 */
export function useUserRoles() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching roles:", error);
        return [];
      }

      return (data || []).map((r) => ({
        id: r.id,
        userId: r.user_id,
        role: r.role as AppRole,
        createdAt: r.created_at,
      })) as UserRole[];
    },
    enabled: !!user,
    staleTime: 60000,
  });
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  action: string,
  entityType: string,
  entityId: string | null,
  oldData?: Json,
  newData?: Json
) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;

  const { error } = await supabase.from("audit_logs").insert([{
    user_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_data: oldData ?? null,
    new_data: newData ?? null,
  }]);

  if (error) {
    console.error("Error creating audit log:", error);
  }
}

/**
 * Hook wrapper for audit logging
 */
export function useAuditLog() {
  const logAction = async (
    action: string,
    entityType: string,
    entityId: string | null,
    data?: Record<string, unknown>
  ) => {
    await createAuditLog(action, entityType, entityId, undefined, data as Json);
  };

  return { logAction };
}
