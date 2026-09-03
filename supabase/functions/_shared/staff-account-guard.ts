/**
 * Guard against writing customer details onto a staff/company account.
 *
 * Company logins (support@, admin@, operations@ …) have `profiles` rows too.
 * Historically a customer edit overwrote one of those profiles, which made the
 * customer's name appear in admin screens as the person who created, activated
 * and processed bookings. Any function that writes customer-supplied data into
 * `profiles` must call this first and refuse when the target is a staff account.
 */
export async function isStaffAccount(
  admin: { from: (t: string) => any },
  userId: string,
): Promise<boolean> {
  if (!userId) return false;

  const [{ data: assignment }, { data: role }] = await Promise.all([
    admin.from("staff_assignments").select("user_id").eq("user_id", userId).limit(1).maybeSingle(),
    admin.from("user_roles").select("user_id").eq("user_id", userId).limit(1).maybeSingle(),
  ]);

  return Boolean(assignment || role);
}

/** Standard refusal payload for customer writes aimed at a staff account. */
export const STAFF_ACCOUNT_WRITE_ERROR =
  "This account belongs to a staff/company login. Customer details cannot be saved onto it — create or select a customer record instead.";
