import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Stripe Webhook Handler
 * 
 * Handles standard payment events:
 * - checkout.session.completed (payment link / checkout session)
 * - payment_intent.succeeded (inline Stripe Elements payment)
 * - payment_intent.payment_failed
 * - charge.refunded
 */

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req, true);

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

    // Idempotency check
    const { data: existingEvent } = await supabase
      .from("stripe_webhook_events")
      .select("id, processed_at")
      .eq("event_id", event.id)
      .maybeSingle();

    if (existingEvent) {
      console.log(`Event ${event.id} already processed, skipping`);
      return new Response(
        JSON.stringify({ received: true, duplicate: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract booking ID
    let bookingId: string | null = null;
    switch (event.type) {
      case "checkout.session.completed":
        bookingId = (event.data.object as Stripe.Checkout.Session).metadata?.booking_id || null;
        break;
      case "payment_intent.succeeded":
      case "payment_intent.payment_failed":
        bookingId = (event.data.object as Stripe.PaymentIntent).metadata?.booking_id || null;
        break;
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const piId = charge.payment_intent as string;
        if (piId) {
          const { data: payment } = await supabase
            .from("payments")
            .select("booking_id")
            .eq("transaction_id", piId)
            .maybeSingle();
          bookingId = payment?.booking_id || null;
          
          if (!bookingId) {
            const { data: bookingByPI } = await supabase
              .from("bookings")
              .select("id")
              .eq("stripe_deposit_pi_id", piId)
              .maybeSingle();
            bookingId = bookingByPI?.id || null;
          }
        }
        break;
      }
    }

    // Record event
    await supabase.from("stripe_webhook_events").insert({
      event_id: event.id,
      event_type: event.type,
      booking_id: bookingId,
      payload_hash: event.created.toString(),
    });

    let result: Record<string, unknown> = { processed: true };

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const sessionBookingId = session.metadata?.booking_id;
        const paymentType = session.metadata?.payment_type || "rental";

        if (sessionBookingId && session.payment_status === "paid") {
          console.log(`Checkout completed for booking ${sessionBookingId}, type: ${paymentType}, location: ${session.metadata?.location_id || "n/a"}`);

          const { data: booking } = await supabase
            .from("bookings")
            .select("user_id, status, total_amount, deposit_amount, location_id")
            .eq("id", sessionBookingId)
            .single();

          const userId = booking?.user_id || session.metadata?.user_id || "";
          const amount = (session.amount_total || 0) / 100;
          const transactionId = (session.payment_intent as string) || session.id;
          const locationId = session.metadata?.location_id || "";

          // Check duplicate
          const { data: existingPayment } = await supabase
            .from("payments")
            .select("id")
            .eq("transaction_id", transactionId)
            .maybeSingle();

          if (existingPayment) {
            result.paymentSkipped = true;
            break;
          }

          // Extract card details from Stripe payment method
          let cardLastFour: string | null = null;
          let cardType: string | null = null;
          let cardHolderName: string | null = null;

          try {
            if (session.payment_intent) {
              const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string, {
                expand: ["payment_method"],
              });
              const pm = pi.payment_method as Stripe.PaymentMethod | null;
              if (pm?.card) {
                cardLastFour = pm.card.last4;
                cardType = pm.card.brand;
              }
              if (pm?.billing_details?.name) {
                cardHolderName = pm.billing_details.name;
              }
            }
          } catch (cardErr) {
            console.warn("Could not retrieve card details:", cardErr);
          }

          // Update booking with card details
          const bookingUpdate: Record<string, unknown> = {};
          if (cardLastFour) bookingUpdate.card_last_four = cardLastFour;
          if (cardType) bookingUpdate.card_type = cardType;
          if (cardHolderName) bookingUpdate.card_holder_name = cardHolderName;

          // Determine if this is a deposit or full payment
          const bookingTotal = Number(booking?.total_amount ?? 0);
          const depositAmount = Number(booking?.deposit_amount ?? 0);
          const isDepositPayment = depositAmount > 0 && Math.abs(amount - depositAmount) < 1.00 && amount < bookingTotal;
          const recordedPaymentType = isDepositPayment ? "deposit" : "rental";

          if (paymentType === "payment_request") {
            await supabase.from("payments").insert({
              booking_id: sessionBookingId,
              user_id: userId,
              amount,
              payment_type: "rental",
              payment_method: "card",
              status: "completed",
              transaction_id: transactionId,
              location_id: locationId || booking?.location_id || null,
            });

            // Update card details if available
            if (Object.keys(bookingUpdate).length > 0) {
              await supabase.from("bookings").update(bookingUpdate).eq("id", sessionBookingId);
            }

            await supabase
              .from("admin_alerts")
              .update({ status: "resolved", resolved_at: new Date().toISOString() })
              .eq("booking_id", sessionBookingId)
              .eq("alert_type", "payment_pending")
              .eq("status", "pending");

            try {
              await supabase.functions.invoke("send-booking-notification", {
                body: { bookingId: sessionBookingId, stage: "payment_received" },
              });
            } catch (notifyErr) {
              console.warn("Failed to send payment notification:", notifyErr);
            }
          } else {
            // Only mark confirmed if full payment received (not just deposit)
            const newStatus = isDepositPayment ? "pending" : "confirmed";

            // MONOTONIC GUARD: never downgrade status
            const STATUS_RANK: Record<string, number> = { draft: 0, pending: 1, confirmed: 2, active: 3, completed: 4, cancelled: 5 };
            const currentRank = STATUS_RANK[booking?.status ?? "draft"] ?? 0;
            const newRank = STATUS_RANK[newStatus] ?? 0;

            if (newRank >= currentRank) {
              await supabase
                .from("bookings")
                .update({ status: newStatus, ...bookingUpdate })
                .eq("id", sessionBookingId);
            } else {
              console.log(`[stripe-webhook] Skipping status downgrade ${booking?.status} → ${newStatus} for ${sessionBookingId}`);
              // Still update card details
              if (Object.keys(bookingUpdate).length > 0) {
                await supabase.from("bookings").update(bookingUpdate).eq("id", sessionBookingId);
              }
            }

            await supabase.from("payments").insert({
              booking_id: sessionBookingId,
              user_id: userId,
              amount,
              payment_type: recordedPaymentType,
              payment_method: "card",
              status: "completed",
              transaction_id: transactionId,
              location_id: locationId || booking?.location_id || null,
            });

            try {
              await supabase.functions.invoke("send-booking-email", {
                body: { bookingId: sessionBookingId, templateType: "confirmation", forceResend: true },
              });
              await supabase.functions.invoke("send-booking-sms", {
                body: { bookingId: sessionBookingId, templateType: "confirmation" },
              });
            } catch (notifyErr) {
              console.warn("Failed to send notifications:", notifyErr);
            }
          }

          result.bookingId = sessionBookingId;
          result.amount = amount;
          result.cardCaptured = !!cardLastFour;
          result.paymentType = recordedPaymentType;
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const piBookingId = paymentIntent.metadata?.booking_id;

        if (piBookingId) {
          console.log(`Payment succeeded for booking ${piBookingId}`);

          const { data: booking } = await supabase
            .from("bookings")
            .select("status, total_amount, deposit_amount, location_id")
            .eq("id", piBookingId)
            .single();

          // Check duplicate (removed early-exit — payment rows must always insert;
          // monotonic guard below protects status from downgrade)
          const { data: existingPayment } = await supabase
            .from("payments")
            .select("id")
            .eq("transaction_id", paymentIntent.id)
            .maybeSingle();

          if (existingPayment) {
            result.paymentSkipped = true;
          } else {
            // Extract card details
            let cardUpdate: Record<string, unknown> = {};
            try {
              if (paymentIntent.payment_method) {
                const pm = await stripe.paymentMethods.retrieve(paymentIntent.payment_method as string);
                if (pm?.card) {
                  cardUpdate.card_last_four = pm.card.last4;
                  cardUpdate.card_type = pm.card.brand;
                }
                if (pm?.billing_details?.name) {
                  cardUpdate.card_holder_name = pm.billing_details.name;
                }
              }
            } catch (cardErr) {
              console.warn("Could not retrieve card details:", cardErr);
            }

            // Determine deposit vs full payment
            const piAmount = paymentIntent.amount / 100;
            const bookingTotal = Number(booking?.total_amount ?? 0);
            const depositAmt = Number(booking?.deposit_amount ?? 0);
            const isDeposit = depositAmt > 0 && Math.abs(piAmount - depositAmt) < 1.00 && piAmount < bookingTotal;
            const piPaymentType = isDeposit ? "deposit" : "rental";

            // Deposit → pending; full payment → confirmed
            const piNewStatus = isDeposit ? "pending" : "confirmed";

            // MONOTONIC GUARD: never downgrade status
            const PI_STATUS_RANK: Record<string, number> = { draft: 0, pending: 1, confirmed: 2, active: 3, completed: 4, cancelled: 5 };
            const piCurrentRank = PI_STATUS_RANK[booking?.status ?? "draft"] ?? 0;
            const piNewRank = PI_STATUS_RANK[piNewStatus] ?? 0;

            if (piNewRank >= piCurrentRank) {
              await supabase
                .from("bookings")
                .update({ status: piNewStatus, ...cardUpdate })
                .eq("id", piBookingId);
            } else {
              console.log(`[stripe-webhook] Skipping PI status downgrade ${booking?.status} → ${piNewStatus} for ${piBookingId}`);
              if (Object.keys(cardUpdate).length > 0) {
                await supabase.from("bookings").update(cardUpdate).eq("id", piBookingId);
              }
            }

            await supabase.from("payments").insert({
              booking_id: piBookingId,
              user_id: paymentIntent.metadata?.user_id || "",
              amount: piAmount,
              payment_type: piPaymentType,
              payment_method: paymentIntent.payment_method_types?.[0] || "card",
              status: "completed",
              transaction_id: paymentIntent.id,
              location_id: paymentIntent.metadata?.location_id || booking?.location_id || null,
            });

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
          result.cardCaptured = !!cardUpdate.card_last_four;
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const piBookingId = paymentIntent.metadata?.booking_id;

        if (piBookingId) {
          console.log(`Payment failed for booking ${piBookingId}`);

          await supabase.from("payments").insert({
            booking_id: piBookingId,
            user_id: paymentIntent.metadata?.user_id || "",
            amount: paymentIntent.amount / 100,
            payment_type: "rental",
            payment_method: "card",
            status: "failed",
            transaction_id: paymentIntent.id,
            location_id: paymentIntent.metadata?.location_id || "",
          });

          const { data: failedBooking } = await supabase
            .from("bookings")
            .select("status")
            .eq("id", piBookingId)
            .single();

          if (failedBooking?.status === "draft") {
            await supabase
              .from("bookings")
              .update({ notes: "Online payment failed" })
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

        const { data: paymentRecord } = await supabase
          .from("payments")
          .select("booking_id, user_id")
          .eq("transaction_id", chargePaymentIntentId)
          .maybeSingle();

        if (paymentRecord) {
          const refundAmount = (chargeObj.amount_refunded || 0) / 100;
          
          const { data: existingRefund } = await supabase
            .from("payments")
            .select("id")
            .eq("transaction_id", chargeObj.id)
            .eq("payment_type", "refund")
            .maybeSingle();

          if (!existingRefund) {
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

      default:
        console.log(`Unhandled event type: ${event.type}`);
        result.unhandled = true;
    }

    // Update webhook event record
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
