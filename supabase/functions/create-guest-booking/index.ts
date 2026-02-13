/**
 * create-guest-booking - Create booking for unauthenticated users
 * 
 * SECURITY (PR7):
 * - Server-side price computation — all client pricing fields ignored
 * - Fail-closed: if pricing computation throws, return 400
 * - Add-on prices computed server-side from DB
 * - protectionPlan passed through for roadside filter
 */
import { 
  getCorsHeaders, 
  handleCorsPreflightRequest,
  getClientIp,
  checkRateLimit,
  rateLimitResponse,
  sanitizeEmail,
  sanitizePhone,
  isValidEmail,
  isValidPhone,
} from "../_shared/cors.ts";
import { getAdminClient } from "../_shared/auth.ts";
import {
  isValidAgeBand,
  checkBookingConflicts,
  createBookingRecord,
  createBookingAddOns,
  createAdditionalDrivers,
  sendBookingNotifications,
  validateClientPricing,
  type AdditionalDriverInput,
} from "../_shared/booking-core.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    // Strict rate limiting for guest bookings
    const clientIp = getClientIp(req);
    const ipRateLimit = checkRateLimit(clientIp, {
      windowMs: 5 * 60 * 1000,
      maxRequests: 3,
      keyPrefix: "guest-booking-ip",
    });
    
    if (!ipRateLimit.allowed) {
      return rateLimitResponse(ipRateLimit.resetAt, corsHeaders);
    }

    const supabaseAdmin = getAdminClient();
    const body = await req.json();

    // Sanitize and validate inputs
    const firstName = body.firstName?.trim().slice(0, 100);
    const lastName = body.lastName?.trim().slice(0, 100);
    const email = sanitizeEmail(body.email || "");
    const phone = sanitizePhone(body.phone || "");

    if (!firstName || !lastName) {
      return new Response(
        JSON.stringify({ error: "Name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (phone && !isValidPhone(phone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!body.isWalkIn && !phone) {
      return new Response(
        JSON.stringify({ error: "Valid phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting by email
    const emailRateLimit = checkRateLimit(email, {
      windowMs: 24 * 60 * 60 * 1000,
      maxRequests: 5,
      keyPrefix: "guest-booking-email",
    });
    
    if (!emailRateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many booking attempts. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      vehicleId,
      locationId,
      startAt,
      endAt,
      driverAgeBand,
      protectionPlan,
      addOns,        // Only { addOnId, quantity }[] — price ignored
      notes,
      pickupAddress,
      pickupLat,
      pickupLng,
      saveTimeAtCounter,
      pickupContactName,
      pickupContactPhone,
      specialInstructions,
      cardLastFour,
      cardType,
      cardHolderName,
      deliveryFee,
      totalAmount,    // Client total — used only for mismatch check
    } = body;

    // Validate required fields
    if (!vehicleId || !locationId || !startAt || !endAt) {
      return new Response(
        JSON.stringify({ error: "validation_failed", message: "Missing required booking information" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isValidAgeBand(driverAgeBand)) {
      return new Response(
        JSON.stringify({ error: "age_validation_failed", message: "Driver age confirmation is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY (PR7): Server-side price validation — FAIL CLOSED
    let priceCheck;
    try {
      priceCheck = await validateClientPricing({
        vehicleId,
        startAt,
        endAt,
        protectionPlan,
        addOns: addOns?.map((a: { addOnId: string; quantity: number }) => ({ addOnId: a.addOnId, quantity: a.quantity })),
        additionalDrivers: (body.additionalDrivers || []).map((d: any) => ({
          driverName: d.driverName || null,
          driverAgeBand: d.driverAgeBand || "25_70",
          youngDriverFee: 0, // computed server-side
        })),
        driverAgeBand,
        deliveryFee,
        locationId: body.locationId,
        returnLocationId: body.returnLocationId,
        clientTotal: Number(totalAmount),
      });
    } catch (err) {
      console.error("[create-guest-booking] PRICE_VALIDATION_FAILED:", err);
      return new Response(
        JSON.stringify({ error: "PRICE_VALIDATION_FAILED", message: "Server-side pricing computation failed." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!priceCheck.valid) {
      console.warn(`[create-guest-booking] Price mismatch: ${priceCheck.error}`);
      return new Response(
        JSON.stringify({ 
          error: "PRICE_MISMATCH",
          message: priceCheck.error,
          serverTotal: priceCheck.serverTotals.total,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serverTotals = priceCheck.serverTotals;

    // Check for conflicting bookings
    const hasConflict = await checkBookingConflicts(vehicleId, startAt, endAt);
    if (hasConflict) {
      return new Response(
        JSON.stringify({ error: "vehicle_unavailable", message: "This vehicle is no longer available." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create or find guest user
    let userId: string | null = null;
    let isNewUser = false;
    
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    
    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      const randomPassword = crypto.randomUUID() + crypto.randomUUID().slice(0, 8) + "Aa1!";
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: false,
        user_metadata: {
          full_name: `${firstName} ${lastName}`,
          phone,
          is_guest: true,
          created_via: "guest_checkout",
        },
      });

      if (createError) {
        console.error("Error creating guest user:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to process booking" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;
      isNewUser = true;

      await supabaseAdmin.from("profiles").upsert({
        id: userId,
        email,
        full_name: `${firstName} ${lastName}`,
        phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
    }

    // Create booking with SERVER-COMPUTED totals
    const bookingResult = await createBookingRecord({
      userId: userId!,
      vehicleId,
      locationId,
      startAt,
      endAt,
      driverAgeBand,
      protectionPlan,
      notes,
      status: body.paymentMethod === "pay-now" ? "draft" : "pending",
      pickupAddress,
      pickupLat,
      pickupLng,
      pickupContactName,
      pickupContactPhone,
      specialInstructions,
      saveTimeAtCounter,
      cardLastFour,
      cardType,
      cardHolderName,
      returnLocationId: body.returnLocationId,
      deliveryFee,
    }, serverTotals);

    if (!bookingResult.success || !bookingResult.booking) {
      return new Response(
        JSON.stringify({ error: bookingResult.errorCode, message: bookingResult.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const booking = bookingResult.booking;
    console.log("Booking created:", booking.id, booking.bookingCode);

    // Create add-ons with SERVER-COMPUTED prices
    await createBookingAddOns(booking.id, serverTotals.addOnPrices);
    // Create additional drivers with SERVER-COMPUTED fees (from computeBookingTotals)
    if (serverTotals.additionalDriverRecords.length > 0) {
      await createAdditionalDrivers(booking.id, serverTotals.additionalDriverRecords);
    }

    // Send notifications
    await sendBookingNotifications({
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      customerName: `${firstName} ${lastName}`,
      isGuest: true,
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        booking: {
          id: booking.id,
          bookingCode: booking.bookingCode,
          status: booking.status,
        },
        userId,
        isNewUser,
        requiresEmailVerification: isNewUser,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    console.error("Unexpected error:", errorMessage, error);
    return new Response(
      JSON.stringify({ error: "server_error", message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
