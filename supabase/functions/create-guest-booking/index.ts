/**
 * create-guest-booking - Create booking for unauthenticated users
 * 
 * PR5: Now uses shared booking-core for reduced duplication
 */
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
import { getAdminClient } from "../_shared/auth.ts";
import {
  isValidAgeBand,
  checkBookingConflicts,
  createBookingRecord,
  createBookingAddOns,
  createAdditionalDrivers,
  sendBookingNotifications,
  type AddOnInput,
  type AdditionalDriverInput,
} from "../_shared/booking-core.ts";

interface GuestBookingRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
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
  addOns?: AddOnInput[];
  additionalDrivers?: AdditionalDriverInput[];
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
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    // Strict rate limiting for guest bookings: 3 per IP per 5 minutes
    const clientIp = getClientIp(req);
    const ipRateLimit = checkRateLimit(clientIp, {
      windowMs: 5 * 60 * 1000,
      maxRequests: 3,
      keyPrefix: "guest-booking-ip",
    });
    
    if (!ipRateLimit.allowed) {
      console.log(`[create-guest-booking] IP rate limit exceeded: ${clientIp}`);
      return rateLimitResponse(ipRateLimit.resetAt, corsHeaders);
    }

    const supabaseAdmin = getAdminClient();
    const body: GuestBookingRequest = await req.json();

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

    if (!isValidPhone(phone)) {
      return new Response(
        JSON.stringify({ error: "Valid phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Additional rate limiting by email: 5 bookings per email per day
    const emailRateLimit = checkRateLimit(email, {
      windowMs: 24 * 60 * 60 * 1000,
      maxRequests: 5,
      keyPrefix: "guest-booking-email",
    });
    
    if (!emailRateLimit.allowed) {
      console.log(`[create-guest-booking] Email rate limit exceeded: ${email}`);
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
    if (!vehicleId || !locationId || !startAt || !endAt) {
      return new Response(
        JSON.stringify({ error: "validation_failed", message: "Missing required booking information" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate driver age band using shared function
    if (!isValidAgeBand(driverAgeBand)) {
      return new Response(
        JSON.stringify({ error: "age_validation_failed", message: "Driver age confirmation is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for conflicting bookings using shared function
    const hasConflict = await checkBookingConflicts(vehicleId, startAt, endAt);
    if (hasConflict) {
      return new Response(
        JSON.stringify({ error: "vehicle_unavailable", message: "This vehicle is no longer available." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create or find guest user
    // SECURITY: Guest accounts are created with email_confirm = false
    // They must verify email before accessing account features
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    let userId: string | null = null;
    let isNewUser = false;
    
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    if (existingUser) {
      userId = existingUser.id;
      console.log("Found existing user:", userId);
    } else {
      // Create guest user - email NOT auto-confirmed for security
      // User must verify email to access their account
      const randomPassword = crypto.randomUUID() + crypto.randomUUID().slice(0, 8) + "Aa1!";
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: false, // SECURITY: Require email verification
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
      console.log("Created new guest user:", userId);

      // Create profile
      await supabaseAdmin.from("profiles").upsert({
        id: userId,
        email,
        full_name: `${firstName} ${lastName}`,
        phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
    }

    // Create booking using shared function
    const bookingResult = await createBookingRecord({
      userId: userId!,
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
      notes,
      status: "pending", // Guest bookings start as pending
      pickupAddress,
      pickupLat,
      pickupLng,
      pickupContactName,
      pickupContactPhone,
      specialInstructions,
      saveTimeAtCounter,
    });

    if (!bookingResult.success || !bookingResult.booking) {
      return new Response(
        JSON.stringify({ error: bookingResult.errorCode, message: bookingResult.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const booking = bookingResult.booking;
    console.log("Booking created:", booking.id, booking.bookingCode);

    // Add add-ons and additional drivers using shared functions
    await createBookingAddOns(booking.id, addOns || []);
    await createAdditionalDrivers(booking.id, body.additionalDrivers || []);

    // Send notifications using shared function (fire-and-forget)
    sendBookingNotifications({
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
        // Inform user they need to verify email to access account
        requiresEmailVerification: isNewUser,
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
