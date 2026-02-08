/**
 * Customer Display Utilities
 * 
 * Sanitizes customer names (detects email-as-name) and formats phone numbers
 * for consistent display across all panels.
 */

/**
 * Returns a display-safe customer name.
 * If the full_name is actually an email or empty, returns the fallback.
 */
export function displayName(
  fullName: string | null | undefined,
  fallback = "Unknown"
): string {
  if (!fullName || fullName.trim().length === 0) return fallback;
  // If the "name" contains @ it's likely an email used as a placeholder
  if (fullName.includes("@")) return fallback;
  return fullName.trim();
}

/**
 * Formats a raw phone string into a human-readable format.
 * Supports 10-digit North American numbers and international with +.
 * Returns the original string if it can't be formatted.
 */
export function formatPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  // Strip all non-digit characters except leading +
  const hasPlus = phone.startsWith("+");
  const digits = phone.replace(/\D/g, "");

  // 10-digit: (604) 555-0200
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  // 11-digit starting with 1: +1 (604) 555-0200
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  // Already formatted or international — return as-is
  if (hasPlus || phone.includes("(")) return phone;
  return phone;
}
