import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

/**
 * Check if current user has support access (support, staff, or admin role)
 */
export function useIsSupportOrAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-is-support", user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "staff", "support"]);

      if (error) {
        console.error("Error checking support status:", error);
        return false;
      }

      return data && data.length > 0;
    },
    enabled: !!user,
    staleTime: 60000,
  });
}

/**
 * Check if current user has ONLY support role (no admin/staff)
 */
export function useIsSupportOnly() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-is-support-only", user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error checking support status:", error);
        return false;
      }

      if (!data || data.length === 0) return false;

      // Check if they ONLY have support role, not admin/staff
      const roles = data.map((r) => r.role);
      const hasSupport = roles.includes("support");
      const hasAdminOrStaff = roles.some((r) => r === "admin" || r === "staff");
      
      return hasSupport && !hasAdminOrStaff;
    },
    enabled: !!user,
    staleTime: 60000,
  });
}
