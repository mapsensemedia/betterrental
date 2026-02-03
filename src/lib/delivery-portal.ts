import type { DeliveryBooking, DeliveryStatus } from "@/hooks/use-my-deliveries";

export type DeliveryPortalStatus = "pending" | "en_route" | "completed" | "issue";

/**
 * Normalize legacy query param values to the new Delivery Portal filters.
 */
export function normalizeDeliveryPortalTab(
  tab: string | null
): DeliveryPortalStatus | "all" | "my" | "available" | null {
  if (!tab) return null;

  const v = tab.toLowerCase();

  // New canonical values
  if (v === "my" || v === "all" || v === "available") return v;
  if (v === "pending" || v === "en_route" || v === "completed" || v === "issue") return v;

  // Legacy values used by the older UI
  if (v === "unassigned" || v === "assigned") return "pending";
  if (v === "active") return "en_route";
  if (v === "delivered") return "completed";
  if (v === "cancelled") return "issue";

  return null;
}

export function getDeliveryPortalStatus(input: {
  bookingStatus: string;
  deliveryStatus: DeliveryStatus | null;
}): DeliveryPortalStatus {
  const deliveryStatus = input.deliveryStatus ?? "unassigned";

  // Booking cancelled should always show as an Issue in the portal
  if (input.bookingStatus === "cancelled" || deliveryStatus === "cancelled" || deliveryStatus === "issue") {
    return "issue";
  }

  if (deliveryStatus === "delivered") return "completed";
  if (deliveryStatus === "picked_up" || deliveryStatus === "en_route") return "en_route";
  return "pending";
}

export function countByPortalStatus(deliveries: DeliveryBooking[] | undefined): Record<DeliveryPortalStatus, number> {
  const result: Record<DeliveryPortalStatus, number> = {
    pending: 0,
    en_route: 0,
    completed: 0,
    issue: 0,
  };

  for (const d of deliveries || []) {
    const key = getDeliveryPortalStatus({ bookingStatus: d.status, deliveryStatus: d.deliveryStatus });
    result[key] += 1;
  }

  return result;
}
