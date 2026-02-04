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
export type AppRole = "admin" | "staff" | "cleaner" | "finance" | "support" | "driver";
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
  
  // Panel access
  canAccessAdminPanel: boolean;
  canAccessOpsPanel: boolean;
  canAccessSupportPanel: boolean;
  canAccessDeliveryPanel: boolean;
}

// ========== Role Definitions ==========
const ADMIN_ROLES: AppRole[] = ["admin"];
const STAFF_ROLES: AppRole[] = ["admin", "staff"];
const OPERATIONAL_ROLES: AppRole[] = ["admin", "staff", "cleaner"];
const FINANCE_ROLES: AppRole[] = ["admin", "finance"];
const SUPPORT_ROLES: AppRole[] = ["admin", "staff", "support"];
const DRIVER_ROLES: AppRole[] = ["admin", "staff", "driver"];

// ========== Capability Resolver ==========
export function resolveCapabilities(roles: AppRole[], panel: PanelType): Capabilities {
  const hasRole = (allowedRoles: AppRole[]) => roles.some(r => allowedRoles.includes(r));
  
  const isAdmin = hasRole(ADMIN_ROLES);
  const isStaff = hasRole(STAFF_ROLES);
  const isOperational = hasRole(OPERATIONAL_ROLES);
  const isFinance = hasRole(FINANCE_ROLES);
  const isSupport = hasRole(SUPPORT_ROLES);
  const isDriver = hasRole(DRIVER_ROLES);
  
  // Panel-specific overrides
  const inAdminPanel = panel === "admin";
  const inOpsPanel = panel === "ops";
  
  return {
    // Booking Operations - staff can do most ops, admin can void
    canViewBookings: isStaff || isOperational,
    canCreateBooking: isStaff,
    canModifyBooking: isStaff,
    canVoidBooking: isAdmin && inAdminPanel, // Admin only, admin panel only
    canCancelBooking: isStaff,
    canAssignVehicle: isStaff,
    canProcessHandover: isOperational,
    canProcessReturn: isOperational,
    
    // Fleet Management
    canViewFleet: isStaff || isOperational,
    canEditFleet: isAdmin,
    canMoveVehicleUnits: isAdmin && inAdminPanel, // Admin only, admin panel only
    canUpdateVehicleStatus: isOperational,
    canManageCategories: isAdmin,
    
    // Pricing & Rates - Admin only in admin panel
    canViewPricing: isStaff,
    canEditRates: isAdmin && inAdminPanel,
    canEditFuelPrice: isAdmin && inAdminPanel,
    canEditAddOnPricing: isAdmin && inAdminPanel,
    canApplyDiscounts: isStaff,
    
    // Payments & Deposits
    canViewPayments: isStaff || isFinance,
    canRecordPayment: isStaff,
    canProcessRefund: isAdmin || isFinance,
    canTakeDepositAction: isStaff,
    canOverrideFees: isAdmin,
    
    // Incidents & Damages
    canViewIncidents: isStaff,
    canCreateIncident: isOperational,
    canManageIncident: isStaff,
    
    // Support
    canViewTickets: isSupport,
    canManageTickets: isSupport,
    
    // Admin-only features
    canAccessSettings: isAdmin,
    canManageUsers: isAdmin,
    canViewAuditLogs: isAdmin,
    canViewAnalytics: isAdmin || isStaff,
    canExportData: isAdmin,
    
    // Panel access
    canAccessAdminPanel: isAdmin,
    canAccessOpsPanel: isStaff || isOperational,
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
