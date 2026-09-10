/**
 * Shared guard: a booking may never start before today on the
 * America/Vancouver business calendar. Any time on today is allowed.
 */

const BUSINESS_TIME_ZONE = "America/Vancouver";

/** Returns YYYY-MM-DD for an instant on the business calendar */
export function businessDay(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** True when the given start timestamp falls on a day before today */
export function isPastBusinessDay(startAt: string | Date): boolean {
  const day = businessDay(startAt);
  if (!day) return false;
  return day < businessDay(new Date());
}

export const PAST_START_MESSAGE = "Pickup date cannot be in the past.";
