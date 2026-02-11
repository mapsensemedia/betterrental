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
 * - Protection plan details
 * - Full financial breakdown (add-ons, taxes, PVRT, ACSRCH)
 * - Tank capacity and fuel level
 * - Updated T&C including age requirements, late fees, liability, etc.
 */

// Tax rates
const PST_RATE = 0.07;
const GST_RATE = 0.05;
const PVRT_DAILY_FEE = 1.50;
const ACSRCH_DAILY_FEE = 1.00;

// Protection plan metadata (rates come from booking's pricing_snapshot or group logic)
const PROTECTION_PLAN_META: Record<string, { name: string; deductible: string }> = {
  none: { name: "No Extra Protection", deductible: "Up to full vehicle value" },
  basic: { name: "Basic Protection", deductible: "Up to $800.00" },
  smart: { name: "Smart Protection", deductible: "$0.00" },
  premium: { name: "All Inclusive Protection", deductible: "$0.00" },
};

// Group-based protection daily rates (mirrors src/lib/protection-groups.ts)
type ProtectionGroup = 1 | 2 | 3;
const GROUP_RATES: Record<ProtectionGroup, Record<string, number>> = {
  1: { basic: 32.99, smart: 37.99, premium: 49.99 },
  2: { basic: 52.99, smart: 57.99, premium: 69.99 },
  3: { basic: 64.99, smart: 69.99, premium: 82.99 },
};

function getProtectionGroup(categoryName: string | null | undefined): ProtectionGroup {
  if (!categoryName) return 1;
  const name = categoryName.toUpperCase();
  if (name.includes("LARGE") && name.includes("SUV")) return 3;
  if (name.includes("MINIVAN")) return 2;
  if (name.includes("STANDARD") && name.includes("SUV")) return 2;
  return 1;
}

