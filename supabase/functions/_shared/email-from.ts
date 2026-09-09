/**
 * Single source of truth for outgoing email sender addresses.
 *
 * The Resend sandbox sender (onboarding@resend.dev) only ever delivers to the
 * account owner, which is why customer emails never arrived. All mail now goes
 * out from the verified c2crental.ca domain. Override per-environment with the
 * EMAIL_FROM_* secrets if the sending domain ever changes.
 */
const DEFAULT_DOMAIN = Deno.env.get("EMAIL_SENDER_DOMAIN") || "c2crental.ca";

export const FROM_BOOKINGS =
  Deno.env.get("EMAIL_FROM_BOOKINGS") || `C2C Car Rental <bookings@${DEFAULT_DOMAIN}>`;

export const FROM_SUPPORT =
  Deno.env.get("EMAIL_FROM_SUPPORT") || `C2C Car Rental <support@${DEFAULT_DOMAIN}>`;

export const FROM_NOREPLY =
  Deno.env.get("EMAIL_FROM_NOREPLY") || `C2C Car Rental <no-reply@${DEFAULT_DOMAIN}>`;
