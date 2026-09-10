import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BRAND, formatPhoneForMessage, fmtDateTimeVan } from "../_shared/sms-format.ts";
import { toE164 } from "../_shared/phone.ts";
import { failureKey, resolveBookingContact, writeNotificationLog } from "../_shared/notify-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendSmsRequest {
  bookingId: string;
  templateType: "confirmation" | "update" | "cancellation" | "reminder";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!twilioSid || !twilioToken || !twilioFrom) {
      console.warn("Twilio credentials not configured - skipping SMS");
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "SMS service not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { bookingId, templateType }: SendSmsRequest = await req.json();

    if (!bookingId || !templateType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // bookings has two FKs to locations (pickup + return) — name the pickup one
    // explicitly, otherwise PostgREST rejects the embed as ambiguous.
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        id, booking_code, start_at, end_at, status, total_amount, user_id, vehicle_id,
        customer_id, pickup_contact_name, pickup_contact_phone,
        locations!bookings_location_id_fkey (name, address, phone)
      `)
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking) {
      const detail = bookingError?.message || "booking row not found";
      console.error(`[send-booking-sms] booking lookup failed for ${bookingId}: ${detail}`, bookingError);
      await writeNotificationLog(supabase, {
        channel: "sms",
        notificationType: templateType,
        bookingId,
        idempotencyKey: failureKey(`sms_${bookingId}_${templateType}`),
        status: "failed",
        errorMessage: `booking_lookup_failed: ${detail}`,
      });
      return new Response(
        JSON.stringify({ error: "booking_lookup_failed", details: detail }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch vehicle category separately (no FK between bookings and vehicle_categories)
    const { data: vehicleCategory } = await supabase
      .from("vehicle_categories")
      .select("name")
      .eq("id", booking.vehicle_id)
      .maybeSingle();

    // Contact details come from the profile, the customers record (guest /
    // walk-in) or the pickup contact fields — in that order.
    const contact = await resolveBookingContact(supabase, booking);
    const toPhone = toE164(contact.phone);

    if (!toPhone) {
      const reason = contact.phone ? `invalid_phone: ${contact.phone}` : "no_phone_on_file";
      console.error(`[send-booking-sms] ${reason} for booking ${booking.booking_code}`);
      await writeNotificationLog(supabase, {
        channel: "sms",
        notificationType: templateType,
        bookingId,
        userId: booking.user_id,
        idempotencyKey: failureKey(`sms_${bookingId}_${templateType}`),
        status: "failed",
        errorMessage: reason,
      });
      return new Response(
        JSON.stringify({ error: reason }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create idempotency key
    const idempotencyKey = `sms_${bookingId}_${templateType}_${new Date().toISOString().slice(0, 10)}`;

    // Check for existing notification
    const { data: existing } = await supabase
      .from("notification_logs")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .single();

    if (existing) {
      console.log("SMS already sent for this booking and template type today");
      return new Response(
        JSON.stringify({ message: "SMS already sent", duplicate: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format dates
    const startDate = fmtDateTimeVan(booking.start_at);
    const returnDate = fmtDateTimeVan(booking.end_at);

    // Access related data
    const locationData = booking.locations as any;

    const vehicleName = vehicleCategory?.name || "Vehicle";
    const locationName = locationData?.name || "our location";

    // Location-specific contact number
    const contactPhone = formatPhoneForMessage(locationData?.phone);

    // Build message based on template
    let message = "";
    
    // Get the app URL for booking links
    const appUrl = Deno.env.get("APP_URL") || "https://c2crental.ca";
    const bookingLink = `${appUrl}/booking/${bookingId}`;

    switch (templateType) {
      case "confirmation":
        message = `${BRAND}: Booking ${booking.booking_code} confirmed!\n\n${vehicleName}\nPickup: ${startDate}\nReturn: ${returnDate}\nLocation: ${locationName}\n\nQuestions? Call ${contactPhone}\n\nView details:\n${bookingLink}`;
        break;
      case "update":
        message = `${BRAND}: Booking ${booking.booking_code} updated.\n\nPickup: ${startDate}\nReturn: ${returnDate}\nLocation: ${locationName}\n\nQuestions? Call ${contactPhone}\n\nView details:\n${bookingLink}`;
        break;
      case "cancellation":
        message = `${BRAND}: Booking ${booking.booking_code} cancelled.\n\nQuestions? Call ${contactPhone}`;
        break;
      case "reminder":
        message = `${BRAND}: Pickup tomorrow for booking ${booking.booking_code}!\n\n${vehicleName}\nPickup: ${startDate}\nReturn: ${returnDate}\nLocation: ${locationName}\n\nQuestions? Call ${contactPhone}\n\nView booking:\n${bookingLink}`;
        break;
    }


    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    const authHeader = btoa(`${twilioSid}:${twilioToken}`);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: toPhone,
        From: twilioFrom,
        Body: message,
      }),
    });

    const twilioResult = await twilioResponse.json();

    // Log the notification
    await supabase.from("notification_logs").insert({
      channel: "sms",
      notification_type: templateType,
      booking_id: bookingId,
      user_id: booking.user_id,
      idempotency_key: idempotencyKey,
      status: twilioResponse.ok ? "sent" : "failed",
      provider_id: twilioResult.sid || null,
      error_message: twilioResponse.ok ? null : JSON.stringify(twilioResult),
      sent_at: twilioResponse.ok ? new Date().toISOString() : null,
    });

    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioResult);
      return new Response(
        JSON.stringify({ error: "Failed to send SMS", details: twilioResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("SMS sent successfully:", twilioResult.sid);

    return new Response(
      JSON.stringify({ success: true, messageId: twilioResult.sid }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-booking-sms:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
