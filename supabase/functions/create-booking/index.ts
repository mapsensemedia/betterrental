import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
  driverAgeBand?: string; // "21_25" or "25_70"
  youngDriverFee?: number;
  addOns: Array<{
    addOnId: string;
    price: number;
    quantity: number;
  }>;
  notes?: string;
}

// Age validation constants (must match client-side)
const MIN_DRIVER_AGE = 21;
const MAX_DRIVER_AGE = 70;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client for transaction safety
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user token
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateBookingRequest = await req.json();
    console.log("Creating booking for user:", user.id, "body:", body);

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
    addOns,
    notes,
  } = body;

  // Validate driver age band is provided
  if (!driverAgeBand || !["21_25", "25_70"].includes(driverAgeBand)) {
    console.log("Invalid driver age band:", driverAgeBand);
    return new Response(
      JSON.stringify({ 
        error: "age_validation_failed",
        message: "Driver age confirmation is required. Please confirm your age on the booking page." 
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("Driver age band validated:", driverAgeBand);

    // Save phone number to user profile for OTP
    if (userPhone) {
      console.log("Saving phone to profile:", userPhone);
      await supabaseAdmin
        .from("profiles")
        .upsert({ 
          id: user.id, 
          phone: userPhone,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: "id" 
        });
    }

    // Step 1: Verify hold is still active and belongs to user
    const { data: hold, error: holdError } = await supabaseAdmin
      .from("reservation_holds")
      .select("*")
      .eq("id", holdId)
      .eq("user_id", user.id)
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
      // Mark hold as expired
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

    // Step 2: Double-check no conflicting bookings (race-safe)
    const { data: conflicts } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("vehicle_id", vehicleId)
      .in("status", ["pending", "confirmed", "active"])
      .or(
        `and(start_at.lte.${endAt},end_at.gte.${startAt})`
      )
      .limit(1);

    if (conflicts && conflicts.length > 0) {
      // Mark hold as expired since booking failed
      await supabaseAdmin
        .from("reservation_holds")
        .update({ status: "expired" })
        .eq("id", holdId);

      return new Response(
        JSON.stringify({ 
          error: "vehicle_unavailable",
          message: "This vehicle was just booked by another customer. Please choose a different vehicle." 
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Create the booking with driver age band
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert({
        user_id: user.id,
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
        booking_code: "", // Will be generated by trigger
        status: "confirmed",
        notes: notes || null,
        driver_age_band: driverAgeBand,
        young_driver_fee: youngDriverFee || 0,
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Error creating booking:", bookingError);
      return new Response(
        JSON.stringify({ 
          error: "booking_failed",
          message: "Failed to create booking. Please try again." 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Booking created:", booking.id);

    // Step 4: Create booking add-ons
    if (addOns && addOns.length > 0) {
      const addOnRecords = addOns.map((addon) => ({
        booking_id: booking.id,
        add_on_id: addon.addOnId,
        price: addon.price,
        quantity: addon.quantity,
      }));

      const { error: addOnsError } = await supabaseAdmin
        .from("booking_add_ons")
        .insert(addOnRecords);

      if (addOnsError) {
        console.error("Error creating add-ons:", addOnsError);
        // Don't fail the booking, but log the error
      }
    }

    // NOTE: Payment record is NOT created automatically during booking.
    // Payments should only be recorded when:
    // 1. Admin manually records an in-person payment via "Record Payment" action
    // 2. A payment gateway webhook confirms successful payment
    // This prevents the "payment moves ahead automatically" bug.

    // Step 5: Mark hold as converted
    await supabaseAdmin
      .from("reservation_holds")
      .update({ status: "converted" })
      .eq("id", holdId);

    console.log("Booking complete:", booking.booking_code);

    // Step 7: Trigger notifications (fire and forget)
    const notificationPromises = [];

    // Send SMS notification
    try {
      notificationPromises.push(
        fetch(`${supabaseUrl}/functions/v1/send-booking-sms`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            bookingId: booking.id,
            templateType: "confirmation",
          }),
        }).catch(err => console.error("SMS notification failed:", err))
      );
    } catch (e) {
      console.error("Failed to trigger SMS:", e);
    }

    // Send email notification
    try {
      notificationPromises.push(
        fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            bookingId: booking.id,
            templateType: "confirmation",
          }),
        }).catch(err => console.error("Email notification failed:", err))
      );
    } catch (e) {
      console.error("Failed to trigger email:", e);
    }

    // Don't await notifications - let them run in background
    Promise.all(notificationPromises).catch(console.error);

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
      JSON.stringify({ 
        error: "server_error",
        message: "An unexpected error occurred. Please try again." 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