function getProtectionRate(planId: string, categoryName: string | null | undefined): number {
  if (planId === "none") return 0;
  const group = getProtectionGroup(categoryName);
  return GROUP_RATES[group]?.[planId] ?? 0;
}

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
        locations!bookings_location_id_fkey (id, name, address, city, phone),
        return_location:locations!bookings_return_location_id_fkey (id, name, address, city, phone),
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
      } else {
        console.error(`Category not found for vehicle_id: ${booking.vehicle_id}`);
      }
    }

    // Fetch vehicle unit details (VIN, tank capacity) + make/model/year from related vehicles table
    let unitInfo = {
      vin: null as string | null,
      license_plate: null as string | null,
      tank_capacity_liters: null as number | null,
      color: null as string | null,
      current_mileage: null as number | null,
      make: null as string | null,
      model: null as string | null,
      year: null as number | null,
    };
    if (booking.assigned_unit_id) {
      const { data: unit, error: unitError } = await supabase
        .from("vehicle_units")
        .select("vin, license_plate, tank_capacity_liters, color, current_mileage, vehicles(make, model, year)")
        .eq("id", booking.assigned_unit_id)
        .single();
      if (unit && !unitError) {
        const vehicle = (unit as any).vehicles;
        unitInfo = {
          vin: unit.vin,
          license_plate: unit.license_plate,
          tank_capacity_liters: unit.tank_capacity_liters,
          color: unit.color,
          current_mileage: unit.current_mileage,
          make: vehicle?.make || null,
          model: vehicle?.model || null,
          year: vehicle?.year || null,
        };
      }
      if (unitError) {
        console.error("Failed to fetch vehicle unit:", unitError);
      }
    } else {
      console.log(`No assigned unit for booking ${bookingId} — using category info only`);
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

    // Handle customer name: avoid displaying raw email as name
    let customerName = profile?.full_name || null;
    if (customerName && customerName.includes("@")) {
      customerName = null; // Email used as name — fall back
    }
    const displayName = customerName || "Valued Customer";

    console.log(`Found profile: ${displayName}`);

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

    // Check for vehicle upgrade on the booking
    const hasUpgrade = booking.upgraded_at && booking.upgrade_daily_fee != null && Number(booking.upgrade_daily_fee) > 0;
    const upgradeName = booking.upgrade_category_label || "Vehicle Upgrade";
    const upgradeFee = hasUpgrade ? Number(booking.upgrade_daily_fee) * (booking.total_days || 1) : 0;

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

    // Resolve protection plan from booking
    const protectionPlanId = (booking as any).protection_plan || "none";
    const planMeta = PROTECTION_PLAN_META[protectionPlanId] || PROTECTION_PLAN_META.none;
    
    // Calculate financial breakdown
    const rentalDays = booking.total_days || 1;
    const dailyRate = Number(booking.daily_rate) || 0;
    const vehicleSubtotal = dailyRate * rentalDays;
    
    // Protection rate: use pricing_snapshot if available, otherwise derive from vehicle group
    const pricingSnapshot = booking.pricing_snapshot as any;
    const protectionDailyRate = pricingSnapshot?.protectionDailyRate
      ?? getProtectionRate(protectionPlanId, categoryInfo.name);
    const protectionTotal = protectionDailyRate * rentalDays;
    
    // Add-ons total (includes upgrade fee)
    const addOnsTotal = (bookingAddOns || []).reduce((sum, addon) => {
      return sum + (Number(addon.price) || 0);
    }, 0) + upgradeFee;
    
    // Young driver fee
    const youngDriverFee = Number(booking.young_driver_fee) || 0;
    
    // Daily regulatory fees
    const pvrtTotal = PVRT_DAILY_FEE * rentalDays;
    const acsrchTotal = ACSRCH_DAILY_FEE * rentalDays;
    
    // Calculate subtotal before tax
    const subtotalBeforeTax = vehicleSubtotal + protectionTotal + addOnsTotal + youngDriverFee + pvrtTotal + acsrchTotal;
    
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
    
    // Build add-ons section for text content
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

    // Build vehicle description — NEVER hardcode a vehicle name
    const vehicleDesc = unitInfo.make 
      ? `${categoryInfo.name} — ${[unitInfo.year, unitInfo.make, unitInfo.model].filter(Boolean).join(" ")}` 
      : categoryInfo.name;

    // Generate compact agreement content (structured data is in terms_json)
    const agreementContent = `C2C CAR RENTAL — VEHICLE RENTAL AGREEMENT
Booking: ${booking.booking_code} | Date: ${generatedDate}

Renter: ${displayName} | Email: ${profile?.email || '—'}
Pickup: ${startDate} | Return: ${endDate} | Duration: ${booking.total_days} day(s)
Location: ${booking.locations?.name || '—'}, ${booking.locations?.address || '—'}, ${booking.locations?.city || '—'}
Vehicle: ${vehicleDesc}${unitInfo.license_plate ? ` | Plate: ${unitInfo.license_plate}` : ''}
Daily Rate: $${dailyRate.toFixed(2)} x ${rentalDays} = $${vehicleSubtotal.toFixed(2)}
Protection: ${planMeta.name} ($${protectionDailyRate.toFixed(2)}/day x ${rentalDays} = $${protectionTotal.toFixed(2)})
Add-ons: $${addOnsTotal.toFixed(2)}
${addOnsSection}${youngDriverFee > 0 ? `\nYoung Driver Fee: $${youngDriverFee.toFixed(2)} ($15/day x ${rentalDays} days)` : ''}
PVRT: $${pvrtTotal.toFixed(2)} | ACSRCH: $${acsrchTotal.toFixed(2)} | GST: $${gstAmount.toFixed(2)} | PST: $${pstAmount.toFixed(2)}
TOTAL: $${grandTotal.toFixed(2)} CAD | Deposit: $${Number(booking.deposit_amount || 350).toFixed(2)} (refundable)

Terms: Driver must be 20+ with valid license & govt ID. No smoking, pets (without approval), racing, off-road, or international travel. Return with same fuel level. Late fee: 25% surcharge of daily rate per extra hour up to 2 hrs after 30-min grace; after 2 hrs, full day charge per day. Renter liable for damage & traffic violations. Third-party liability comes standard. Optional rental coverages available at pickup. Unlimited km.`.trim();

    // Build add-ons list including upgrades
    const addOnsList = (bookingAddOns || []).map(addon => ({
      name: (addon.add_ons as any)?.name || "—",
      price: Number(addon.price),
    }));
    if (hasUpgrade) {
      addOnsList.push({
        name: `Upgrade – ${upgradeName}`,
        price: upgradeFee,
      });
    }

    // Build comprehensive terms JSON for database storage
    const terms = {
      bookingCode: booking.booking_code,
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
        name: displayName,
        email: profile?.email,
      },
      protection: {
        planId: protectionPlanId,
        planName: planMeta.name,
        dailyRate: protectionDailyRate,
        total: protectionTotal,
        deductible: planMeta.deductible,
      },
      financial: {
        vehicleSubtotal,
        protectionTotal,
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
        addOns: addOnsList,
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