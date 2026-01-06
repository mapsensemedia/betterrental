import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Received Stripe event:", event.type);

    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata?.booking_id;

        if (bookingId) {
          console.log(`Payment succeeded for booking ${bookingId}`);

          // Update booking status
          await supabase
            .from("bookings")
            .update({ status: "confirmed" })
            .eq("id", bookingId);

          // Record payment
          await supabase.from("payments").insert({
            booking_id: bookingId,
            user_id: paymentIntent.metadata?.user_id || "",
            amount: paymentIntent.amount / 100,
            payment_type: "rental",
            payment_method: paymentIntent.payment_method_types?.[0] || "card",
            status: "completed",
            transaction_id: paymentIntent.id,
          });

          // Send confirmation notifications
          const notifyUrl = `${supabaseUrl}/functions/v1/send-booking-email`;
          await fetch(notifyUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              bookingId,
              templateType: "confirmation",
              forceResend: true,
            }),
          });

          // Also send SMS
          const smsUrl = `${supabaseUrl}/functions/v1/send-booking-sms`;
          await fetch(smsUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              bookingId,
              templateType: "confirmation",
            }),
          });
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata?.booking_id;

        if (bookingId) {
          console.log(`Payment failed for booking ${bookingId}`);

          // Record failed payment
          await supabase.from("payments").insert({
            booking_id: bookingId,
            user_id: paymentIntent.metadata?.user_id || "",
            amount: paymentIntent.amount / 100,
            payment_type: "rental",
            payment_method: "card",
            status: "failed",
            transaction_id: paymentIntent.id,
          });

          // Keep booking as pending - customer needs to pay at pickup
          await supabase
            .from("bookings")
            .update({ 
              status: "pending",
              notes: "Online payment failed - customer to pay at pickup" 
            })
            .eq("id", bookingId);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;

        // Find the payment by transaction ID
        const { data: payment } = await supabase
          .from("payments")
          .select("booking_id, user_id")
          .eq("transaction_id", paymentIntentId)
          .single();

        if (payment) {
          // Record refund
          await supabase.from("payments").insert({
            booking_id: payment.booking_id,
            user_id: payment.user_id,
            amount: -((charge.amount_refunded || 0) / 100),
            payment_type: "refund",
            payment_method: "card",
            status: "completed",
            transaction_id: charge.id,
          });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
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
