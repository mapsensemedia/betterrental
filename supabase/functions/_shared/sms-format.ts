/**
 * Shared SMS/email formatting constants and helpers.
 * All customer-facing dates are rendered in America/Vancouver.
 */

export const BRAND = "C2C Rental";
export const EMERGENCY_PHONE = "(604) 763-4242";
export const TIMEZONE = "America/Vancouver";

/** Date only, in Vancouver local time. e.g. "Fri, Jul 24, 2026" */
export function fmtDateVan(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Date + time, in Vancouver local time. e.g. "Fri, Jul 24, 2026, 6:00 PM" */
export function fmtDateTimeVan(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "$0.00";
  return `$${Number(n).toFixed(2)}`;
}
