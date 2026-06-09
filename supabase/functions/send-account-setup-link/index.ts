/**
 * send-account-setup-link — Staff-only: email a walk-in customer
 * a secure link to set their password and access their booking online.
 *
 * Walk-in bookings create an unconfirmed auth user with a random password.
 * This function generates a Supabase recovery link so the customer can set
 * their own password (lands on /reset-password), then continue to their
 * booking dashboard.
 */
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { validateAuth, getAdminClient, isAdminOrStaff } from "../_shared/auth.ts";

const FALLBACK_ORIGIN = "https://www.c2crental.ca";

function resolveOrigin(req: Request): string {
  const origin = req.headers.get("Origin");
  if (origin && /^https?:\/\//.test(origin)) return origin;
  return FALLBACK_ORIGIN;
}

function buildEmailHtml(opts: {
  customerName: string;
  bookingCode: string;
  actionUrl: string;
  bookingUrl: string;
}): string {
  const { customerName, bookingCode, actionUrl, bookingUrl } = opts;
  return `<!DOCTYPE html>
<html><body style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; background:#f6f7f9; padding:24px; color:#0f172a;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb;">
    <tr><td style="padding:28px 32px 8px 32px;">
      <h1 style="margin:0 0 8px 0; font-size:20px;">Set up your C2C Rental account</h1>
      <p style="margin:0; color:#475569; font-size:14px;">Hi ${customerName || "there"}, your walk-in booking <strong>${bookingCode}</strong> is confirmed.</p>
    </td></tr>
    <tr><td style="padding:16px 32px 8px 32px;">
      <p style="margin:0 0 16px 0; font-size:14px; line-height:1.55;">
        Click below to set a password so you can view your booking, manage your rental, and access invoices online.
      </p>
      <p style="margin:0 0 20px 0;">
        <a href="${actionUrl}" style="display:inline-block; background:#0f172a; color:#ffffff; padding:12px 20px; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px;">Set my password</a>
      </p>
      <p style="margin:0 0 6px 0; color:#64748b; font-size:12px;">After setting your password, you can view your booking here:</p>
      <p style="margin:0 0 20px 0;"><a href="${bookingUrl}" style="color:#0f172a; font-size:13px;">${bookingUrl}</a></p>
      <p style="margin:0; color:#94a3b8; font-size:12px;">
        This link expires in 1 hour for your security. If you didn't expect this email, you can safely ignore it.
      </p>
    </td></tr>
    <tr><td style="padding:20px 32px 28px 32px; border-top:1px solid #f1f5f9; color:#94a3b8; font-size:12px;">
      C2C Rental · +1 (604) 763-4242
    </td></tr>
  </table>
</body></html>`;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  try {
    const auth = await validateAuth(req);
    if (!auth.authenticated || !auth.userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!(await isAdminOrStaff(auth.userId))) {
      return new Response(JSON.stringify({ error: "Forbidden: staff role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { bookingId } = await req.json();
    if (!bookingId || typeof bookingId !== "string") {
      return new Response(JSON.stringify({ error: "bookingId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = getAdminClient();

    // Fetch booking + customer info
    const { data: booking, error: bErr } = await admin
      .from("bookings")
      .select("id, booking_code, user_id, customer_id")
      .eq("id", bookingId)
      .maybeSingle();

    if (bErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get email + name (prefer profiles, fall back to customers)
    let email: string | null = null;
    let fullName = "";

    if (booking.user_id) {
      const { data: profile } = await admin
        .from("profiles")
        .select("email, full_name")
        .eq("id", booking.user_id)
        .maybeSingle();
      if (profile?.email) {
        email = profile.email;
        fullName = profile.full_name || "";
      }
    }

    if (!email && booking.customer_id) {
      const { data: cust } = await admin
        .from("customers")
        .select("email, full_name")
        .eq("id", booking.customer_id)
        .maybeSingle();
      if (cust?.email) {
        email = cust.email;
        fullName = cust.full_name || fullName;
      }
    }

    if (!email) {
      return new Response(JSON.stringify({ error: "No customer email on file" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = resolveOrigin(req);
    const bookingUrl = `${origin}/booking/${booking.id}`;

    // Generate a recovery (password reset) link — works whether the email is
    // confirmed yet or not. The user lands on /reset-password to set a password.
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${origin}/reset-password`,
      },
    });

    if (linkErr || !linkData?.properties?.action_link) {
      console.error("[send-account-setup-link] generateLink failed:", linkErr);
      return new Response(
        JSON.stringify({ error: "Failed to generate setup link", details: linkErr?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const actionUrl = linkData.properties.action_link;
    const html = buildEmailHtml({
      customerName: fullName.split(" ")[0] || "",
      bookingCode: booking.booking_code || "",
      actionUrl,
      bookingUrl,
    });

    // Send via Resend
    const subject = `Set up your C2C Rental account — booking ${booking.booking_code}`;
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "C2C Rental <onboarding@resend.dev>",
        to: [email],
        subject,
        html,
      }),
    });

    const resendBody = await resendRes.json().catch(() => ({}));
    if (!resendRes.ok) {
      console.error("[send-account-setup-link] Resend error:", resendBody);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resendBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Best-effort notification log
    try {
      await admin.from("notification_logs").insert({
        booking_id: booking.id,
        user_id: booking.user_id,
        channel: "email",
        notification_type: "account_setup_invite",
        status: "sent",
        recipient: email,
      });
    } catch (logErr) {
      console.warn("[send-account-setup-link] notification_logs insert failed (non-fatal):", logErr);
    }

    return new Response(
      JSON.stringify({ success: true, sentTo: email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    console.error("[send-account-setup-link] Error:", msg, e);
    return new Response(JSON.stringify({ error: "server_error", message: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
