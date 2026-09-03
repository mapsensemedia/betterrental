/**
 * Staff location scope
 *
 * Exactly two roles exist: `super_admin` (all branches, may switch) and
 * `manager` (locked to one branch). This hook resolves the acting user's
 * branch assignment from `staff_assignments`.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useCapabilities } from "@/auth/capabilities";

export interface StaffAssignment {
  id: string;
  userId: string;
  locationId: string | null;
  displayName: string | null;
  employeeCode: string | null;
  isActive: boolean;
}

/** The acting user's own staff assignment row (null when none exists). */
export function useMyStaffAssignment() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["staff-assignment", user?.id],
    queryFn: async (): Promise<StaffAssignment | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("staff_assignments")
        .select("id, user_id, location_id, display_name, employee_code, is_active")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading staff assignment:", error);
        return null;
      }
      if (!data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        locationId: data.location_id,
        displayName: data.display_name,
        employeeCode: data.employee_code,
        isActive: data.is_active,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export interface StaffLocationScope {
  /** True while role/assignment data is loading. */
  isLoading: boolean;
  /** Super admins see every branch and may switch. */
  isSuperAdmin: boolean;
  /** Branch a manager is locked to; null for super admins. */
  assignedLocationId: string | null;
  /** True when the account is a manager without a branch (sees nothing). */
  isUnassignedManager: boolean;
  canSwitchLocation: boolean;
}

export function useStaffLocation(): StaffLocationScope {
  const { data: caps, isLoading: capsLoading } = useCapabilities("admin");
  const { data: assignment, isLoading: assignmentLoading } = useMyStaffAssignment();

  const isSuperAdmin = caps?.isSuperAdmin ?? false;
  const assignedLocationId = isSuperAdmin ? null : assignment?.locationId ?? null;

  return {
    isLoading: capsLoading || assignmentLoading,
    isSuperAdmin,
    assignedLocationId,
    isUnassignedManager:
      !capsLoading && !assignmentLoading && !isSuperAdmin && !assignedLocationId,
    canSwitchLocation: isSuperAdmin,
  };
}
