import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  getCorsHeaders, 
  checkRateLimit, 
  rateLimitResponse, 
  getClientIp,
  sanitizeEmail,
  isValidEmail,
  isValidPhone 
} from "../_shared/cors.ts";

/**
 * Contact Form Email Handler
 * 
 * Security features:
 * - Origin whitelist (no wildcard CORS)
 * - Multi-layer rate limiting (IP + email)
 * - Input sanitization and validation
 * - Honeypot field detection
 */

interface ContactEmailRequest {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  honeypot?: string; // Hidden field for bot detection
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const clientIp = getClientIp(req);

  try {
    // Rate limit by IP - max 5 contact form submissions per 10 minutes
    const ipRateLimit = checkRateLimit(`contact_ip:${clientIp}`, {
      windowMs: 10 * 60 * 1000, // 10 minutes
      maxRequests: 5,
      keyPrefix: "contact_ip",
    });

    if (!ipRateLimit.allowed) {
      console.warn(`Rate limit exceeded for contact form from IP: ${clientIp}`);
      return rateLimitResponse(ipRateLimit.resetAt, corsHeaders);
    }

    const body: ContactEmailRequest = await req.json();
    const { name, email, phone, subject, message, honeypot } = body;

    // Honeypot detection - if filled, it's likely a bot
    if (honeypot && honeypot.length > 0) {
      console.warn(`Honeypot triggered from IP: ${clientIp}`);
      // Return success to not alert the bot
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input validation
    const sanitizedEmail = sanitizeEmail(email);
    if (!isValidEmail(sanitizedEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (phone && !isValidPhone(phone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Length validation
    const safeName = name.trim().slice(0, 100);
    const safeSubject = subject.trim().slice(0, 200);
    const safeMessage = message.trim().slice(0, 5000);
    const safePhone = phone ? phone.replace(/[^\d+\-() ]/g, "").slice(0, 20) : "";

    if (safeName.length < 2 || safeSubject.length < 3 || safeMessage.length < 10) {
      return new Response(
        JSON.stringify({ error: "Input too short" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit by email - max 3 per hour
    const emailRateLimit = checkRateLimit(`contact_email:${sanitizedEmail}`, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
      keyPrefix: "contact_email",
    });

    if (!emailRateLimit.allowed) {
      console.warn(`Email rate limit exceeded for: ${sanitizedEmail}`);
      return rateLimitResponse(emailRateLimit.resetAt, corsHeaders);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    // Escape HTML in user inputs
    const escapeHtml = (str: string) => 
      str.replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");

    const escapedName = escapeHtml(safeName);
    const escapedSubject = escapeHtml(safeSubject);
    const escapedMessage = escapeHtml(safeMessage);

    // Send notification email to admin
    const adminEmailResponse = await resend.emails.send({
      from: "C2C Rental <onboarding@resend.dev>",
      to: ["info@c2crental.ca"],
      subject: `Contact Form: ${escapedSubject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
            <h1 style="color: #f97316; margin: 0;">New Contact Form Submission</h1>
          </div>
          
          <div style="padding: 30px; background: #ffffff;">
            <h2 style="color: #333; margin-top: 0;">Contact Details</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">Name:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${escapedName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><a href="mailto:${sanitizedEmail}">${sanitizedEmail}</a></td>
              </tr>
              ${safePhone ? `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Phone:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><a href="tel:${safePhone}">${safePhone}</a></td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Subject:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${escapedSubject}</td>
              </tr>
            </table>
            
            <h3 style="color: #333; margin-top: 25px;">Message:</h3>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; white-space: pre-wrap;">${escapedMessage}</div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <a href="mailto:${sanitizedEmail}?subject=Re: ${encodeURIComponent(safeSubject)}" 
                 style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                Reply to Customer
              </a>
            </div>
          </div>
          
          <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p>This email was sent from the C2C Rental contact form.</p>
            <p style="color: #999;">IP: ${clientIp}</p>
          </div>
        </div>
      `,
    });

    console.log("Admin notification sent:", adminEmailResponse);

    // Send confirmation email to customer
    const customerEmailResponse = await resend.emails.send({
      from: "C2C Rental <onboarding@resend.dev>",
      to: [sanitizedEmail],
      subject: "We received your message - C2C Rental",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
            <h1 style="color: #f97316; margin: 0;">Thank You, ${escapedName}!</h1>
          </div>
          
          <div style="padding: 30px; background: #ffffff;">
            <p style="font-size: 16px; color: #333;">
              We've received your message and appreciate you reaching out to us. 
              Our team will review your inquiry and get back to you within 24 hours.
            </p>
            
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="margin-top: 0; color: #333;">Your Message:</h3>
              <p style="color: #666;"><strong>Subject:</strong> ${escapedSubject}</p>
              <p style="color: #666; white-space: pre-wrap;">${escapedMessage}</p>
            </div>
            
            <p style="color: #333;">In the meantime, feel free to:</p>
            <ul style="color: #666;">
              <li>Browse our <a href="https://c4r.ca/search" style="color: #f97316;">available vehicles</a></li>
              <li>Check out our <a href="https://c4r.ca/locations" style="color: #f97316;">pickup locations</a></li>
            </ul>
          </div>
          
          <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p>C2C Rental | Premium Car Rental</p>
            <p>This is an automated confirmation. Please do not reply to this email.</p>
          </div>
        </div>
      `,
    });

    console.log("Customer confirmation sent:", customerEmailResponse);

    // Log for analytics (optional - create simple log)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase.from("notification_logs").insert({
        channel: "email",
        notification_type: "contact_form",
        idempotency_key: `contact_${sanitizedEmail}_${Date.now()}`,
        status: "sent",
        sent_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Your message has been sent successfully" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-contact-email:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send message. Please try again later." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
