/**
 * Booking Route Helper
 * 
 * Routes bookings to the correct admin screen based on their status:
 * - pending/confirmed → BookingOps (preparation/handover flow)
 * - active → ActiveRentalDetail (monitoring + return initiation)
 * - completed → Read-only detail view
 * - cancelled → Read-only detail view
 */

type BookingStatus = "draft" | "pending" | "confirmed" | "active" | "completed" | "cancelled";

interface RouteOptions {
  returnTo?: string;
}

/**
 * Get the correct admin route for a booking based on its status
 */
export function getBookingRoute(bookingId: string, status: BookingStatus, options: RouteOptions = {}): string {
  const returnTo = options.returnTo || "/admin/bookings";
  const returnParam = `?returnTo=${encodeURIComponent(returnTo)}`;

  switch (status) {
    case "pending":
    case "confirmed":
      // Pre-rental: BookingOps for preparation and handover
      return `/admin/bookings/${bookingId}/ops${returnParam}`;
    
    case "active":
      // During rental: Active Rental Detail for monitoring
      return `/admin/active-rentals/${bookingId}`;
    
    case "completed":
    case "cancelled":
      // Post-rental: Read-only booking detail view
      return `/admin/bookings/${bookingId}${returnParam}`;
    
    default:
      return `/admin/bookings/${bookingId}/ops${returnParam}`;
  }
}

/**
 * Get the correct return flow route for an active rental
 */
export function getReturnRoute(bookingId: string): string {
  return `/admin/returns/${bookingId}`;
}

/**
 * Determine if a booking should show "Process Return" action
 */
export function canInitiateReturn(status: BookingStatus): boolean {
  return status === "active";
}

/**
 * Determine if a booking is in pre-rental phase (can be prepped/handed over)
 */
export function isPreRentalPhase(status: BookingStatus): boolean {
  return status === "pending" || status === "confirmed";
}

/**
 * Get the appropriate action label for a booking based on status
 */
export function getBookingActionLabel(status: BookingStatus): string {
  switch (status) {
    case "pending":
      return "Review";
    case "confirmed":
      return "Prepare";
    case "active":
      return "Monitor";
    case "completed":
      return "View";
    case "cancelled":
      return "View";
    default:
      return "Open";
  }
}
