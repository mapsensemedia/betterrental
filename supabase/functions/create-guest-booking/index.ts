import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GuestBookingRequest {
  // Guest info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Booking details
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
  driverAgeBand: string;
  youngDriverFee?: number;
  
  // Optional
  addOns?: Array<{
    addOnId: string;
    price: number;
    quantity: number;
  }>;
  notes?: string;
  pickupAddress?: string;
  pickupLat?: number;
  pickupLng?: number;
  saveTimeAtCounter?: boolean;
  pickupContactName?: string;
  pickupContactPhone?: string;
  specialInstructions?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client for bypassing RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body: GuestBookingRequest = await req.json();
    console.log("Creating guest booking:", body.email);

    const {
      firstName,
      lastName,
      email,
      phone,
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
      driverAgeBand,
      youngDriverFee,
      addOns,
      notes,
      pickupAddress,
      pickupLat,
      pickupLng,
      saveTimeAtCounter,
      pickupContactName,
      pickupContactPhone,
      specialInstructions,
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone) {
      return new Response(
        JSON.stringify({ error: "Missing required guest information" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!vehicleId || !locationId || !startAt || !endAt) {
      return new Response(
        JSON.stringify({ error: "Missing required booking information" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate driver age band
    if (!driverAgeBand || !["21_25", "25_70"].includes(driverAgeBand)) {
      return new Response(
        JSON.stringify({ 
          error: "age_validation_failed",
          message: "Driver age confirmation is required." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for conflicting bookings
    const { data: conflicts } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("vehicle_id", vehicleId)
      .in("status", ["pending", "confirmed", "active"])
      .or(`and(start_at.lte.${endAt},end_at.gte.${startAt})`)
      .limit(1);

    if (conflicts && conflicts.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: "vehicle_unavailable",
          message: "This vehicle is no longer available for the selected dates." 
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Create or find a guest user
    // Check if user already exists with this email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    let userId: string | null = null;
    
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    if (existingUser) {
      userId = existingUser.id;
      console.log("Found existing user:", userId);
    } else {
      // Create a new guest user with a random password (they can reset later)
      const randomPassword = crypto.randomUUID() + "Aa1!";
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true, // Auto-confirm email for guest checkout
        user_metadata: {
          full_name: `${firstName} ${lastName}`,
          phone,
          is_guest: true,
        },
      });

      if (createError) {
        console.error("Error creating guest user:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create guest account", details: createError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;
      console.log("Created new guest user:", userId);

      // Create profile for the guest user
      await supabaseAdmin.from("profiles").upsert({
        id: userId,
        email,
        full_name: `${firstName} ${lastName}`,
        phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
    }

    // Step 2: Create the booking
    const bookingCode = `C2C${Date.now().toString(36).toUpperCase()}`;
    
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert({
        user_id: userId,
        vehicle_id: vehicleId,
        location_id: locationId,
        start_at: startAt,
        end_at: endAt,
        daily_rate: dailyRate,
        total_days: totalDays,
        subtotal,
        tax_amount: taxAmount,
        deposit_amount: depositAmount,
        total_amount: totalAmount,
        booking_code: bookingCode,
        status: "pending",
        notes: notes || null,
        driver_age_band: driverAgeBand,
        young_driver_fee: youngDriverFee || 0,
        pickup_address: pickupAddress || null,
        pickup_lat: pickupLat || null,
        pickup_lng: pickupLng || null,
        save_time_at_counter: saveTimeAtCounter || false,
        pickup_contact_name: pickupContactName || null,
        pickup_contact_phone: pickupContactPhone || null,
        special_instructions: specialInstructions || null,
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Error creating booking:", bookingError);
      return new Response(
        JSON.stringify({ error: "Failed to create booking", details: bookingError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Booking created:", booking.id, booking.booking_code);

    // Step 3: Add add-ons if any
    if (addOns && addOns.length > 0) {
      const addOnRecords = addOns.map((addon) => ({
        booking_id: booking.id,
        add_on_id: addon.addOnId,
        price: addon.price,
        quantity: addon.quantity,
      }));

      await supabaseAdmin.from("booking_add_ons").insert(addOnRecords);
    }

    // Step 4: Send notifications (fire and forget)
    const notificationPromises = [];

    // Send confirmation email
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

    // Send SMS
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

    // Notify admin
    notificationPromises.push(
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
          customerName: `${firstName} ${lastName}`,
        }),
      }).catch(err => console.error("Admin notification failed:", err))
    );

    Promise.all(notificationPromises).catch(console.error);

    return new Response(
      JSON.stringify({ 
        success: true,
        booking: {
          id: booking.id,
          bookingCode: booking.booking_code,
          status: booking.status,
        },
        userId,
        isNewUser: !existingUser,
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
