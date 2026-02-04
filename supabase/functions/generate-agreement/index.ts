import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, checkRateLimit, rateLimitResponse, getClientIp } from "../_shared/cors.ts";
import { validateAuth } from "../_shared/auth.ts";

/**
 * Agreement Generator
 * 
 * Generates comprehensive rental agreement with:
 * - C2C Car Rental branding
 * - Renter info only (no business phone in renter section)
 * - Pickup and drop-off locations
 * - Vehicle details with odometer/fuel at pickup
 * - Full financial breakdown (add-ons, taxes, PVRT, ACSRCH)
 * - Tank capacity and fuel level
 * - Updated T&C including age requirements, late fees, liability, etc.
 */

// Tax rates
const PST_RATE = 0.07;
const GST_RATE = 0.05;
const PVRT_DAILY_FEE = 1.50;
const ACSRCH_DAILY_FEE = 1.00;

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
        locations (id, name, address, city, phone),
        assigned_unit_id
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

    // Fetch category info
    let categoryInfo = { 
      id: "", 
      name: "Vehicle", 
      fuel_type: "", 
      transmission: "", 
      seats: 0,
      tank_capacity_liters: null as number | null
    };
    if (booking.vehicle_id) {
      const { data: category } = await supabase
        .from("vehicle_categories")
        .select("id, name, fuel_type, transmission, seats")
        .eq("id", booking.vehicle_id)
        .single();
      if (category) {
        categoryInfo = { ...categoryInfo, ...category };
      }
    }

    // Fetch vehicle unit details (VIN, tank capacity)
    let unitInfo = {
      vin: null as string | null,
      license_plate: null as string | null,
      tank_capacity_liters: null as number | null,
      color: null as string | null,
      year: null as number | null,
      make: null as string | null,
      model: null as string | null,
      current_mileage: null as number | null,
    };
    if (booking.assigned_unit_id) {
      const { data: unit } = await supabase
        .from("vehicle_units")
        .select("vin, license_plate, tank_capacity_liters, color, year, make, model, current_mileage")
        .eq("id", booking.assigned_unit_id)
        .single();
      if (unit) {
        unitInfo = unit;
      }
    }

    // Fetch inspection metrics (odometer/fuel at pickup)
    let pickupMetrics = {
      odometer: null as number | null,
      fuel_level: null as number | null,
    };
    const { data: inspectionData } = await supabase
      .from("inspection_metrics")
      .select("odometer, fuel_level")
      .eq("booking_id", bookingId)
      .eq("phase", "pickup")
      .maybeSingle();
    if (inspectionData) {
      pickupMetrics = inspectionData;
    }

    console.log(`Found booking: ${booking.booking_code}`);

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone")
      .eq("id", booking.user_id)
      .maybeSingle();

    console.log(`Found profile: ${profile?.full_name || 'N/A'}`);

    // Fetch add-ons for this booking
    const { data: bookingAddOns } = await supabase
      .from("booking_add_ons")
      .select(`
        id,
        price,
        quantity,
        add_on_id,
        add_ons (name, description)
      `)
      .eq("booking_id", bookingId);

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

    // Calculate financial breakdown
    const rentalDays = booking.total_days || 1;
    const dailyRate = Number(booking.daily_rate) || 0;
    const vehicleSubtotal = dailyRate * rentalDays;
    
    // Add-ons total
    const addOnsTotal = (bookingAddOns || []).reduce((sum, addon) => {
      return sum + (Number(addon.price) || 0);
    }, 0);
    
    // Young driver fee
    const youngDriverFee = Number(booking.young_driver_fee) || 0;
    
    // Daily regulatory fees
    const pvrtTotal = PVRT_DAILY_FEE * rentalDays;
    const acsrchTotal = ACSRCH_DAILY_FEE * rentalDays;
    
    // Calculate subtotal before tax
    const subtotalBeforeTax = vehicleSubtotal + addOnsTotal + youngDriverFee + pvrtTotal + acsrchTotal;
    
    // Calculate taxes
    const pstAmount = subtotalBeforeTax * PST_RATE;
    const gstAmount = subtotalBeforeTax * GST_RATE;
    const totalTax = pstAmount + gstAmount;
    
    const grandTotal = subtotalBeforeTax + totalTax;

    // Format dates
    const startDate = new Date(booking.start_at).toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
    const endDate = new Date(booking.end_at).toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
    const generatedDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });

    // Tank capacity - prefer unit-specific, fallback to category default
    const tankCapacity = unitInfo.tank_capacity_liters || categoryInfo.tank_capacity_liters || 50;
    
    // Build add-ons section
    let addOnsSection = "";
    if (bookingAddOns && bookingAddOns.length > 0) {
      addOnsSection = bookingAddOns.map(addon => {
        const name = (addon.add_ons as any)?.name || "Add-on";
        const price = Number(addon.price) || 0;
        return `   ${name}: $${price.toFixed(2)}`;
      }).join("\n");
    } else {
      addOnsSection = "   No add-ons selected";
    }

    // Generate comprehensive agreement content
    const agreementContent = `
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

                         C2C CAR RENTAL

▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

                   VEHICLE LEGAL AGREEMENT

═══════════════════════════════════════════════════════════════════
Booking Reference: ${booking.booking_code}
Agreement Date: ${generatedDate}
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│                        RENTER INFORMATION                       │
└─────────────────────────────────────────────────────────────────┘

Name:  ${profile?.full_name || 'N/A'}
Email: ${profile?.email || 'N/A'}

┌─────────────────────────────────────────────────────────────────┐
│                           LOCATIONS                             │
└─────────────────────────────────────────────────────────────────┘

Pickup Location:
   ${booking.locations?.name || 'N/A'}
   ${booking.locations?.address || 'N/A'}, ${booking.locations?.city || 'N/A'}

${booking.pickup_address ? `Delivery Address:
   ${booking.pickup_address}
