/**
 * Branch scope helper for ops queues.
 *
 * The branch selector now lives once in the admin top bar
 * (`LocationScopeSwitcher`), so this file only exposes the read hook. Ops pages
 * must not render their own location dropdown.
 */

import { useEffectiveLocationId } from "@/hooks/use-staff-location";

/** Current branch scope, or null for all branches. */
export function useOpsLocationFilter(): string | null {
  const { locationId } = useEffectiveLocationId();
  return locationId;
}
