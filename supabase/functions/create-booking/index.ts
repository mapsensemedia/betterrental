import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
import { validateAuth, getAdminClient } from "../_shared/auth.ts";
import { validateClientPricing } from "../_shared/booking-core.ts";

interface CreateBookingRequest {
  holdId: string;
  vehicleId: string;
  locationId: string;
  startAt: string;
  endAt: string;
  dailyRate: number;
  totalDays: number;
  subtotal: number;
  taxAmount: number;
  depositAmount: number;
  totalAmount: number;
  userPhone: string;
  driverAgeBand?: string;
  youngDriverFee?: number;
  protectionPlan?: string;
  addOns: Array<{
    addOnId: string;
    price: number;
    quantity: number;
  }>;
  notes?: string;
  deliveryFee?: number;
  differentDropoffFee?: number;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    // Rate limiting: 5 booking attempts per IP per minute
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(clientIp, {
      windowMs: 60 * 1000,
      maxRequests: 5,
      keyPrefix: "create-booking",
    });
    
    if (!rateLimit.allowed) {
      console.log(`[create-booking] Rate limit exceeded for IP: ${clientIp}`);
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
    const body: CreateBookingRequest = await req.json();
    
    console.log("Creating booking for user:", auth.userId);

    const {
      holdId,
      vehicleId,
      locationId,
      startAt,
      endAt,
      dailyRate,
      totalDays,
      subtotal,
      taxAmount,
      depositAmount,
      totalAmount,
      userPhone,
      driverAgeBand,
      youngDriverFee,
      protectionPlan,
      addOns,
      notes,
      deliveryFee,
      differentDropoffFee,
    } = body;

    // Input validation
    if (!holdId || !vehicleId || !locationId || !startAt || !endAt) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate driver age band
    if (!driverAgeBand || !["20_24", "25_70"].includes(driverAgeBand)) {
      return new Response(
        JSON.stringify({ 
          error: "age_validation_failed",
          message: "Driver age confirmation is required." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY (PR6): Server-side price validation
    const priceCheck = await validateClientPricing({
      vehicleId,
      startAt,
      endAt,
      protectionPlan,
      addOns: addOns?.map(a => ({ addOnId: a.addOnId, quantity: a.quantity })),
      driverAgeBand,
      deliveryFee,
      differentDropoffFee,
      clientTotal: totalAmount,
    });

    if (!priceCheck.valid) {
      console.warn(`[create-booking] Price mismatch for user ${auth.userId}: ${priceCheck.error}`);
      return new Response(
        JSON.stringify({ 
          error: "PRICE_MISMATCH",
          message: priceCheck.error,
          serverTotal: priceCheck.serverTotal,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Step 1: Verify hold is still active and belongs to user
    const { data: hold, error: holdError } = await supabaseAdmin
      .from("reservation_holds")
      .select("*")
      .eq("id", holdId)
      .eq("user_id", auth.userId)
      .eq("status", "active")
      .single();

    if (holdError || !hold) {
      console.log("Hold validation failed:", holdError);
      return new Response(
        JSON.stringify({ 
          error: "reservation_expired",
          message: "Your reservation has expired. Please start over." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if hold has expired
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

    // Step 2: Double-check no conflicting bookings
    const { data: conflicts } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("vehicle_id", vehicleId)
      .in("status", ["pending", "confirmed", "active"])
      .or(`and(start_at.lte.${endAt},end_at.gte.${startAt})`)
      .limit(1);

    if (conflicts && conflicts.length > 0) {
      await supabaseAdmin
        .from("reservation_holds")
        .update({ status: "expired" })
        .eq("id", holdId);

      return new Response(
        JSON.stringify({ 
          error: "vehicle_unavailable",
          message: "This vehicle was just booked by another customer." 
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Create the booking (use server-validated totals)
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert({
        user_id: auth.userId,
        vehicle_id: vehicleId,
        location_id: locationId,
        start_at: startAt,
        end_at: endAt,
        daily_rate: dailyRate,
        total_days: totalDays,
        subtotal: subtotal,
        tax_amount: taxAmount,
        deposit_amount: depositAmount,
        total_amount: totalAmount,
        booking_code: "",
        status: "confirmed",
        notes: notes?.slice(0, 1000) || null,
        driver_age_band: driverAgeBand,
        young_driver_fee: youngDriverFee || 0,
        protection_plan: protectionPlan || null,
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

    // Step 4: Create booking add-ons (with roadside filter if premium protection)
    if (addOns && addOns.length > 0) {
      const { createBookingAddOns } = await import("../_shared/booking-core.ts");
      await createBookingAddOns(booking.id, addOns, protectionPlan);
    }

    // Step 5: Mark hold as converted
    await supabaseAdmin
      .from("reservation_holds")
      .update({ status: "converted" })
      .eq("id", holdId);

    // Fetch details for notifications
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

    // Send notifications
    const notificationPromises = [
      fetch(`${supabaseUrl}/functions/v1/send-booking-sms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ bookingId: booking.id, templateType: "confirmation" }),
      }).catch(err => console.error("SMS notification failed:", err)),

      fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ bookingId: booking.id, templateType: "confirmation" }),
      }).catch(err => console.error("Email notification failed:", err)),

      fetch(`${supabaseUrl}/functions/v1/notify-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
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
