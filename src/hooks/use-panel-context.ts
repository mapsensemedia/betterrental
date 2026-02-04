/**
 * Hook to determine current panel context and provide context-aware utilities
 */

import { useLocation } from "react-router-dom";

export type PanelContext = "ops" | "admin";

interface PanelContextResult {
  /** Current panel context */
  context: PanelContext;
  /** Whether in ops panel */
  isOps: boolean;
  /** Whether in admin panel */
  isAdmin: boolean;
  /** Get route path adjusted for current context */
  getContextRoute: (adminPath: string) => string;
  /** Get back route for current context */
  getBackRoute: (defaultAdminPath: string) => string;
}

export function usePanelContext(): PanelContextResult {
  const location = useLocation();
  const isOps = location.pathname.startsWith("/ops");
  const isAdmin = location.pathname.startsWith("/admin");
  
  const context: PanelContext = isOps ? "ops" : "admin";
  
  /**
   * Convert an admin route to the appropriate route for current context
   * e.g., /admin/bookings -> /ops/bookings (when in ops context)
   */
  const getContextRoute = (adminPath: string): string => {
    if (isOps && adminPath.startsWith("/admin/")) {
      // Map admin paths to ops equivalents
      const mappings: Record<string, string> = {
        "/admin/bookings": "/ops/bookings",
        "/admin/active-rentals": "/ops/active",
        "/admin/returns": "/ops/returns",
        "/admin/pickups": "/ops/pickups",
      };
      
      // Check for booking-specific routes
      const bookingOpsMatch = adminPath.match(/^\/admin\/bookings\/([^/]+)\/ops$/);
      if (bookingOpsMatch) {
        return `/ops/booking/${bookingOpsMatch[1]}/handover`;
      }
      
      const activeRentalMatch = adminPath.match(/^\/admin\/active-rentals\/([^/]+)$/);
      if (activeRentalMatch) {
        return `/ops/rental/${activeRentalMatch[1]}`;
      }
      
      const returnMatch = adminPath.match(/^\/admin\/returns\/([^/]+)$/);
      if (returnMatch) {
        return `/ops/return/${returnMatch[1]}`;
      }
      
      return mappings[adminPath] || adminPath;
    }
    return adminPath;
  };
  
  /**
   * Get the appropriate "back" route based on current context
   */
  const getBackRoute = (defaultAdminPath: string): string => {
    // Check for explicit returnTo param
    const searchParams = new URLSearchParams(location.search);
    const returnTo = searchParams.get("returnTo");
    if (returnTo) return returnTo;
    
    // Infer from context
    if (isOps) {
      const mappings: Record<string, string> = {
        "/admin/bookings": "/ops/bookings",
        "/admin/active-rentals": "/ops/active",
        "/admin/returns": "/ops/returns",
        "/admin/pickups": "/ops/pickups",
      };
      return mappings[defaultAdminPath] || "/ops";
    }
    
    return defaultAdminPath;
  };
  
  return {
    context,
    isOps,
    isAdmin,
    getContextRoute,
    getBackRoute,
  };
}
