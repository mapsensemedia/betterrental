import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateAuth, isAdminOrStaff } from "../_shared/auth.ts";

/**
 * Close Account
 * 
 * P1 FIX: Invoice line items properly decompose booking.subtotal so sum(line items) == subtotal.
 * Add-ons, drivers, protection, fees are subtracted from subtotal to derive the vehicle rental portion.
 */

interface CloseAccountRequest {
  bookingId: string;
  additionalCharges?: Array<{
    description: string;
    amount: number;
    type: "late_fee" | "damage" | "fee" | "other";
  }>;
  notes?: string;
}

function roundCents(v: number): number {
  return Math.round(v * 100) / 100;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const authResult = await validateAuth(req);
    if (!authResult.authenticated) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasAccess = await isAdminOrStaff(authResult.userId!);
    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin/Staff only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { bookingId, additionalCharges, notes }: CloseAccountRequest = await req.json();

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "bookingId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get booking with all related data
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        booking_add_ons (
          id,
          price,
          quantity,
          add_on:add_ons (name)
        ),
        booking_additional_drivers (
          id,
          driver_name,
          driver_age_band,
          young_driver_fee
        )
      `)
      .eq("id", bookingId)
      .single();

    // Fetch vehicle category name for protection group lookup
    let vehicleCatName = "";
    if (booking?.vehicle_id) {
      const { data: cat } = await supabase
        .from("vehicle_categories")
        .select("name")
        .eq("id", booking.vehicle_id)
        .maybeSingle();
      vehicleCatName = cat?.name || "";
    }

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (booking.account_closed_at) {
      return new Response(
        JSON.stringify({ error: "Account already closed", closedAt: booking.account_closed_at }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Lifecycle guard: only active or completed bookings can be closed
    const closableStatuses = ["active", "completed"];
    if (!closableStatuses.includes(booking.status)) {
      return new Response(
        JSON.stringify({
          error: `Cannot close account for a ${booking.status} booking`,
          errorCode: "INVALID_STATE_TRANSITION",
          currentStatus: booking.status,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all payments
    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("status", "completed");

    // ── Decompose subtotal into non-overlapping line items matching FinancialBreakdown ──
    const bookingSubtotal = Number(booking.subtotal) || 0;
    const taxAmount = Number(booking.tax_amount) || 0;
    const bookingTotal = Number(booking.total_amount) || 0;
    const lateFees = Number(booking.late_return_fee) || 0;
    const totalDays = booking.total_days || 0;
    const dailyRate = Number(booking.daily_rate) || 0;

    // Add-ons: price is already the server-computed line total
    const addonsFromBooking = (booking.booking_add_ons || []).map((addon: any) => {
      const qty = Number(addon.quantity) || 1;
      const name = addon.add_on?.name || "Add-on";
      return {
        description: qty > 1 ? `${name} ×${qty}` : name,
        amount: roundCents(Number(addon.price)),
      };
    });
    const addonsTotal = addonsFromBooking.reduce((sum: number, a: any) => sum + a.amount, 0);

    // Additional drivers
    const driversFromBooking = (booking.booking_additional_drivers || []).map((d: any) => {
      const fee = Number(d.young_driver_fee) || 0;
      const isYoung = d.driver_age_band === "20_24";
      const perDay = fee > 0 ? roundCents(fee / totalDays) : (isYoung ? 19.99 : 14.99);
      const displayTotal = fee > 0 ? fee : roundCents(perDay * totalDays);
      return {
        description: `${d.driver_name || "Additional Driver"} (${isYoung ? "Young" : "Standard"} $${perDay.toFixed(2)}/day × ${totalDays}d)`,
        amount: roundCents(displayTotal),
      };
    });
    const additionalDriversTotal = driversFromBooking.reduce((sum: number, d: any) => sum + d.amount, 0);

    const deliveryFee = Number(booking.delivery_fee) || 0;
    const differentDropoffFee = Number(booking.different_dropoff_fee) || 0;
    const youngDriverFee = Number(booking.young_driver_fee) || 0;
    const upgradeDailyFee = Number(booking.upgrade_daily_fee) || 0;
    const upgradeTotal = roundCents(upgradeDailyFee * totalDays);

    // Protection plan
    const PVRT_DAILY = 1.50;
    const ACSRCH_DAILY = 1.00;
    const protectionPlan = booking.protection_plan || "none";
    let protectionDailyRate = 0;
    if (protectionPlan !== "none") {
      // Group-based protection rates (same as FinancialBreakdown)
      const catUpper = vehicleCatName.toUpperCase();
      let group = 1;
      if (catUpper.includes("LARGE") && catUpper.includes("SUV")) group = 3;
      else if (catUpper.includes("MINIVAN") || (catUpper.includes("STANDARD") && catUpper.includes("SUV"))) group = 2;
      const GROUP_RATES: Record<number, Record<string, number>> = {
        1: { basic: 32.99, smart: 37.99, premium: 49.99 },
        2: { basic: 52.99, smart: 57.99, premium: 69.99 },
        3: { basic: 64.99, smart: 69.99, premium: 82.99 },
      };
      protectionDailyRate = GROUP_RATES[group]?.[protectionPlan] ?? 0;
    }
    const protectionTotal = roundCents(protectionDailyRate * totalDays);
    const pvrtTotal = roundCents(PVRT_DAILY * totalDays);
    const acsrchTotal = roundCents(ACSRCH_DAILY * totalDays);

    const PROTECTION_LABELS: Record<string, string> = {
      premium: "All Inclusive Coverage",
      smart: "Smart Coverage",
      basic: "Basic Coverage",
    };

    // Vehicle rental portion = subtotal minus all individually itemized components
    const vehicleRentalPortion = roundCents(
      bookingSubtotal
      - protectionTotal
      - addonsTotal
      - additionalDriversTotal
      - deliveryFee
      - differentDropoffFee
      - youngDriverFee
      - upgradeTotal
      - pvrtTotal
      - acsrchTotal
    );

    // Build line items matching FinancialBreakdown order
    const lineItems: { description: string; amount: number }[] = [];

    // Vehicle rental
    const vehicleBase = roundCents(dailyRate * totalDays);
    const hasAdjustments = Math.abs(vehicleRentalPortion - vehicleBase) > 0.01;
    lineItems.push({
      description: hasAdjustments
        ? `Vehicle Rental (${totalDays} days, incl. surcharges/discounts)`
        : `Vehicle Rental ($${dailyRate.toFixed(2)}/day × ${totalDays} days)`,
      amount: vehicleRentalPortion,
    });

    // Protection plan
    if (protectionTotal > 0) {
      lineItems.push({
        description: `${PROTECTION_LABELS[protectionPlan] || "Protection"} ($${protectionDailyRate.toFixed(2)}/day × ${totalDays} days)`,
        amount: protectionTotal,
      });
    }

    // Add-ons
    for (const addon of addonsFromBooking) {
      if (addon.amount > 0) lineItems.push(addon);
    }

    // Additional drivers
    for (const driver of driversFromBooking) {
      if (driver.amount > 0) lineItems.push(driver);
    }

    // Young driver fee (primary renter)
    if (youngDriverFee > 0) {
      lineItems.push({
        description: `Young Renter Fee ($${roundCents(youngDriverFee / totalDays).toFixed(2)}/day × ${totalDays} days)`,
        amount: youngDriverFee,
      });
    }

    // Delivery / Drop-off / Upgrade
    if (deliveryFee > 0) {
      lineItems.push({ description: "Delivery Fee", amount: deliveryFee });
    }
    if (differentDropoffFee > 0) {
      lineItems.push({ description: "Different Drop-off Location Fee", amount: differentDropoffFee });
    }
    if (upgradeTotal > 0) {
      lineItems.push({ description: `Upgrade ($${upgradeDailyFee.toFixed(2)}/day × ${totalDays} days)`, amount: upgradeTotal });
    }

    // Regulatory fees
    lineItems.push({ description: `PVRT ($${PVRT_DAILY.toFixed(2)}/day × ${totalDays} days)`, amount: pvrtTotal });
    lineItems.push({ description: `ACSRCH ($${ACSRCH_DAILY.toFixed(2)}/day × ${totalDays} days)`, amount: acsrchTotal });

    // Post-booking charges
    if (lateFees > 0) {
      lineItems.push({ description: "Late Return Fee", amount: lateFees });
    }

    const damageCharges = (additionalCharges || [])
      .filter(c => c.type === "damage")
      .reduce((sum, c) => sum + c.amount, 0);
    const otherFees = (additionalCharges || [])
      .filter(c => c.type !== "damage")
      .reduce((sum, c) => sum + c.amount, 0);

    for (const charge of (additionalCharges || [])) {
      lineItems.push({ description: charge.description, amount: charge.amount });
    }

    // Grand total = original booking total + post-booking charges
    const totalCharges = roundCents(bookingTotal + lateFees + damageCharges + otherFees);

    const paymentsReceived = (payments || [])
      .filter((p: any) => p.payment_type === "rental" || p.payment_type === "additional")
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

    const amountDue = roundCents(totalCharges - paymentsReceived);

    // Collect Stripe payment IDs
    const stripePaymentIds = (payments || [])
      .filter((p: any) => p.transaction_id?.startsWith("pi_"))
      .map((p: any) => p.transaction_id);

    // Create final invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("final_invoices")
      .insert({
        booking_id: bookingId,
        rental_subtotal: bookingSubtotal,
        addons_total: addonsTotal,
        taxes_total: taxAmount,
        fees_total: otherFees,
        late_fees: lateFees,
        damage_charges: damageCharges,
        deposit_held: 0,
        deposit_captured: 0,
        deposit_released: 0,
        payments_received: paymentsReceived,
        grand_total: totalCharges,
        amount_due: Math.max(0, amountDue),
        stripe_payment_ids: stripePaymentIds,
        stripe_charge_ids: [],
        line_items_json: lineItems,
        notes: notes || null,
        status: "issued",
        issued_at: new Date().toISOString(),
        created_by: authResult.userId,
      })
      .select()
      .single();

    if (invoiceError) {
      console.error("Failed to create invoice:", invoiceError);
      throw new Error(`Failed to create invoice: ${invoiceError.message}`);
    }

    // Update booking as closed
    await supabase.from("bookings").update({
      status: "completed",
      account_closed_at: new Date().toISOString(),
      account_closed_by: authResult.userId,
      final_invoice_generated: true,
      final_invoice_id: invoice.invoice_number,
    }).eq("id", bookingId);

    // Audit log
    await supabase.from("audit_logs").insert({
      action: "account_closed",
      entity_type: "booking",
      entity_id: bookingId,
      user_id: authResult.userId,
      new_data: {
        invoice_number: invoice.invoice_number,
        total_charges: totalCharges,
        payments_received: paymentsReceived,
        amount_due: Math.max(0, amountDue),
        line_items_count: lineItems.length,
      },
    });

    // Send final receipt
    try {
      await supabase.functions.invoke("generate-return-receipt", {
        body: {
          bookingId,
          depositReleased: 0,
          depositWithheld: 0,
        },
      });
    } catch (receiptErr) {
      console.warn("Failed to generate return receipt:", receiptErr);
    }

    console.log(`Account closed for booking ${bookingId}, invoice ${invoice.invoice_number}`);

    return new Response(
      JSON.stringify({
        success: true,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        settlement: {
          totalCharges,
          paymentsReceived,
          amountDue: Math.max(0, amountDue),
        },
        receiptSent: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error closing account:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
