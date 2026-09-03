/**
 * LocationScopeProvider
 *
 * Single source of truth for "which branch am I looking at?" inside the
 * admin and ops panels.
 *
 * - Manager: locked to their assigned branch, no switcher.
 * - Super Admin: may switch between All / Surrey / Langley / Abbotsford,
 *   persisted in the URL (`?locationId=`) like the existing ops filter.
 *
 * `scopeLocationId === null` means "all branches" and is only reachable by a
 * super admin. This is a convenience/UI layer — RLS and the edge-function
 * guard remain the real boundary.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useStaffLocation } from "@/hooks/use-staff-location";

interface LocationScopeValue {
  /** Branch to filter queries by, or null for all branches. */
  scopeLocationId: string | null;
  setScopeLocationId: (locationId: string | null) => void;
  isSuperAdmin: boolean;
  canSwitchLocation: boolean;
  assignedLocationId: string | null;
  isUnassignedManager: boolean;
  isLoading: boolean;
}

const LocationScopeContext = createContext<LocationScopeValue | null>(null);

export function LocationScopeProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isSuperAdmin, assignedLocationId, isUnassignedManager, isLoading, canSwitchLocation } =
    useStaffLocation();

  const urlLocationId = searchParams.get("locationId");

  const value = useMemo<LocationScopeValue>(() => {
    const scopeLocationId = isSuperAdmin
      ? urlLocationId && urlLocationId !== "all"
        ? urlLocationId
        : null
      : assignedLocationId;

    return {
      scopeLocationId,
      setScopeLocationId: (locationId: string | null) => {
        const next = new URLSearchParams(searchParams);
        if (!locationId) next.delete("locationId");
        else next.set("locationId", locationId);
        setSearchParams(next, { replace: true });
      },
      isSuperAdmin,
      canSwitchLocation,
      assignedLocationId,
      isUnassignedManager,
      isLoading,
    };
  }, [
    isSuperAdmin,
    canSwitchLocation,
    assignedLocationId,
    isUnassignedManager,
    isLoading,
    urlLocationId,
    searchParams,
    setSearchParams,
  ]);

  return <LocationScopeContext.Provider value={value}>{children}</LocationScopeContext.Provider>;
}

export function useLocationScope(): LocationScopeValue {
  const ctx = useContext(LocationScopeContext);
  if (ctx) return ctx;
  // Safe fallback for trees rendered outside the provider (e.g. dialogs in tests)
  return {
    scopeLocationId: null,
    setScopeLocationId: () => {},
    isSuperAdmin: false,
    canSwitchLocation: false,
    assignedLocationId: null,
    isUnassignedManager: false,
    isLoading: false,
  };
}
