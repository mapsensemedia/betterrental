/**
 * One notification_logs row per channel, per attempt.
 *
 * Every send path (SMS or email) must call this — including failures such as a
 * booking lookup error, a missing recipient or an invalid phone number — so no
 * failure is silently swallowed.
 *
 * NOTE: this helper only ever writes rows for the event happening right now.
 * Nothing here reads old rows or resends anything.
 */

// deno-lint-ignore no-explicit-any
type Db = any;

export interface NotifyLogRow {
  channel: "sms" | "email";
  notificationType: string;
  bookingId?: string | null;
  userId?: string | null;
  idempotencyKey: string;
  status: "sent" | "failed" | "skipped";
  providerId?: string | null;
  errorMessage?: string | null;
}

export async function writeNotificationLog(supabase: Db, row: NotifyLogRow): Promise<void> {
  try {
    const { error } = await supabase.from("notification_logs").insert({
      channel: row.channel,
      notification_type: row.notificationType,
      booking_id: row.bookingId || null,
      user_id: row.userId || null,
      idempotency_key: row.idempotencyKey,
      status: row.status,
      provider_id: row.providerId || null,
      error_message: row.errorMessage ? String(row.errorMessage).slice(0, 2000) : null,
      sent_at: row.status === "sent" ? new Date().toISOString() : null,
    });
    if (error) {
      console.error("[notify-log] could not write notification_logs row", error, row);
    }
  } catch (err) {
    console.error("[notify-log] unexpected failure writing notification_logs row", err, row);
  }
}

/** Unique-ish suffix so failure rows never collide with the success key. */
export function failureKey(base: string): string {
  return `${base}:fail:${Date.now()}`;
}

/**
 * Resolve the renter's contact details for a booking from where they are
 * actually stored: the customer's profile (logged-in), otherwise the linked
 * customers record (guest / walk-in), otherwise the pickup contact fields.
 */
export async function resolveBookingContact(
  supabase: Db,
  booking: {
    user_id?: string | null;
    customer_id?: string | null;
    pickup_contact_name?: string | null;
    pickup_contact_phone?: string | null;
  },
): Promise<{ name: string; email: string | null; phone: string | null }> {
  let name = "";
  let email: string | null = null;
  let phone: string | null = null;

  if (booking.user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", booking.user_id)
      .maybeSingle();
    if (profile) {
      name = profile.full_name || name;
      email = profile.email || email;
      phone = profile.phone || phone;
    }
  }

  if ((!email || !phone || !name) && booking.customer_id) {
    const { data: customer } = await supabase
      .from("customers")
      .select("full_name, email, phone")
      .eq("id", booking.customer_id)
      .maybeSingle();
    if (customer) {
      name = name || customer.full_name || "";
      email = email || customer.email || null;
      phone = phone || customer.phone || null;
    }
  }

  if (!phone && booking.pickup_contact_phone) phone = booking.pickup_contact_phone;
  if (!name && booking.pickup_contact_name) name = booking.pickup_contact_name;

  if ((!email || !phone) && booking.user_id) {
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(booking.user_id);
      if (authUser?.user) {
        email = email || authUser.user.email || null;
        const metaPhone = authUser.user.user_metadata?.phone;
        if (!phone && typeof metaPhone === "string" && metaPhone.trim()) phone = metaPhone.trim();
        name = name || authUser.user.user_metadata?.full_name || "";
      }
    } catch (err) {
      console.error("[notify-log] auth lookup failed", err);
    }
  }

  return { name: name || "Customer", email, phone };
}
