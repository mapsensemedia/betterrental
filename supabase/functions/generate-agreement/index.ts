import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, checkRateLimit, rateLimitResponse, getClientIp } from "../_shared/cors.ts";
import { validateAuth } from "../_shared/auth.ts";

/**
 * Agreement Generator
 * 
 * Security features:
 * - Origin whitelist
 * - Rate limiting
 * - Authentication required
 * - Input validation
 */

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = getClientIp(req);

    // Rate limit - max 20 agreements per minute per IP
    const rateLimit = checkRateLimit(`agreement:${clientIp}`, {
      windowMs: 60000,
      maxRequests: 20,
      keyPrefix: "agreement",
    });

    if (!rateLimit.allowed) {
      console.warn(`Rate limit exceeded for generate-agreement from IP: ${clientIp}`);
      return rateLimitResponse(rateLimit.resetAt, corsHeaders);
    }

    // Validate authentication
    const auth = await validateAuth(req);
    if (!auth.authenticated) {
      // Allow service role calls
      const authHeader = req.headers.get("Authorization");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!authHeader?.includes(serviceKey || "no-match")) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const body = await req.json();
    const { bookingId } = body;

    // Input validation
    if (!bookingId || typeof bookingId !== "string") {
      console.error("Invalid or missing bookingId");
      return new Response(
        JSON.stringify({ error: "Missing bookingId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(bookingId)) {
      return new Response(
        JSON.stringify({ error: "Invalid bookingId format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating agreement for booking: ${bookingId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requesting user owns this booking (if authenticated as user)
    if (auth.authenticated && auth.userId) {
      const { data: bookingCheck } = await supabase
        .from("bookings")
        .select("user_id")
        .eq("id", bookingId)
        .single();

      if (!bookingCheck) {
        return new Response(
          JSON.stringify({ error: "Booking not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if user owns booking or is admin
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.userId)
        .in("role", ["admin", "staff"])
        .maybeSingle();

      if (bookingCheck.user_id !== auth.userId && !userRole) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch booking with location
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        vehicle_id,
        locations (id, name, address, city, phone)
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Booking not found:", bookingError);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch category info separately
    let categoryInfo = { id: "", name: "Vehicle", fuel_type: "", transmission: "", seats: 0 };
    if (booking.vehicle_id) {
      const { data: category } = await supabase
        .from("vehicle_categories")
        .select("id, name, fuel_type, transmission, seats")
        .eq("id", booking.vehicle_id)
        .single();
      if (category) {
        categoryInfo = category;
      }
    }
    // Attach as vehicles for template compatibility
    (booking as any).vehicles = {
      id: categoryInfo.id,
      make: "",
      model: categoryInfo.name,
      year: 0,
      category: categoryInfo.name,
      fuel_type: categoryInfo.fuel_type,
      transmission: categoryInfo.transmission,
      seats: categoryInfo.seats,
    };

    console.log(`Found booking: ${booking.booking_code}`);

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone")
      .eq("id", booking.user_id)
      .maybeSingle();

    console.log(`Found profile: ${profile?.full_name || 'N/A'}`);

    // Check if agreement already exists
    const { data: existingAgreement } = await supabase
      .from("rental_agreements")
      .select("id, status")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (existingAgreement) {
      console.log(`Agreement already exists: ${existingAgreement.id}`);
      return new Response(
        JSON.stringify({ agreementId: existingAgreement.id, alreadyExists: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build terms object
    const terms = {
      vehicle: {
        make: booking.vehicles?.make,
        model: booking.vehicles?.model,
        year: booking.vehicles?.year,
        category: booking.vehicles?.category,
        fuelType: booking.vehicles?.fuel_type,
        transmission: booking.vehicles?.transmission,
        seats: booking.vehicles?.seats,
      },
      rental: {
        startAt: booking.start_at,
        endAt: booking.end_at,
        totalDays: booking.total_days,
        dailyRate: booking.daily_rate,
        subtotal: booking.subtotal,
        taxAmount: booking.tax_amount,
        depositAmount: booking.deposit_amount,
        totalAmount: booking.total_amount,
      },
      location: {
        name: booking.locations?.name,
        address: booking.locations?.address,
        city: booking.locations?.city,
        phone: booking.locations?.phone,
      },
      customer: {
        name: profile?.full_name,
        email: profile?.email,
        phone: profile?.phone,
      },
      mileageLimits: {
        dailyLimit: 200,
        excessRate: 0.35,
        unit: "miles",
      },
      policies: {
        lateFeePerHour: 25,
        gracePeriodMinutes: 30,
        fuelReturnPolicy: "Return with same fuel level as pickup",
        smokingAllowed: false,
        petsAllowed: false,
        internationalTravel: false,
      },
    };

    // Generate agreement content
    const startDate = new Date(booking.start_at).toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
    const endDate = new Date(booking.end_at).toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    const agreementContent = `
VEHICLE RENTAL AGREEMENT
Booking Reference: ${booking.booking_code}
Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

═══════════════════════════════════════════════════════════════════

PARTIES TO THIS AGREEMENT

RENTER:
Name: ${profile?.full_name || 'N/A'}
Email: ${profile?.email || 'N/A'}
Phone: ${profile?.phone || 'N/A'}

RENTAL COMPANY:
Location: ${booking.locations?.name || 'N/A'}
Address: ${booking.locations?.address || 'N/A'}, ${booking.locations?.city || 'N/A'}
Phone: ${booking.locations?.phone || 'N/A'}

═══════════════════════════════════════════════════════════════════

VEHICLE DETAILS

Make: ${booking.vehicles?.make || 'N/A'}
Model: ${booking.vehicles?.model || 'N/A'}
Year: ${booking.vehicles?.year || 'N/A'}
Category: ${booking.vehicles?.category || 'N/A'}
Fuel Type: ${booking.vehicles?.fuel_type || 'N/A'}
Transmission: ${booking.vehicles?.transmission || 'N/A'}
Seating Capacity: ${booking.vehicles?.seats || 'N/A'} passengers

═══════════════════════════════════════════════════════════════════

RENTAL PERIOD

Pick-up: ${startDate}
Return: ${endDate}
Duration: ${booking.total_days} day(s)

═══════════════════════════════════════════════════════════════════

FINANCIAL TERMS

Daily Rate: $${Number(booking.daily_rate).toFixed(2)}
Subtotal (${booking.total_days} days): $${Number(booking.subtotal).toFixed(2)}
Taxes & Fees: $${Number(booking.tax_amount || 0).toFixed(2)}
Security Deposit: $${Number(booking.deposit_amount || 0).toFixed(2)}
─────────────────────────────────────────────────────────────────
TOTAL DUE: $${Number(booking.total_amount).toFixed(2)}

═══════════════════════════════════════════════════════════════════

MILEAGE ALLOWANCE

Daily Mileage Limit: 200 miles per day
Total Included Mileage: ${booking.total_days * 200} miles
Excess Mileage Rate: $0.35 per mile over limit

═══════════════════════════════════════════════════════════════════

TERMS AND CONDITIONS

1. DRIVER REQUIREMENTS
   - Renter must be at least 21 years of age
   - Valid driver's license required
   - Additional drivers must be registered and approved

2. VEHICLE USE RESTRICTIONS
   - No smoking in the vehicle
   - No pets without prior written approval
   - No racing, towing, or off-road use
   - No international travel without prior authorization
   - Vehicle may only be operated on paved public roads

3. FUEL POLICY
   - Vehicle must be returned with same fuel level as at pickup
   - Refueling charges apply if vehicle is returned with less fuel

4. RETURN POLICY
   - Grace period: 30 minutes past scheduled return time
   - Late fee: $25 per hour after grace period
   - Extended rentals require prior approval

5. DAMAGE AND LIABILITY
   - Renter is responsible for all damage during rental period
   - Any damage must be reported immediately
   - Security deposit may be applied to cover damages
   - Renter is liable for all traffic violations and tolls

6. INSURANCE
   - Renter must maintain valid auto insurance
   - Additional coverage options available at pickup
   - Renter's insurance is primary coverage

7. TERMINATION
   - Rental company may terminate agreement for violation of terms
   - Early return does not guarantee refund

═══════════════════════════════════════════════════════════════════

ACKNOWLEDGMENT AND SIGNATURE

By signing below, I acknowledge that I have read, understood, and agree 
to all terms and conditions outlined in this Rental Agreement. I confirm 
that all information provided is accurate and complete.

I understand that my electronic signature below has the same legal effect 
as a handwritten signature.

Renter Signature: ________________________________

Date: ________________________________

═══════════════════════════════════════════════════════════════════
`.trim();

    // Create the agreement record
    const { data: agreement, error: createError } = await supabase
      .from("rental_agreements")
      .insert({
        booking_id: bookingId,
        agreement_content: agreementContent,
        terms_json: terms,
        status: "pending",
      })
      .select("id")
      .single();

    if (createError) {
      console.error("Failed to create agreement:", createError);
      return new Response(
        JSON.stringify({ error: "Failed to create agreement" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Agreement created successfully: ${agreement.id}`);

    // Log to audit
    await supabase.from("audit_logs").insert({
      entity_type: "rental_agreement",
      entity_id: agreement.id,
      action: "agreement_generated",
      user_id: auth.userId || null,
      new_data: { booking_id: bookingId, booking_code: booking.booking_code },
    });

    // Send notification to customer
    try {
      console.log(`Sending agreement_ready notification for booking: ${bookingId}`);
      await supabase.functions.invoke("send-agreement-notification", {
        body: { bookingId, notificationType: "agreement_ready" },
      });
    } catch (notifyError) {
      console.error("Failed to send agreement notification (non-blocking):", notifyError);
    }

    return new Response(
      JSON.stringify({ agreementId: agreement.id, success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating agreement:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
