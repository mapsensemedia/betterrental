/**
 * Capability-Based Authorization System
 * 
 * Provides role + panel-aware permission checking.
 * Actions are shown/hidden based on capabilities, not duplicate pages.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { queryKeys } from "@/domain/queryKeys";

// ========== Types ==========
/**
 * Only two business roles exist: `super_admin` (all branches) and `manager`
 * (one assigned branch). `driver` is kept solely for the delivery portal.
 * The remaining values are legacy and only appear on historical rows.
 */
export type AppRole =
  | "super_admin"
  | "manager"
  | "driver"
  // legacy — retained for backwards compatibility only
  | "admin"
  | "staff"
  | "cleaner"
  | "finance"
  | "support";
export type PanelType = "admin" | "ops" | "support" | "delivery";

export interface Capabilities {
  // Booking Operations
  canViewBookings: boolean;
  canCreateBooking: boolean;
  canModifyBooking: boolean;
  canVoidBooking: boolean;
  canCancelBooking: boolean;
  canAssignVehicle: boolean;
  canProcessHandover: boolean;
  canProcessReturn: boolean;
  
  // Fleet Management
  canViewFleet: boolean;
  canEditFleet: boolean;
  canMoveVehicleUnits: boolean;
  canUpdateVehicleStatus: boolean;
  canManageCategories: boolean;
  
  // Pricing & Rates
  canViewPricing: boolean;
  canEditRates: boolean;
  canEditFuelPrice: boolean;
  canEditAddOnPricing: boolean;
  canApplyDiscounts: boolean;
  
  // Payments & Deposits
  canViewPayments: boolean;
  canRecordPayment: boolean;
  canProcessRefund: boolean;
  canTakeDepositAction: boolean;
  canOverrideFees: boolean;
  
  // Incidents & Damages
  canViewIncidents: boolean;
  canCreateIncident: boolean;
  canManageIncident: boolean;
  
  // Support
  canViewTickets: boolean;
  canManageTickets: boolean;
  
  // Admin-only
  canAccessSettings: boolean;
  canManageUsers: boolean;
  canViewAuditLogs: boolean;
  canViewAnalytics: boolean;
  canExportData: boolean;
  
  // Location scope
  isSuperAdmin: boolean;
  canSwitchLocation: boolean;
  canManageStaff: boolean;
  canViewAllLocations: boolean;

  // Panel access
  canAccessAdminPanel: boolean;
  canAccessOpsPanel: boolean;
  canAccessSupportPanel: boolean;
  canAccessDeliveryPanel: boolean;
}

// ========== Role Definitions ==========
/** Company-wide: every branch, every setting, staff management. */
const SUPER_ADMIN_ROLES: AppRole[] = ["super_admin", "admin"];
/** Branch-scoped operator. Legacy roles are folded in here. */
const MANAGER_ROLES: AppRole[] = ["manager", "staff", "cleaner", "finance", "support"];
const DRIVER_ROLES: AppRole[] = ["super_admin", "admin", "manager", "staff", "driver"];

