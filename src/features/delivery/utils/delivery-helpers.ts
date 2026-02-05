import type { DeliveryBooking } from "../api/types";
import { getPortalStatus, type PortalStatus } from "../constants/delivery-status";

// ─────────────────────────────────────────────────────────────────────────────
// FILTERING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function filterDeliveriesByStatus(
  deliveries: DeliveryBooking[],
  status: PortalStatus | null
): DeliveryBooking[] {
  if (!status) return deliveries;
  return deliveries.filter(d => d.portalStatus === status);
}

export function filterDeliveriesByDriver(
  deliveries: DeliveryBooking[],
  driverId: string | null,
  mode: 'assigned' | 'unassigned' | 'all'
): DeliveryBooking[] {
  switch (mode) {
    case 'assigned':
      return deliveries.filter(d => d.assignedDriverId === driverId);
    case 'unassigned':
      return deliveries.filter(d => !d.assignedDriverId);
    default:
      return deliveries;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SORTING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function sortDeliveriesByUrgency(deliveries: DeliveryBooking[]): DeliveryBooking[] {
  return [...deliveries].sort((a, b) => {
    // Urgent first
    if (a.isUrgent && !b.isUrgent) return -1;
    if (!a.isUrgent && b.isUrgent) return 1;
    
    // Then by start time
    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// COUNTING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function countByPortalStatus(
  deliveries: DeliveryBooking[]
): Record<PortalStatus, number> {
  const counts: Record<PortalStatus, number> = {
    pending: 0,
    en_route: 0,
    completed: 0,
    issue: 0,
  };

  for (const d of deliveries) {
    counts[d.portalStatus]++;
  }

  return counts;
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function formatDeliveryTime(startAt: string): string {
  const date = new Date(startAt);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString();

  const timeStr = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });

  if (isToday) return `Today at ${timeStr}`;
  if (isTomorrow) return `Tomorrow at ${timeStr}`;
  
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  }) + ` at ${timeStr}`;
}

export function getTimeUntilDelivery(startAt: string): string {
  const start = new Date(startAt);
  const now = new Date();
  const diffMs = start.getTime() - now.getTime();

  if (diffMs < 0) {
    const overdue = Math.abs(diffMs);
    const hours = Math.floor(overdue / (1000 * 60 * 60));
    const mins = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${mins}m overdue` : `${mins}m overdue`;
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `in ${days} day${days > 1 ? 's' : ''}`;
  }

  return hours > 0 ? `in ${hours}h ${mins}m` : `in ${mins}m`;
}
