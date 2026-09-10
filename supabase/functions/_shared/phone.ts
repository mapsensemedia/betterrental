/**
 * Shared phone normalisation for every outbound Twilio call.
 *
 * Rules (no data migration — normalisation happens at send time only):
 *  - 10 digits            -> +1XXXXXXXXXX
 *  - 11 digits, leading 1 -> +1XXXXXXXXXX
 *  - already +1XXXXXXXXXX -> unchanged
 *  - anything else        -> null (caller must log "invalid_phone" and not send)
 */
export function toE164(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (/^\+1\d{10}$/.test(trimmed)) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export const INVALID_PHONE = "invalid_phone";
