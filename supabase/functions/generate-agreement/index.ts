import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId } = await req.json();

    if (!bookingId) {
      console.error("Missing bookingId");
      return new Response(
        JSON.stringify({ error: "Missing bookingId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating agreement for booking: ${bookingId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch booking with all related data
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        vehicles (id, make, model, year, category, fuel_type, transmission, seats),
        locations (id, name, address, city, phone),
        profiles:user_id (id, full_name, email, phone)
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

    console.log(`Found booking: ${booking.booking_code}`);

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
        name: booking.profiles?.full_name,
        email: booking.profiles?.email,
        phone: booking.profiles?.phone,
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
Name: ${booking.profiles?.full_name || 'N/A'}
Email: ${booking.profiles?.email || 'N/A'}
Phone: ${booking.profiles?.phone || 'N/A'}

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
      new_data: { booking_id: bookingId, booking_code: booking.booking_code },
    });

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
