import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Fetch booking details with single() for proper typing
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        id, booking_code, start_at, end_at, status, total_amount, user_id,
        locations!inner (name, address),
        vehicles!inner (make, model, year)
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

    // Fetch user profile for phone number (fallback to auth user metadata)
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone, full_name")
      .eq("id", booking.user_id)
      .maybeSingle();

    let toPhone = profile?.phone || "";

    if (!toPhone) {
      const { data: authUser } = await supabase.auth.admin.getUserById(booking.user_id);
      const metaPhone = authUser?.user?.user_metadata?.phone;

      if (typeof metaPhone === "string" && metaPhone.trim()) {
        toPhone = metaPhone.trim();
        console.log("Fetched phone from auth.users metadata");
      }
    }

    if (!toPhone) {
      console.log("No phone number for user");
      return new Response(
        JSON.stringify({ error: "No phone number on file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
    const startDate = new Date(booking.start_at).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    // Access related data - cast to any for flexibility
    const vehicleData = booking.vehicles as any;
    const locationData = booking.locations as any;

    const vehicleName = `${vehicleData?.year} ${vehicleData?.make} ${vehicleData?.model}`;
    const locationName = locationData?.name || "our location";

    // Build message based on template
    let message = "";
    
    // Get the app URL for booking links
    const appUrl = Deno.env.get("APP_URL") || "https://c2crental.ca";
    const bookingLink = `${appUrl}/booking/${bookingId}`;

    switch (templateType) {
      case "confirmation":
        message = `C2C Rental: Booking ${booking.booking_code} confirmed!\n\n${vehicleName}\nPickup: ${startDate}\nLocation: ${locationName}\n\nUPLOAD your driver's license here:\n${bookingLink}`;
        break;
      case "update":
        message = `C2C Rental: Booking ${booking.booking_code} updated.\n\nPickup: ${startDate}\nLocation: ${locationName}\n\nView details:\n${bookingLink}`;
        break;
      case "cancellation":
        message = `C2C Rental: Booking ${booking.booking_code} cancelled.\n\nQuestions? Contact us.`;
        break;
      case "reminder":
        message = `C2C Rental: Pickup tomorrow!\n\n${vehicleName}\n${startDate}\nLocation: ${locationName}\n\nView booking:\n${bookingLink}`;
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
