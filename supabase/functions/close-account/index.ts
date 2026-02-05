import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateAuth, isAdminOrStaff } from "../_shared/auth.ts";

/**
 * Close Account
 * 
 * Complete account closeout workflow:
 * 1. Calculate all final charges
 * 2. Determine settlement (what's owed vs paid)
 * 3. Capture from deposit if needed (or release if not)
 * 4. Generate final invoice
 * 5. Send receipt to customer
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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Validate authentication
    const authResult = await validateAuth(req);
    if (!authResult.authenticated) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin/staff
    const hasAccess = await isAdminOrStaff(authResult.userId!);
    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin/Staff only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("Stripe not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

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

    // Check if already closed
    if (booking.account_closed_at) {
      return new Response(
        JSON.stringify({ 
          error: "Account already closed",
          closedAt: booking.account_closed_at,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all payments
    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("status", "completed");

    // Calculate totals
    const rentalSubtotal = Number(booking.subtotal) || 0;
    const addonsTotal = (booking.booking_add_ons || []).reduce(
      (sum: number, addon: any) => sum + Number(addon.price) * (addon.quantity || 1), 
      0
    );
    const taxAmount = Number(booking.tax_amount) || 0;
    const lateFees = Number(booking.late_return_fee) || 0;

    // Additional charges from request
    const damageCharges = (additionalCharges || [])
      .filter(c => c.type === "damage")
      .reduce((sum, c) => sum + c.amount, 0);
    const otherFees = (additionalCharges || [])
      .filter(c => c.type !== "damage")
      .reduce((sum, c) => sum + c.amount, 0);

    const totalCharges = rentalSubtotal + addonsTotal + taxAmount + lateFees + damageCharges + otherFees;

    // Payments received (excluding deposits)
    const paymentsReceived = (payments || [])
      .filter((p: any) => p.payment_type === "rental")
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

    const amountDue = totalCharges - paymentsReceived;
    const depositHeld = Number(booking.deposit_amount) || 0;

    // Determine Stripe operations
    const stripeOperations: Array<{ type: string; id: string; amount: number }> = [];
    let depositCaptured = 0;
    let depositReleased = 0;

    if (booking.deposit_status === "authorized" && booking.stripe_deposit_pi_id) {
      if (amountDue > 0 && depositHeld > 0) {
        // Capture from deposit to cover remaining charges
        const captureAmount = Math.min(amountDue, depositHeld);
        const captureAmountCents = Math.round(captureAmount * 100);

        try {
          const capturedIntent = await stripe.paymentIntents.capture(
            booking.stripe_deposit_pi_id,
            { amount_to_capture: captureAmountCents }
          );

          depositCaptured = captureAmount;
          depositReleased = depositHeld - captureAmount;

          stripeOperations.push({
            type: "capture",
            id: capturedIntent.latest_charge as string,
            amount: captureAmount,
          });

          // Update booking
          await supabase.from("bookings").update({
            deposit_status: "captured",
            deposit_captured_at: new Date().toISOString(),
            deposit_captured_amount: captureAmountCents,
            deposit_capture_reason: "Final charges settlement",
            stripe_deposit_charge_id: capturedIntent.latest_charge as string,
          }).eq("id", bookingId);

          // Add ledger entries
          await supabase.from("deposit_ledger").insert([
            {
              booking_id: bookingId,
              action: depositReleased > 0 ? "partial_capture" : "capture",
              amount: captureAmount,
              created_by: authResult.userId!,
              reason: "Final charges settlement",
              stripe_pi_id: booking.stripe_deposit_pi_id,
              stripe_charge_id: capturedIntent.latest_charge as string,
            },
            ...(depositReleased > 0 ? [{
              booking_id: bookingId,
              action: "stripe_release" as const,
              amount: depositReleased,
              created_by: authResult.userId!,
              reason: "Remaining authorization released",
              stripe_pi_id: booking.stripe_deposit_pi_id,
            }] : []),
          ]);

        } catch (stripeError: any) {
          console.error("Failed to capture deposit:", stripeError);
          throw new Error(`Failed to capture deposit: ${stripeError.message}`);
        }
      } else {
        // No amount due - release full deposit
        try {
          await stripe.paymentIntents.cancel(booking.stripe_deposit_pi_id, {
            cancellation_reason: "requested_by_customer",
          });

          depositReleased = depositHeld;

          stripeOperations.push({
            type: "release",
            id: booking.stripe_deposit_pi_id,
            amount: depositHeld,
          });

          // Update booking
          await supabase.from("bookings").update({
            deposit_status: "released",
            deposit_released_at: new Date().toISOString(),
          }).eq("id", bookingId);

          // Add ledger entry
          await supabase.from("deposit_ledger").insert({
            booking_id: bookingId,
            action: "stripe_release",
            amount: depositHeld,
            created_by: authResult.userId!,
            reason: "Rental completed - full deposit released",
            stripe_pi_id: booking.stripe_deposit_pi_id,
          });

        } catch (stripeError: any) {
          console.error("Failed to release deposit:", stripeError);
          throw new Error(`Failed to release deposit: ${stripeError.message}`);
        }
      }
    }

    // Collect all Stripe IDs
    const stripePaymentIds = (payments || [])
      .filter((p: any) => p.transaction_id?.startsWith("pi_"))
      .map((p: any) => p.transaction_id);
    const stripeChargeIds = stripeOperations
      .filter(op => op.type === "capture")
      .map(op => op.id);

    // Build line items
    const lineItems = [
      { description: `Rental (${booking.total_days} days)`, amount: rentalSubtotal },
      ...(booking.booking_add_ons || []).map((addon: any) => ({
        description: addon.add_on?.name || "Add-on",
        amount: Number(addon.price) * (addon.quantity || 1),
      })),
      { description: "Taxes", amount: taxAmount },
      ...(lateFees > 0 ? [{ description: "Late Return Fee", amount: lateFees }] : []),
      ...(additionalCharges || []).map(c => ({
        description: c.description,
        amount: c.amount,
      })),
    ];

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
        deposit_held: depositHeld,
        deposit_captured: depositCaptured,
        deposit_released: depositReleased,
        payments_received: paymentsReceived,
        grand_total: totalCharges,
        amount_due: Math.max(0, amountDue - depositCaptured),
        stripe_payment_ids: stripePaymentIds,
        stripe_charge_ids: stripeChargeIds,
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
        deposit_captured: depositCaptured,
        deposit_released: depositReleased,
        stripe_operations: stripeOperations,
      },
    });

    // Send final receipt
    try {
      await supabase.functions.invoke("generate-return-receipt", {
        body: {
          bookingId,
          depositReleased,
          depositWithheld: depositCaptured,
          withholdReason: depositCaptured > 0 ? "Final charges settlement" : undefined,
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
          amountDue,
          depositCaptured,
          depositReleased,
        },
        stripeOperations,
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
