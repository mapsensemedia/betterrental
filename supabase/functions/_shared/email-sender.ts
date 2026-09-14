/**
 * Single source of truth for outbound email identity.
 *
 * All addresses live on the verified c2crental.ca sending domain. Never send
 * from a test domain such as resend.dev — those messages do not reach
 * customers reliably.
 */

/** Customer-facing booking, agreement, invoice and cancellation updates. */
export const EMAIL_FROM_CUSTOMER = "C2C Car Rental <noreply@c2crental.ca>";

/** Internal staff/admin alerts. */
export const EMAIL_FROM_ALERTS = "C2C Car Rental <alerts@c2crental.ca>";

/** Support conversations (contact form, verification codes). */
export const EMAIL_FROM_SUPPORT = "C2C Car Rental <support@c2crental.ca>";

/** Where customer replies should land. */
export const EMAIL_REPLY_TO = "support@c2crental.ca";
