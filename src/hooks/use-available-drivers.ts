import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AvailableDriver {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
}

/**
 * Fetch users with the 'driver' role for assignment
 */
export function useAvailableDrivers() {
  return useQuery<AvailableDriver[]>({
    queryKey: ["available-drivers"],
    queryFn: async () => {
      // Get all users with driver role
      const { data: driverRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "driver");

      if (rolesError) {
        console.error("Error fetching driver roles:", rolesError);
        throw rolesError;
      }

      if (!driverRoles || driverRoles.length === 0) return [];

      const driverIds = driverRoles.map(r => r.user_id);

      // Get driver profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", driverIds);

      if (profilesError) {
        console.error("Error fetching driver profiles:", profilesError);
        throw profilesError;
      }

      return (profiles || []).map(p => ({
        id: p.id,
        fullName: p.full_name || p.email || "Unknown Driver",
        email: p.email || "",
        phone: p.phone,
      }));
    },
    staleTime: 30000, // 30 seconds - reference data tier
    gcTime: 120000,   // Keep cached for 2 minutes
  });
}
