/**
 * create-walk-in-booking — Staff-only walk-in booking creation
 *
 * SECURITY:
 * - Requires valid JWT (authenticated user)
 * - Requires admin/staff role (403 if not)
 * - Inserts via service_role client (bypasses RLS + INSERT seatbelt trigger)
 * - Staff can set arbitrary pricing (daily rate, totals)
 * - Creates guest user if customer email provided and no account exists
 */
import {
  getCorsHeaders,
  handleCorsPreflightRequest,
  sanitizeEmail,
  sanitizePhone,
  isValidEmail,
  isValidPhone,
} from "../_shared/cors.ts";
import {
  validateAuth,
  getAdminClient,
  isAdminOrStaff,
} from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    // 1. Auth check
    const auth = await validateAuth(req);
    if (!auth.authenticated || !auth.userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Role check — staff only
    const staffCheck = await isAdminOrStaff(auth.userId);
    if (!staffCheck) {
      return new Response(
        JSON.stringify({ error: "Forbidden: staff role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();

    // 3. Validate required fields
    const {
      locationId,
      categoryId,
      startAt,
      endAt,
      customerName,
      customerPhone,
      customerEmail,
      notes,
      dailyRate,
      totalDays,
      subtotal,
      taxAmount,
      totalAmount,
      depositAmount,
    } = body;

    if (!locationId || !categoryId || !startAt || !endAt || !customerName || !customerPhone || !customerEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: locationId, categoryId, startAt, endAt, customerName, customerPhone, customerEmail. Walk-in bookings require customer email." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!dailyRate || dailyRate <= 0 || !totalAmount || totalAmount <= 0) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid pricing fields: dailyRate, totalAmount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("[walkin] role mode", { hasServiceKey: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") });
    const supabaseAdmin = getAdminClient();

    // 4. Resolve or create a dedicated auth-backed customer identity for this walk-in
    const sanitizedName = customerName.trim();
    const sanitizedPhone = sanitizePhone(customerPhone);
    const email = customerEmail ? sanitizeEmail(customerEmail) : null;

    if (!sanitizedName) {
      return new Response(
        JSON.stringify({ error: "Customer name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!isValidPhone(sanitizedPhone)) {
      return new Response(
        JSON.stringify({ error: "Invalid customer phone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Walk-in bookings require a valid customer email so the booking can be linked to a real customer account." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let userId: string | null = null;

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      userId = existingProfile.id;
    }

    if (!userId) {
      const randomPassword = crypto.randomUUID() + crypto.randomUUID().slice(0, 8) + "Aa1!";
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: false,
        user_metadata: {
          full_name: sanitizedName,
          phone: sanitizedPhone,
          is_guest: true,
          created_via: "walk_in",
        },
      });

      if (createError || !newUser?.user) {
        console.error("[create-walk-in-booking] Failed to create walk-in customer:", createError);
        return new Response(
          JSON.stringify({ error: "Walk-in bookings require a valid customer email. We couldn't create or link a customer account for this email." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      userId = newUser.user.id;
    }

    const { error: profileUpsertError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      email,
      full_name: sanitizedName,
      phone: sanitizedPhone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    if (profileUpsertError) {
      console.error("[create-walk-in-booking] Failed to upsert customer profile:", profileUpsertError);
      return new Response(
        JSON.stringify({ error: "Walk-in bookings require a valid customer email. We couldn't save the customer profile for this email." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5. Compute pricing — trust staff input
    const computedDays = totalDays || Math.max(1, Math.ceil(
      (new Date(endAt).getTime() - new Date(startAt).getTime()) / (1000 * 60 * 60 * 24),
    ));
    const computedSubtotal = subtotal ?? dailyRate * computedDays;
    const computedTax = taxAmount ?? Math.round(computedSubtotal * 0.12 * 100) / 100; // 12% default
    const computedTotal = totalAmount ?? computedSubtotal + computedTax;

    // 6. Insert booking via service_role (bypasses RLS + INSERT seatbelt)
    const { data: booking, error: insertError } = await supabaseAdmin
      .from("bookings")
      .insert({
        user_id: userId,
        vehicle_id: categoryId,
        location_id: locationId,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        status: "confirmed",
        daily_rate: dailyRate,
        total_days: computedDays,
        subtotal: computedSubtotal,
        tax_amount: computedTax,
        total_amount: computedTotal,
        booking_source: "walk_in",
        deposit_amount: depositAmount ?? 350,
        pickup_contact_name: customerName.trim(),
        pickup_contact_phone: sanitizedPhone,
        notes: notes || null,
        assigned_driver_id: auth.userId,
      })
      .select("id, booking_code, status")
      .single();

    if (insertError) {
      console.error("[create-walk-in-booking] Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create booking", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 7. Create initial delivery status
    await supabaseAdmin.from("delivery_statuses").insert({
      booking_id: booking.id,
      status: "assigned",
      notes: "Walk-in booking created by staff",
      updated_by: auth.userId,
    });

    // 8. Audit log
    await supabaseAdmin.from("audit_logs").insert({
      action: "walk_in_booking_created",
      entity_type: "booking",
      entity_id: booking.id,
      user_id: auth.userId,
      new_data: {
        customer_name: customerName,
        daily_rate: dailyRate,
        total_amount: computedTotal,
        booking_source: "walk_in",
      },
    });

    console.log(`[create-walk-in-booking] Created booking ${booking.id} by staff ${auth.userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        booking: {
          id: booking.id,
          bookingCode: booking.booking_code,
          status: booking.status,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unexpected error";
    console.error("[create-walk-in-booking] Error:", msg, error);
    return new Response(
      JSON.stringify({ error: "server_error", message: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
