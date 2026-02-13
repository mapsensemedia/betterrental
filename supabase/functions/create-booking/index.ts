/**
 * create-booking - Create booking for authenticated users
 * 
 * SECURITY (PR7):
 * - Requires authentication
 * - Server-side price computation — all client pricing fields ignored
 * - Fail-closed: if pricing computation throws, return 400
 * - Add-on prices computed server-side from DB
 */
import { 
  getCorsHeaders, 
  handleCorsPreflightRequest,
  getClientIp,
  checkRateLimit,
  rateLimitResponse,
  sanitizePhone,
  isValidPhone,
} from "../_shared/cors.ts";
import { validateAuth, getAdminClient } from "../_shared/auth.ts";
import {
  validateClientPricing,
  createBookingAddOns,
  createAdditionalDrivers,
  type BookingInput,
} from "../_shared/booking-core.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    // Rate limiting
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(clientIp, {
      windowMs: 60 * 1000,
      maxRequests: 5,
      keyPrefix: "create-booking",
    });
    
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetAt, corsHeaders);
    }

    // Require authentication
    const auth = await validateAuth(req);
    if (!auth.authenticated || !auth.userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = getAdminClient();
    const body = await req.json();
    
    console.log("Creating booking for user:", auth.userId);

    const {
      holdId,        // Optional — not used for direct checkout
      vehicleId,
      locationId,
      startAt,
      endAt,
      pickupDate,    // "YYYY-MM-DD" date-only string for pricing
      dropoffDate,   // "YYYY-MM-DD" date-only string for pricing
      userPhone,
      driverAgeBand,
      protectionPlan,
      addOns,      // Only { addOnId, quantity }[] accepted — price ignored
      additionalDrivers, // { driverName, driverAgeBand }[] — fees computed server-side
      notes,
      deliveryFee,
      returnLocationId,
      totalAmount,  // Client total — used only for mismatch check, never stored
      paymentMethod, // "pay-now" | "pay-later"
      pickupAddress,
      pickupLat,
      pickupLng,
      saveTimeAtCounter,
      pickupContactName,
      pickupContactPhone,
      specialInstructions,
    } = body;

    // Input validation
    if (!vehicleId || !locationId || !startAt || !endAt) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!driverAgeBand || !["20_24", "25_70"].includes(driverAgeBand)) {
      return new Response(
        JSON.stringify({ 
          error: "age_validation_failed",
          message: "Driver age confirmation is required." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY (PR7): Server-side price validation — FAIL CLOSED
    let priceCheck;
    try {
      priceCheck = await validateClientPricing({
        vehicleId,
        startAt: pickupDate || startAt,
        endAt: dropoffDate || endAt,
        protectionPlan,
        addOns: addOns?.map((a: { addOnId: string; quantity: number }) => ({ addOnId: a.addOnId, quantity: a.quantity })),
        additionalDrivers: (additionalDrivers || []).map((d: any) => ({
          driverName: d.driverName || null,
          driverAgeBand: d.driverAgeBand || "25_70",
          youngDriverFee: 0, // computed server-side
        })),
        driverAgeBand,
        deliveryFee,
        locationId,
        returnLocationId,
        clientTotal: Number(totalAmount),
      });
    } catch (err) {
      console.error("[create-booking] PRICE_VALIDATION_FAILED:", err);
      return new Response(
        JSON.stringify({ error: "PRICE_VALIDATION_FAILED", message: "Server-side pricing computation failed." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!priceCheck.valid) {
      console.warn(`[create-booking] Price mismatch for user ${auth.userId}: ${priceCheck.error}`);
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

    // Validate and sanitize phone
    if (userPhone) {
      const sanitizedPhone = sanitizePhone(userPhone);
      if (sanitizedPhone && isValidPhone(sanitizedPhone)) {
        await supabaseAdmin
          .from("profiles")
          .upsert({ 
            id: auth.userId, 
            phone: sanitizedPhone,
            updated_at: new Date().toISOString()
          }, { onConflict: "id" });
      }
    }

    // If holdId provided, verify hold is still active and belongs to user
    if (holdId) {
      const { data: hold, error: holdError } = await supabaseAdmin
        .from("reservation_holds")
        .select("*")
        .eq("id", holdId)
        .eq("user_id", auth.userId)
        .eq("status", "active")
        .single();

      if (holdError || !hold) {
        return new Response(
          JSON.stringify({ 
            error: "reservation_expired",
            message: "Your reservation has expired. Please start over." 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (new Date(hold.expires_at) < new Date()) {
        await supabaseAdmin
          .from("reservation_holds")
          .update({ status: "expired" })
          .eq("id", holdId);

        return new Response(
          JSON.stringify({ 
            error: "reservation_expired",
            message: "Your reservation timer expired. Please start over." 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Double-check no conflicting bookings
    const { data: conflicts } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("vehicle_id", vehicleId)
      .in("status", ["pending", "confirmed", "active"])
      .or(`and(start_at.lte.${endAt},end_at.gte.${startAt})`)
      .limit(1);

    if (conflicts && conflicts.length > 0) {
      if (holdId) {
        await supabaseAdmin
          .from("reservation_holds")
          .update({ status: "expired" })
          .eq("id", holdId);
      }

      return new Response(
        JSON.stringify({ 
          error: "vehicle_unavailable",
          message: "This vehicle was just booked by another customer." 
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine initial status
    const initialStatus = paymentMethod === "pay-now" ? "draft" : (paymentMethod === "pay-later" ? "pending" : "confirmed");

    // Create the booking with SERVER-COMPUTED totals
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert({
        user_id: auth.userId,
        vehicle_id: vehicleId,
        location_id: locationId,
        start_at: startAt,
        end_at: endAt,
        // ALL financial fields from server computation
        daily_rate: serverTotals.dailyRate,
        total_days: serverTotals.days,
        subtotal: serverTotals.subtotal,
        tax_amount: serverTotals.taxAmount,
        deposit_amount: serverTotals.depositAmount,
        total_amount: serverTotals.total,
        young_driver_fee: serverTotals.youngDriverFee,
        different_dropoff_fee: serverTotals.differentDropoffFee,
        delivery_fee: serverTotals.deliveryFee ?? 0,
        booking_code: "",
        status: initialStatus,
        notes: notes?.slice(0, 1000) || null,
        driver_age_band: driverAgeBand,
        protection_plan: protectionPlan || null,
        return_location_id: returnLocationId || null,
        pickup_address: pickupAddress || null,
        pickup_lat: pickupLat || null,
        pickup_lng: pickupLng || null,
        save_time_at_counter: saveTimeAtCounter || false,
        pickup_contact_name: saveTimeAtCounter ? pickupContactName || null : null,
        pickup_contact_phone: saveTimeAtCounter ? pickupContactPhone || null : null,
        special_instructions: saveTimeAtCounter ? specialInstructions || null : null,
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Error creating booking:", bookingError);
      return new Response(
        JSON.stringify({ error: "booking_failed", message: "Failed to create booking." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Booking created:", booking.id);

    // Create add-ons with SERVER-COMPUTED prices
    if (serverTotals.addOnPrices.length > 0) {
      await createBookingAddOns(booking.id, serverTotals.addOnPrices);
    }

    // Create additional drivers with SERVER-COMPUTED fees
    if (serverTotals.additionalDriverRecords.length > 0) {
      await createAdditionalDrivers(booking.id, serverTotals.additionalDriverRecords);
    }

    // Mark hold as converted (if hold was used)
    if (holdId) {
      await supabaseAdmin
        .from("reservation_holds")
        .update({ status: "converted" })
        .eq("id", holdId);
    }

    // Notifications
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let customerName = "";
    let vehicleName = "";
    
    try {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", auth.userId)
        .single();
      customerName = profile?.full_name || auth.email || "";
      
      const { data: vehicle } = await supabaseAdmin
        .from("vehicles")
        .select("make, model, year")
        .eq("id", vehicleId)
        .single();
      vehicleName = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "";
    } catch (e) {
      console.log("Failed to fetch names for notification:", e);
    }

    const notificationPromises = [
      fetch(`${supabaseUrl}/functions/v1/send-booking-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({ bookingId: booking.id, templateType: "confirmation" }),
      }).catch(err => console.error("SMS notification failed:", err)),
      fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({ bookingId: booking.id, templateType: "confirmation" }),
      }).catch(err => console.error("Email notification failed:", err)),
      fetch(`${supabaseUrl}/functions/v1/notify-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({
          eventType: "new_booking",
          bookingId: booking.id,
          bookingCode: booking.booking_code,
          customerName,
          vehicleName,
        }),
      }).catch(err => console.error("Admin notification failed:", err)),
    ];

    await Promise.all(notificationPromises);

    return new Response(
      JSON.stringify({ 
        success: true,
        booking: {
          id: booking.id,
          bookingCode: booking.booking_code,
          status: booking.status,
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "server_error", message: "An unexpected error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
