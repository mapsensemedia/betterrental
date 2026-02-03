import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

/**
 * Check if current user has driver access (driver, staff, or admin role)
 */
export function useIsDriverOrAbove() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-is-driver", user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "staff", "driver"]);

      if (error) {
        console.error("Error checking driver status:", error);
        return false;
      }

      return data && data.length > 0;
    },
    enabled: !!user,
    staleTime: 60000,
  });
}

/**
 * Check if current user has ONLY driver role (no admin/staff)
 */
export function useIsDriverOnly() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-is-driver-only", user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error checking driver status:", error);
        return false;
      }

      if (!data || data.length === 0) return false;

      const roles = data.map((r) => r.role);
      const hasDriver = roles.includes("driver");
      const hasAdminOrStaff = roles.some((r) => r === "admin" || r === "staff");
      
      return hasDriver && !hasAdminOrStaff;
    },
    enabled: !!user,
    staleTime: 60000,
  });
}
