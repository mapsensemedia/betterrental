/**
 * Persistence for the admin/ops branch scope.
 *
 * The selected branch has to survive navigating between tabs (Ops → Inventory →
 * Payments → Reports), so we mirror the `?locationId=` URL param into
 * localStorage and re-hydrate it when a page is opened without the param.
 */

const STORAGE_KEY = "c2c.admin.locationScope";

export function readStoredLocationScope(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value && value !== "all" ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredLocationScope(locationId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (locationId) window.localStorage.setItem(STORAGE_KEY, locationId);
    else window.localStorage.setItem(STORAGE_KEY, "all");
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}
