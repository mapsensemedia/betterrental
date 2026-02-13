import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateAuth, isAdminOrStaff } from "../_shared/auth.ts";

/**
 * Close Account
 * 
 * Simplified account closeout:
 * 1. Calculate all final charges
 * 2. Generate final invoice
 * 3. Send receipt to customer
 * 4. If balance > 0, admin sends payment link separately
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
        )
      `)
      .eq("id", bookingId)
      .single();

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

    // Calculate totals
    // booking.subtotal is the pre-tax subtotal (includes vehicle, protection, add-ons, fees)
    // booking.tax_amount is the tax on that subtotal
    // booking.total_amount = subtotal + tax_amount (the amount the customer was quoted)
    // Add-ons are already included in booking.subtotal — do NOT add them again
    const bookingTotal = Number(booking.total_amount) || 0;
    const taxAmount = Number(booking.tax_amount) || 0;
    const lateFees = Number(booking.late_return_fee) || 0;

    const damageCharges = (additionalCharges || [])
      .filter(c => c.type === "damage")
      .reduce((sum, c) => sum + c.amount, 0);
    const otherFees = (additionalCharges || [])
      .filter(c => c.type !== "damage")
      .reduce((sum, c) => sum + c.amount, 0);

    // Total charges = original booking total + any post-booking charges
    const totalCharges = bookingTotal + lateFees + damageCharges + otherFees;

    const paymentsReceived = (payments || [])
      .filter((p: any) => p.payment_type === "rental" || p.payment_type === "additional")
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

    const amountDue = totalCharges - paymentsReceived;

    // Collect Stripe payment IDs
    const stripePaymentIds = (payments || [])
      .filter((p: any) => p.transaction_id?.startsWith("pi_"))
      .map((p: any) => p.transaction_id);

    // Build line items from the booking's stored values
    const rentalSubtotal = Number(booking.subtotal) || 0;
    const addonsFromBooking = (booking.booking_add_ons || []).map((addon: any) => ({
      description: addon.add_on?.name || "Add-on",
      amount: Number(addon.price) * (addon.quantity || 1),
    }));
    
    const lineItems = [
      { description: `Rental (${booking.total_days} days)`, amount: rentalSubtotal },
      ...addonsFromBooking,
      { description: "Taxes", amount: taxAmount },
      ...(lateFees > 0 ? [{ description: "Late Return Fee", amount: lateFees }] : []),
      ...(additionalCharges || []).map(c => ({
        description: c.description,
        amount: c.amount,
      })),
    ];

    const addonsTotal = addonsFromBooking.reduce((sum: number, a: any) => sum + a.amount, 0);
    
    // Create final invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("final_invoices")
      .insert({
        booking_id: bookingId,
        rental_subtotal: rentalSubtotal,
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
