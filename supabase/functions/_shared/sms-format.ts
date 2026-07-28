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

/**
 * Normalise any stored phone format to the display form "(604) 306-1029".
 * Returns the default contact number when the input is empty/unusable.
 */
export function formatPhoneForMessage(raw?: string | null): string {
  if (!raw) return EMERGENCY_PHONE;
  const digits = String(raw).replace(/\D/g, "");
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (local.length !== 10) return EMERGENCY_PHONE;
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
}

/**
 * Resolve the contact number customers should call for a given booking.
 * Prefers the pickup location's phone, then the return location's,
 * then the default number.
 */
export async function getBookingContactPhone(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  booking: { location_id?: string | null; return_location_id?: string | null } | null | undefined,
): Promise<string> {
  const ids = [booking?.location_id, booking?.return_location_id].filter(Boolean) as string[];
  if (ids.length === 0) return EMERGENCY_PHONE;

  const { data } = await supabase
    .from("locations")
    .select("id, phone")
    .in("id", ids);

  if (!data || data.length === 0) return EMERGENCY_PHONE;

  for (const id of ids) {
    // deno-lint-ignore no-explicit-any
    const row = data.find((l: any) => l.id === id);
    if (row?.phone) return formatPhoneForMessage(row.phone);
  }
  return EMERGENCY_PHONE;
}