// ========== Capability Resolver ==========
export function resolveCapabilities(roles: AppRole[], panel: PanelType): Capabilities {
  const hasRole = (allowedRoles: AppRole[]) => roles.some(r => allowedRoles.includes(r));

  const isSuperAdmin = hasRole(SUPER_ADMIN_ROLES);
  const isManager = hasRole(MANAGER_ROLES);
  /** Anything a branch operator may do (super admins may do it everywhere). */
  const isStaff = isSuperAdmin || isManager;
  const isAdmin = isSuperAdmin;
  const isOperational = isStaff;
  const isFinance = isStaff;
  const isSupport = isStaff;
  const isDriver = hasRole(DRIVER_ROLES);

  // Panel-specific overrides
  const inAdminPanel = panel === "admin";
  const inOpsPanel = panel === "ops";

  
  return {
    // Booking Operations — managers run their branch end to end
    canViewBookings: isStaff,
    canCreateBooking: isStaff,
    canModifyBooking: isStaff,
    canVoidBooking: isStaff && inAdminPanel,
    canCancelBooking: isStaff,
    canAssignVehicle: isStaff,
    canProcessHandover: isOperational,
    canProcessReturn: isOperational,

    // Fleet Management
    canViewFleet: isStaff,
    canEditFleet: isStaff,
    canMoveVehicleUnits: isSuperAdmin && inAdminPanel, // cross-branch transfer
    canUpdateVehicleStatus: isOperational,
    canManageCategories: isSuperAdmin,

    // Pricing & Rates — global configuration is Super Admin only
    canViewPricing: isStaff,
    canEditRates: isSuperAdmin && inAdminPanel,
    canEditFuelPrice: isSuperAdmin && inAdminPanel,
    canEditAddOnPricing: isSuperAdmin && inAdminPanel,
    canApplyDiscounts: isStaff,

    // Payments & Deposits
    canViewPayments: isStaff,
    canRecordPayment: isStaff,
    canProcessRefund: isStaff,
    canTakeDepositAction: isStaff,
    canOverrideFees: isSuperAdmin,

    // Incidents & Damages
    canViewIncidents: isStaff,
    canCreateIncident: isOperational,
    canManageIncident: isStaff,

    // Support
    canViewTickets: isSupport,
    canManageTickets: isSupport,

    // Super-Admin-only features
    canAccessSettings: isSuperAdmin,
    canManageUsers: isSuperAdmin,
    canViewAuditLogs: isStaff,
    canViewAnalytics: isStaff,
    canExportData: isStaff,

    // Location scope
    isSuperAdmin,
    canSwitchLocation: isSuperAdmin,
    canManageStaff: isSuperAdmin,
    canViewAllLocations: isSuperAdmin,

    // Panel access
    canAccessAdminPanel: isStaff,
    canAccessOpsPanel: isStaff,
    canAccessSupportPanel: isSupport,
    canAccessDeliveryPanel: isDriver,
  };
}

// ========== Default Empty Capabilities ==========
const EMPTY_CAPABILITIES: Capabilities = {
  canViewBookings: false,
  canCreateBooking: false,
  canModifyBooking: false,
  canVoidBooking: false,
  canCancelBooking: false,
  canAssignVehicle: false,
  canProcessHandover: false,
  canProcessReturn: false,
  canViewFleet: false,
  canEditFleet: false,
  canMoveVehicleUnits: false,
  canUpdateVehicleStatus: false,
  canManageCategories: false,
  canViewPricing: false,
  canEditRates: false,
  canEditFuelPrice: false,
  canEditAddOnPricing: false,
  canApplyDiscounts: false,
  canViewPayments: false,
  canRecordPayment: false,
  canProcessRefund: false,
  canTakeDepositAction: false,
  canOverrideFees: false,
  canViewIncidents: false,
  canCreateIncident: false,
  canManageIncident: false,
  canViewTickets: false,
  canManageTickets: false,
  canAccessSettings: false,
  canManageUsers: false,
  canViewAuditLogs: false,
  canViewAnalytics: false,
  canExportData: false,
  isSuperAdmin: false,
  canSwitchLocation: false,
  canManageStaff: false,
  canViewAllLocations: false,
  canAccessAdminPanel: false,
  canAccessOpsPanel: false,
  canAccessSupportPanel: false,
  canAccessDeliveryPanel: false,
};

// ========== React Hook ==========
export function useCapabilities(panel: PanelType = "admin") {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.auth.capabilities(user?.id || "", panel),
    queryFn: async (): Promise<Capabilities> => {
      if (!user) return EMPTY_CAPABILITIES;
      
      // Fetch user roles
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      if (error) {
        console.error("Error fetching user roles:", error);
        return EMPTY_CAPABILITIES;
      }
      
      const roles = (data || []).map(r => r.role as AppRole);
      
      if (roles.length === 0) {
        return EMPTY_CAPABILITIES;
      }
      
      return resolveCapabilities(roles, panel);
    },
    enabled: !!user,
    staleTime: 60000, // 1 minute
  });
}

// ========== Panel Access Hooks ==========
export function useCanAccessOps() {
  const { data: caps, isLoading } = useCapabilities("ops");
  return { canAccess: caps?.canAccessOpsPanel ?? false, isLoading };
}

export function useCanAccessAdmin() {
  const { data: caps, isLoading } = useCapabilities("admin");
  return { canAccess: caps?.canAccessAdminPanel ?? false, isLoading };
}

// ========== Utility for components ==========
export function useCapability(capability: keyof Capabilities, panel: PanelType = "admin"): boolean {
  const { data } = useCapabilities(panel);
  return data?.[capability] ?? false;
}
