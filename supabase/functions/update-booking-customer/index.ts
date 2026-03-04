/**
 * update-booking-customer
 * 
 * Allows admin/staff to update customer profile info linked to a booking.
 * Updates the `profiles` table via service_role, with audit logging.
 */
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import {
  getUserOrThrow,
  requireRoleOrThrow,
  getAdminClient,
  AuthError,
  authErrorResponse,
} from "../_shared/auth.ts";

interface UpdateCustomerBody {
  bookingId: string;
  customer: {
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    driver_license_number?: string | null;
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    // 1. Auth + role check
    const { userId } = await getUserOrThrow(req, corsHeaders);
    await requireRoleOrThrow(userId, ["admin", "staff", "finance", "support"], corsHeaders);

    // 2. Parse & validate input
    const body: UpdateCustomerBody = await req.json();
    const { bookingId, customer } = body;

    if (!bookingId || typeof bookingId !== "string") {
      return new Response(
        JSON.stringify({ error: "bookingId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!customer || typeof customer !== "object") {
      return new Response(
        JSON.stringify({ error: "customer object is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate email format if provided
    if (customer.email && typeof customer.email === "string" && !customer.email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = getAdminClient();

    // 3. Load booking to find linked user
    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select("id, user_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const profileUserId = booking.user_id;

    // 4. Load current profile for audit diff
    const { data: oldProfile } = await admin
      .from("profiles")
      .select("full_name, email, phone, address, driver_license_number")
      .eq("id", profileUserId)
      .single();

    // 5. Build update payload — only set fields that were explicitly provided
    const updatePayload: Record<string, unknown> = {};
    const changedFields: Record<string, { old: unknown; new: unknown }> = {};

    if (customer.full_name !== undefined) {
      const newVal = customer.full_name?.trim() || null;
      if (newVal !== (oldProfile?.full_name ?? null)) {
        updatePayload.full_name = newVal;
        changedFields.full_name = { old: oldProfile?.full_name, new: newVal };
      }
    }

    if (customer.email !== undefined) {
      const newVal = customer.email?.toLowerCase().trim() || null;
      if (newVal !== (oldProfile?.email ?? null)) {
        updatePayload.email = newVal;
        changedFields.email = { old: oldProfile?.email, new: newVal };
      }
    }

    if (customer.phone !== undefined) {
      const newVal = customer.phone?.trim() || null;
      if (newVal !== (oldProfile?.phone ?? null)) {
        updatePayload.phone = newVal;
        changedFields.phone = { old: oldProfile?.phone, new: newVal };
      }
    }

    if (customer.address !== undefined) {
      const newVal = customer.address?.trim() || null;
      if (newVal !== (oldProfile?.address ?? null)) {
        updatePayload.address = newVal;
        changedFields.address = { old: oldProfile?.address, new: newVal };
      }
    }

    if (customer.driver_license_number !== undefined) {
      const newVal = customer.driver_license_number?.trim() || null;
      if (newVal !== (oldProfile?.driver_license_number ?? null)) {
        updatePayload.driver_license_number = newVal;
        changedFields.driver_license_number = { old: oldProfile?.driver_license_number, new: newVal };
      }
    }

    // Nothing changed
    if (Object.keys(updatePayload).length === 0) {
      return new Response(
        JSON.stringify({ success: true, customer: oldProfile, message: "No changes detected" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 6. Update profile
    updatePayload.updated_at = new Date().toISOString();
    const { error: updateError } = await admin
      .from("profiles")
      .update(updatePayload)
      .eq("id", profileUserId);

    if (updateError) {
      console.error("Profile update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update customer profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 7. Audit log
    await admin.from("audit_logs").insert({
      action: "customer_info_updated",
      entity_type: "profile",
      entity_id: profileUserId,
      user_id: userId,
      old_data: changedFields,
      new_data: updatePayload,
    });

    // 8. Return updated profile
    const { data: updatedProfile } = await admin
      .from("profiles")
      .select("full_name, email, phone, address, driver_license_number")
      .eq("id", profileUserId)
      .single();

    return new Response(
      JSON.stringify({ success: true, customer: updatedProfile }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, corsHeaders);
    console.error("update-booking-customer error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