` : ''}Drop-off Location:
   ${booking.locations?.name || 'Same as pickup'}
   ${booking.locations?.address || 'N/A'}, ${booking.locations?.city || 'N/A'}

┌─────────────────────────────────────────────────────────────────┐
│                        VEHICLE DETAILS                          │
└─────────────────────────────────────────────────────────────────┘

Category:     ${categoryInfo.name || 'N/A'}
${unitInfo.make ? `Make:         ${unitInfo.make}` : ''}
${unitInfo.model ? `Model:        ${unitInfo.model}` : ''}
${unitInfo.year ? `Year:         ${unitInfo.year}` : ''}
${unitInfo.color ? `Color:        ${unitInfo.color}` : ''}
${unitInfo.license_plate ? `License Plate: ${unitInfo.license_plate}` : ''}
${unitInfo.vin ? `VIN:          ${unitInfo.vin}` : ''}
Fuel Type:    ${categoryInfo.fuel_type || 'N/A'}
Transmission: ${categoryInfo.transmission || 'N/A'}
Seats:        ${categoryInfo.seats || 'N/A'} passengers
Tank Capacity: ${tankCapacity} litres

CONDITION AT PICKUP:
   Kilometres Out: ${pickupMetrics.odometer !== null ? `${pickupMetrics.odometer.toLocaleString()} km` : (unitInfo.current_mileage ? `${unitInfo.current_mileage.toLocaleString()} km` : 'N/A')}
   Fuel Level:     ${pickupMetrics.fuel_level !== null ? `${pickupMetrics.fuel_level}%` : '100%'}

┌─────────────────────────────────────────────────────────────────┐
│                        RENTAL PERIOD                            │
└─────────────────────────────────────────────────────────────────┘

Pick-up Date/Time: ${startDate}
Return Date/Time:  ${endDate}
Duration:          ${booking.total_days} day(s)

┌─────────────────────────────────────────────────────────────────┐
│                      FINANCIAL SUMMARY                          │
└─────────────────────────────────────────────────────────────────┘

VEHICLE RENTAL:
   Daily Rate: $${dailyRate.toFixed(2)} × ${rentalDays} days = $${vehicleSubtotal.toFixed(2)}

ADD-ONS & EXTRAS:
${addOnsSection}
${youngDriverFee > 0 ? `   Young Driver Fee (20-24): $${youngDriverFee.toFixed(2)}` : ''}

REGULATORY FEES:
   PVRT (Passenger Vehicle Rental Tax): $${PVRT_DAILY_FEE.toFixed(2)}/day × ${rentalDays} = $${pvrtTotal.toFixed(2)}
   ACSRCH (AC Surcharge): $${ACSRCH_DAILY_FEE.toFixed(2)}/day × ${rentalDays} = $${acsrchTotal.toFixed(2)}

─────────────────────────────────────────────────────────────────
SUBTOTAL: $${subtotalBeforeTax.toFixed(2)}

TAXES:
   PST (7%): $${pstAmount.toFixed(2)}
   GST (5%): $${gstAmount.toFixed(2)}

─────────────────────────────────────────────────────────────────
TOTAL AMOUNT DUE: $${grandTotal.toFixed(2)} CAD
─────────────────────────────────────────────────────────────────

Security Deposit: $${Number(booking.deposit_amount || 350).toFixed(2)} (refundable)

┌─────────────────────────────────────────────────────────────────┐
│                    TERMS AND CONDITIONS                         │
└─────────────────────────────────────────────────────────────────┘

1. DRIVER REQUIREMENTS
   • Renter must be at least 20 years of age.
   • Valid driver's license required at time of pickup.
   • Signature requires government-issued photo ID.
   • If the renter holds an interim driving license, they must provide
     valid government-issued photo ID at the time of pickup.
   • Additional drivers must be registered and approved.

2. VEHICLE USE RESTRICTIONS
   • No smoking in the vehicle.
   • No pets without prior written approval.
   • No racing, towing, or off-road use.
   • No international travel without prior authorization.
   • Vehicle may only be operated on paved public roads.

3. FUEL POLICY
   • Vehicle must be returned with same fuel level as at pickup.
   • Tank Capacity: ${tankCapacity} litres
   • Refueling charges apply if vehicle is returned with less fuel.

4. RETURN POLICY & LATE FEES
   • Grace period: 30 minutes past scheduled return time.
   • Late fee: 25% of the daily rate for each additional hour after
     the grace period has expired.
   • Extended rentals require prior approval.

5. DAMAGE AND LIABILITY
   • Renter is responsible for all damage during rental period.
   • Any damage must be reported immediately.
   • Security deposit may be applied to cover damages.
   • Renter is liable for all traffic violations and tolls.
   • Third party liability coverage comes standard with all rentals.

6. INSURANCE & COVERAGE
   • Third party liability is included with all rentals.
   • Optional rental coverage is available at pickup.

7. KILOMETRE ALLOWANCE
   • Unlimited kilometres included.
   • Vehicle must be used responsibly.

8. TERMINATION
   • Rental company may terminate agreement for violation of terms.
   • Early return does not guarantee refund.

9. TAX INFORMATION
   • PST (Provincial Sales Tax): 7%
   • GST (Goods and Services Tax): 5%
   • PVRT (Passenger Vehicle Rental Tax): $1.50/day
   • ACSRCH (AC Surcharge): $1.00/day

┌─────────────────────────────────────────────────────────────────┐
│                  ACKNOWLEDGMENT AND SIGNATURE                   │
└─────────────────────────────────────────────────────────────────┘

☐ I confirm I have read and understood all terms and conditions 
  outlined in this Vehicle Legal Agreement.

☐ I confirm I am at least 20 years of age.

☐ I acknowledge that my electronic signature has the same legal 
  effect as a handwritten signature.

☐ I understand that third party liability coverage is included and 
  optional rental coverage is available at pickup.

☐ I agree to return the vehicle with the same fuel level as at pickup.

☐ I understand late fees will be charged at 25% of the daily rate 
  per hour after the 30-minute grace period.


RENTER SIGNATURE: ________________________________

DATE: ________________________________


═══════════════════════════════════════════════════════════════════
                        C2C Car Rental
                  Thank you for choosing us!
═══════════════════════════════════════════════════════════════════
`.trim();

    // Build comprehensive terms JSON for database storage
    const terms = {
      vehicle: {
        category: categoryInfo.name,
        make: unitInfo.make,
        model: unitInfo.model,
        year: unitInfo.year,
        color: unitInfo.color,
        licensePlate: unitInfo.license_plate,
        vin: unitInfo.vin,
        fuelType: categoryInfo.fuel_type,
        transmission: categoryInfo.transmission,
        seats: categoryInfo.seats,
        tankCapacityLiters: tankCapacity,
      },
      condition: {
        odometerOut: pickupMetrics.odometer,
        fuelLevelOut: pickupMetrics.fuel_level,
      },
      rental: {
        startAt: booking.start_at,
        endAt: booking.end_at,
        totalDays: booking.total_days,
        dailyRate: dailyRate,
      },
      locations: {
        pickup: {
          name: booking.locations?.name,
          address: booking.locations?.address,
          city: booking.locations?.city,
        },
        deliveryAddress: booking.pickup_address,
        dropoff: {
          name: booking.locations?.name,
          address: booking.locations?.address,
          city: booking.locations?.city,
        },
      },
      customer: {
        name: profile?.full_name,
        email: profile?.email,
      },
      financial: {
        vehicleSubtotal,
        addOnsTotal,
        youngDriverFee,
        pvrtTotal,
        acsrchTotal,
        subtotalBeforeTax,
        pstAmount,
        gstAmount,
        totalTax,
        grandTotal,
        depositAmount: Number(booking.deposit_amount || 350),
        addOns: (bookingAddOns || []).map(addon => ({
          name: (addon.add_ons as any)?.name,
          price: Number(addon.price),
        })),
      },
      policies: {
        minAge: 20,
        lateFeePercentOfDaily: 25,
        gracePeriodMinutes: 30,
        thirdPartyLiabilityIncluded: true,
        optionalCoverageAvailable: true,
        fuelReturnPolicy: "Return with same fuel level as pickup",
        smokingAllowed: false,
        petsAllowed: false,
        internationalTravel: false,
      },
      taxes: {
        pstRate: 0.07,
        gstRate: 0.05,
        pvrtDailyFee: 1.50,
        acsrchDailyFee: 1.00,
      },
    };

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
