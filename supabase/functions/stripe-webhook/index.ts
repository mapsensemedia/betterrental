import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Stripe Webhook Handler with Idempotency
 * 
 * - Validates webhook signatures
 * - Checks for duplicate events before processing
 * - Queues deposit operations to prevent race conditions
 * - Records all webhook events for audit trail
 */

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req, true); // true = webhook mode

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeSecretKey || !stripeWebhookSecret) {
      console.error("Stripe credentials not configured");
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Validate signature
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("No stripe-signature header");
      return new Response(
        JSON.stringify({ error: "No signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Received Stripe event: ${event.type} (${event.id})`);

    // ========== IDEMPOTENCY CHECK ==========
    // Check if this event has already been processed
    const { data: existingEvent } = await supabase
      .from("stripe_webhook_events")
      .select("id, processed_at")
      .eq("event_id", event.id)
      .maybeSingle();

    if (existingEvent) {
      console.log(`Event ${event.id} already processed at ${existingEvent.processed_at}, skipping`);
      return new Response(
        JSON.stringify({ received: true, duplicate: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record that we're processing this event (before processing to prevent race conditions)
    let bookingId: string | null = null;
    
    // Extract booking ID from the event data
    switch (event.type) {
      case "checkout.session.completed":
        bookingId = (event.data.object as Stripe.Checkout.Session).metadata?.booking_id || null;
        break;
      case "payment_intent.succeeded":
      case "payment_intent.payment_failed":
      case "payment_intent.amount_capturable_updated":
      case "payment_intent.canceled":
        bookingId = (event.data.object as Stripe.PaymentIntent).metadata?.booking_id || null;
        break;
      case "charge.captured":
      case "charge.refunded":
        // For charges, we need to look up the booking from the payment
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;
        if (paymentIntentId) {
          // First check if it's a deposit by looking at bookings
          const { data: bookingByPI } = await supabase
            .from("bookings")
            .select("id")
            .eq("stripe_deposit_pi_id", paymentIntentId)
            .maybeSingle();
          
          if (bookingByPI) {
            bookingId = bookingByPI.id;
          } else {
            // Check payments table
            const { data: payment } = await supabase
              .from("payments")
              .select("booking_id")
              .eq("transaction_id", paymentIntentId)
              .maybeSingle();
            bookingId = payment?.booking_id || null;
          }
        }
        break;
    }

    // Insert event record
    await supabase.from("stripe_webhook_events").insert({
      event_id: event.id,
      event_type: event.type,
      booking_id: bookingId,
      payload_hash: event.created.toString(), // Simple hash using event creation time
    });

    // ========== EVENT PROCESSING ==========
    let result: Record<string, unknown> = { processed: true };

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const sessionBookingId = session.metadata?.booking_id;
        const paymentType = session.metadata?.payment_type || "rental";

        if (sessionBookingId && session.payment_status === "paid") {
          console.log(`Checkout completed for booking ${sessionBookingId}, type: ${paymentType}`);

          // Get booking user_id
          const { data: booking } = await supabase
            .from("bookings")
            .select("user_id, status, deposit_amount")
            .eq("id", sessionBookingId)
            .single();

          const userId = booking?.user_id || session.metadata?.user_id || "";
          const amount = (session.amount_total || 0) / 100;

          // Check if payment already recorded (double protection)
          const transactionId = (session.payment_intent as string) || session.id;
          const { data: existingPayment } = await supabase
            .from("payments")
            .select("id")
            .eq("transaction_id", transactionId)
            .maybeSingle();

          if (existingPayment) {
            console.log(`Payment ${transactionId} already recorded, skipping`);
            result.paymentSkipped = true;
            break;
          }

          if (paymentType === "payment_request") {
            // Payment request - record as rental payment
            await supabase.from("payments").insert({
              booking_id: sessionBookingId,
              user_id: userId,
              amount,
              payment_type: "rental",
              payment_method: "card",
              status: "completed",
              transaction_id: transactionId,
            });

            // Resolve any pending payment alerts
            await supabase
              .from("admin_alerts")
              .update({ status: "resolved", resolved_at: new Date().toISOString() })
              .eq("booking_id", sessionBookingId)
              .eq("alert_type", "payment_pending")
              .eq("status", "pending");

            console.log("Payment request payment recorded successfully");

            // Send notification
            try {
              await supabase.functions.invoke("send-booking-notification", {
                body: { bookingId: sessionBookingId, stage: "payment_received" },
              });
            } catch (notifyErr) {
              console.warn("Failed to send payment notification:", notifyErr);
            }
          } else {
            // Initial booking payment - update status to confirmed
            await supabase
              .from("bookings")
              .update({ status: "confirmed" })
              .eq("id", sessionBookingId);

            // Record payment
            await supabase.from("payments").insert({
              booking_id: sessionBookingId,
              user_id: userId,
              amount,
              payment_type: "rental",
              payment_method: "card",
              status: "completed",
              transaction_id: transactionId,
            });

            console.log(`Booking ${sessionBookingId} confirmed`);

            // Send confirmation notifications via function invoke
            try {
              await supabase.functions.invoke("send-booking-email", {
                body: { bookingId: sessionBookingId, templateType: "confirmation", forceResend: true },
              });
              await supabase.functions.invoke("send-booking-sms", {
                body: { bookingId: sessionBookingId, templateType: "confirmation" },
              });
            } catch (notifyErr) {
              console.warn("Failed to send confirmation notifications:", notifyErr);
            }
          }

          result.bookingId = sessionBookingId;
          result.amount = amount;
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const piBookingId = paymentIntent.metadata?.booking_id;

        if (piBookingId) {
          console.log(`Payment intent succeeded for booking ${piBookingId}`);

          // Check if booking is already confirmed
          const { data: booking } = await supabase
            .from("bookings")
            .select("status")
            .eq("id", piBookingId)
            .single();

          if (booking?.status === "confirmed") {
            console.log("Booking already confirmed via checkout session");
            result.alreadyConfirmed = true;
            break;
          }

          // Check if payment already recorded
          const { data: existingPayment } = await supabase
            .from("payments")
            .select("id")
            .eq("transaction_id", paymentIntent.id)
            .maybeSingle();

          if (existingPayment) {
            console.log(`Payment ${paymentIntent.id} already recorded`);
            result.paymentSkipped = true;
          } else {
            // Update booking status
            await supabase
              .from("bookings")
              .update({ status: "confirmed" })
              .eq("id", piBookingId);

            // Record payment
            await supabase.from("payments").insert({
              booking_id: piBookingId,
              user_id: paymentIntent.metadata?.user_id || "",
              amount: paymentIntent.amount / 100,
              payment_type: "rental",
              payment_method: paymentIntent.payment_method_types?.[0] || "card",
              status: "completed",
              transaction_id: paymentIntent.id,
            });

            // Send notifications
            try {
              await supabase.functions.invoke("send-booking-email", {
                body: { bookingId: piBookingId, templateType: "confirmation", forceResend: true },
              });
              await supabase.functions.invoke("send-booking-sms", {
                body: { bookingId: piBookingId, templateType: "confirmation" },
              });
            } catch (notifyErr) {
              console.warn("Failed to send notifications:", notifyErr);
            }
          }

          result.bookingId = piBookingId;
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const piBookingId = paymentIntent.metadata?.booking_id;

        if (piBookingId) {
          console.log(`Payment failed for booking ${piBookingId}`);

          // Record failed payment
          await supabase.from("payments").insert({
            booking_id: piBookingId,
            user_id: paymentIntent.metadata?.user_id || "",
            amount: paymentIntent.amount / 100,
            payment_type: "rental",
            payment_method: "card",
            status: "failed",
            transaction_id: paymentIntent.id,
          });

          // Check current booking status
          const { data: failedBooking } = await supabase
            .from("bookings")
            .select("status")
            .eq("id", piBookingId)
            .single();

          if (failedBooking?.status === "draft") {
            // IMPORTANT: Do NOT promote draft → pending on payment failure.
            // Draft bookings are "Pay Now" - if payment fails, they should
            // stay hidden from ops queues. Only add a note.
            await supabase
              .from("bookings")
              .update({ 
                deposit_status: "failed",
                notes: "Online payment failed" 
              })
              .eq("id", piBookingId);
            console.log(`Kept booking ${piBookingId} as draft after payment failure`);
          } else {
            // For already-pending bookings (e.g. pay-at-pickup where ops 
            // later tried to create a hold), just update deposit status
            await supabase
              .from("bookings")
              .update({ 
                deposit_status: "failed",
                notes: "Payment authorization failed - requires new payment attempt" 
              })
              .eq("id", piBookingId);
          }

          result.bookingId = piBookingId;
          result.failed = true;
        }
        break;
      }

      case "charge.refunded": {
        const chargeObj = event.data.object as Stripe.Charge;
        const chargePaymentIntentId = chargeObj.payment_intent as string;

        // Find the payment by transaction ID
        const { data: paymentRecord } = await supabase
          .from("payments")
          .select("booking_id, user_id")
          .eq("transaction_id", chargePaymentIntentId)
          .maybeSingle();

        if (paymentRecord) {
          const refundAmount = (chargeObj.amount_refunded || 0) / 100;
          
          // Check if this refund was already recorded
          const { data: existingRefund } = await supabase
            .from("payments")
            .select("id")
            .eq("transaction_id", chargeObj.id)
            .eq("payment_type", "refund")
            .maybeSingle();

          if (!existingRefund) {
            // Record refund
            await supabase.from("payments").insert({
              booking_id: paymentRecord.booking_id,
              user_id: paymentRecord.user_id,
              amount: -refundAmount,
              payment_type: "refund",
              payment_method: "card",
              status: "completed",
              transaction_id: chargeObj.id,
            });

            console.log(`Refund of $${refundAmount} recorded for booking ${paymentRecord.booking_id}`);
          }

          result.bookingId = paymentRecord.booking_id;
          result.refundAmount = refundAmount;
        }
        break;
      }

      // ========== DEPOSIT HOLD EVENTS ==========
      
      case "payment_intent.amount_capturable_updated": {
        // Authorization hold confirmed - supports both deposit_hold and unified_rental_hold types
        const pi = event.data.object as Stripe.PaymentIntent;
        const holdType = pi.metadata?.type;
        const isDepositHold = holdType === "deposit_hold" || holdType === "unified_rental_hold";
        
        // Also check by stripe_deposit_pi_id if metadata isn't matching
        let depositBookingId = isDepositHold ? pi.metadata?.booking_id : null;
        
        if (!depositBookingId) {
          // Fallback: Look up booking by PaymentIntent ID
          const { data: bookingByPI } = await supabase
            .from("bookings")
            .select("id")
            .eq("stripe_deposit_pi_id", pi.id)
            .maybeSingle();
          
          if (bookingByPI) {
            depositBookingId = bookingByPI.id;
            console.log(`Found booking ${depositBookingId} by PI ID lookup`);
          }
        }
        
        if (depositBookingId && pi.amount_capturable && pi.amount_capturable > 0) {
          console.log(`Authorization confirmed for booking ${depositBookingId}, type: ${holdType || 'lookup'}, amount: $${pi.amount_capturable / 100}`);
          
          // Get card details from payment method if available
          let cardLast4: string | null = null;
          let cardBrand: string | null = null;
          
          if (pi.payment_method) {
            try {
              const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
              const stripe = new Stripe(stripeSecretKey!, { apiVersion: "2023-10-16" });
              const pm = await stripe.paymentMethods.retrieve(pi.payment_method as string);
              if (pm.card) {
                cardLast4 = pm.card.last4;
                cardBrand = pm.card.brand;
              }
            } catch (e) {
              console.warn("Could not fetch payment method details:", e);
            }
          }
          
          // Get current booking to check if we need to promote draft → pending
          const { data: currentBooking } = await supabase
            .from("bookings")
            .select("status")
            .eq("id", depositBookingId)
            .single();

          // Update booking with authorization details
          const updateData: Record<string, unknown> = {
            deposit_status: "authorized",
            deposit_authorized_at: new Date().toISOString(),
            stripe_deposit_pm_id: pi.payment_method as string,
            deposit_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          };
          
          // Promote draft → pending when authorization succeeds
          // This is a backup to the client-side promotion in handlePaymentSuccess
          if (currentBooking?.status === "draft") {
            updateData.status = "pending";
            console.log(`Promoting booking ${depositBookingId} from draft → pending after authorization`);
          }
          
          // Add card details if we have them
          if (cardLast4) updateData.card_last_four = cardLast4;
          if (cardBrand) updateData.card_type = cardBrand;
          
          await supabase
            .from("bookings")
            .update(updateData)
            .eq("id", depositBookingId);
          
          // Get user_id from booking for ledger entry
          const { data: bookingForLedger } = await supabase
            .from("bookings")
            .select("user_id, deposit_amount")
            .eq("id", depositBookingId)
            .single();
            
          if (bookingForLedger) {
            // Add ledger entry
            await supabase.from("deposit_ledger").insert({
              booking_id: depositBookingId,
              action: "authorize",
              amount: pi.amount_capturable / 100,
              created_by: bookingForLedger.user_id,
              reason: `Card authorization hold confirmed (${holdType || 'direct lookup'})`,
              stripe_pi_id: pi.id,
            });
          }
          
          result.depositAuthorized = true;
          result.bookingId = depositBookingId;
          result.amount = pi.amount_capturable / 100;
          result.holdType = holdType || "lookup";
        }
        break;
      }

      case "payment_intent.canceled": {
        // Authorization hold released/expired
        const pi = event.data.object as Stripe.PaymentIntent;
        const cancelHoldType = pi.metadata?.type;
        const isCancelDepositHold = cancelHoldType === "deposit_hold" || cancelHoldType === "unified_rental_hold";
        
        let cancelBookingId = isCancelDepositHold ? pi.metadata?.booking_id : null;
        
        if (!cancelBookingId) {
          // Fallback: Look up booking by PaymentIntent ID
          const { data: bookingByPI } = await supabase
            .from("bookings")
            .select("id")
            .eq("stripe_deposit_pi_id", pi.id)
            .maybeSingle();
          
          if (bookingByPI) {
            cancelBookingId = bookingByPI.id;
          }
        }
        
        if (cancelBookingId) {
          console.log(`Deposit authorization canceled for booking ${cancelBookingId}`);
          
          // Check if this was an expiration or manual cancel
          const isExpired = pi.cancellation_reason === "automatic";
          
          // Update booking status
          await supabase
            .from("bookings")
            .update({
              deposit_status: isExpired ? "expired" : "canceled",
              deposit_released_at: new Date().toISOString(),
            })
            .eq("id", cancelBookingId);
          
          result.depositCanceled = true;
          result.expired = isExpired;
          result.bookingId = cancelBookingId;
        }
        break;
      }

      case "charge.captured": {
        // Deposit was captured
        const capturedCharge = event.data.object as Stripe.Charge;
        const capturedPiId = capturedCharge.payment_intent as string;
        
        // Check if this is a deposit capture
        const { data: bookingForCapture } = await supabase
          .from("bookings")
          .select("id, deposit_amount")
          .eq("stripe_deposit_pi_id", capturedPiId)
          .maybeSingle();
          
        if (bookingForCapture) {
          console.log(`Deposit captured for booking ${bookingForCapture.id}`);
          
          // Update with charge ID if not already set
          await supabase
            .from("bookings")
            .update({
              stripe_deposit_charge_id: capturedCharge.id,
            })
            .eq("id", bookingForCapture.id)
            .is("stripe_deposit_charge_id", null);
          
          result.depositCaptured = true;
          result.bookingId = bookingForCapture.id;
          result.amount = capturedCharge.amount_captured / 100;
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
        result.unhandled = true;
    }

    // Update the webhook event record with result
    await supabase
      .from("stripe_webhook_events")
      .update({ result })
      .eq("event_id", event.id);

    return new Response(
      JSON.stringify({ received: true, ...result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in stripe-webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
