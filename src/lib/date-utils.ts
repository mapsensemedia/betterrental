/**
 * Date utilities for timezone-safe date handling.
 *
 * All UI state stores dates as "YYYY-MM-DD" strings (date-only, no timezone).
 * Conversion to timestamps only happens at submit time using these helpers.
 */

/** Format a Date to YYYY-MM-DD using local components (avoids UTC shift) */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse a YYYY-MM-DD string into a local-midnight Date (no UTC interpretation) */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Add days to a YYYY-MM-DD string, returning a new YYYY-MM-DD string.
 * All math stays in local timezone.
 */
export function addLocalDays(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

/**
 * Calculate the number of days between two YYYY-MM-DD strings.
 * Returns an integer ≥ 0.
 */
export function diffLocalDays(startStr: string, endStr: string): number {
  const s = parseLocalDate(startStr);
  const e = parseLocalDate(endStr);
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Convert a date-only string + time string to an ISO timestamp
 * by interpreting them in local timezone (browser's timezone).
 *
 * @param dateStr "YYYY-MM-DD"
 * @param time   "HH:MM" (24-hour)
 * @returns ISO string e.g. "2025-03-10T10:00:00.000-08:00" (but via Date.toISOString = UTC)
 */
export function localDateTimeToISO(dateStr: string, time: string): string {
  const d = parseLocalDate(dateStr);
  const [h, m] = time.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}
