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

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useStaffLocation } from "@/hooks/use-staff-location";
import { readStoredLocationScope, writeStoredLocationScope } from "@/lib/location-scope-storage";

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
  const storedLocationId = readStoredLocationScope();

  // Re-hydrate the branch scope into the URL when a page is opened without it,
  // so switching tabs keeps the previously selected branch.
  useEffect(() => {
    if (isLoading || !isSuperAdmin) return;
    if (urlLocationId) return;
    if (!storedLocationId) return;
    const next = new URLSearchParams(searchParams);
    next.set("locationId", storedLocationId);
    setSearchParams(next, { replace: true });
  }, [isLoading, isSuperAdmin, urlLocationId, storedLocationId, searchParams, setSearchParams]);

  const value = useMemo<LocationScopeValue>(() => {
    const explicit = urlLocationId && urlLocationId !== "all" ? urlLocationId : null;
    const scopeLocationId = isSuperAdmin
      ? urlLocationId
        ? explicit
        : storedLocationId
      : assignedLocationId;

    return {
      scopeLocationId,
      setScopeLocationId: (locationId: string | null) => {
        writeStoredLocationScope(locationId);
        const next = new URLSearchParams(searchParams);
        if (!locationId) next.set("locationId", "all");
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
    storedLocationId,
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
