import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendSupportSmsRequest {
  ticketId: string;
  customerId?: string;
  guestPhone?: string;
  guestName?: string;
  ticketNumber: string;
  subject?: string;
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

    const { ticketId, customerId, guestPhone, guestName, ticketNumber, subject }: SendSupportSmsRequest = await req.json();

    if (!ticketId || !ticketNumber) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine the phone number to send to
    let toPhone = guestPhone || "";
    let customerName = guestName || "Customer";

    // If we have a customer_id, fetch their profile
    if (customerId && !toPhone) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone, full_name")
        .eq("id", customerId)
        .maybeSingle();

      toPhone = profile?.phone || "";
      customerName = profile?.full_name || customerName;

      // Fallback to auth user metadata
      if (!toPhone) {
        const { data: authUser } = await supabase.auth.admin.getUserById(customerId);
        const metaPhone = authUser?.user?.user_metadata?.phone;

        if (typeof metaPhone === "string" && metaPhone.trim()) {
          toPhone = metaPhone.trim();
          console.log("Fetched phone from auth.users metadata");
        }
      }
    }

    if (!toPhone) {
      console.log("No phone number available for ticket notification");
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "No phone number on file" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create idempotency key for this ticket's chat start notification
    const idempotencyKey = `support_chat_start_${ticketId}`;

    // Check for existing notification - only send once per ticket
    const { data: existing } = await supabase
      .from("notification_logs")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) {
      console.log("Support chat notification already sent for this ticket");
      return new Response(
        JSON.stringify({ success: true, duplicate: true, message: "Notification already sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the app URL for ticket links
    const appUrl = Deno.env.get("APP_URL") || "https://c2crental.ca";
    const ticketLink = `${appUrl}/dashboard`;

    // Build the message
    const subjectLine = subject ? `\nRe: ${subject.substring(0, 50)}${subject.length > 50 ? '...' : ''}` : '';
    const message = `C2C Rental Support: Your ticket ${ticketNumber} has a new reply from our team.${subjectLine}\n\nLog in to your dashboard to view and reply:\n${ticketLink}`;

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
      notification_type: "support_chat_started",
      booking_id: null,
      user_id: customerId || null,
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

    console.log("Support SMS sent successfully:", twilioResult.sid);

    return new Response(
      JSON.stringify({ success: true, messageId: twilioResult.sid }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-support-sms:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
