import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReceiptRequest {
  bookingId: string;
  depositReleased: number;
  depositWithheld: number;
  withholdReason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { bookingId, depositReleased, depositWithheld, withholdReason }: ReceiptRequest = await req.json();

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "Missing bookingId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing receipt (idempotency)
    const { data: existingReceipt } = await supabase
      .from("receipts")
      .select("id, receipt_number")
      .eq("booking_id", bookingId)
      .eq("status", "issued")
      .maybeSingle();

    if (existingReceipt) {
      console.log("Receipt already exists:", existingReceipt.receipt_number);
      return new Response(
        JSON.stringify({ success: true, alreadyExists: true, receiptId: existingReceipt.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch booking with all related data
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        id, booking_code, user_id, daily_rate, total_days, subtotal, 
        tax_amount, total_amount, deposit_amount, start_at, end_at,
        actual_return_at, young_driver_fee,
        vehicles!inner (make, model, year),
        locations!inner (name, address, city, phone)
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

    // Fetch add-ons
    const { data: addOns } = await supabase
      .from("booking_add_ons")
      .select("price, quantity, add_on:add_ons(name)")
      .eq("booking_id", bookingId);

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, phone")
      .eq("id", booking.user_id)
      .single();

    let userEmail = profile?.email;
    let userName = profile?.full_name;

    if (!userEmail) {
      const { data: authUser } = await supabase.auth.admin.getUserById(booking.user_id);
      userEmail = authUser?.user?.email;
      userName = authUser?.user?.user_metadata?.full_name || userName;
    }

    // Tax rates (must match frontend)
    const PST_RATE = 0.07;
    const GST_RATE = 0.05;
    const PVRT_DAILY_FEE = 1.50;
    const ACSRCH_DAILY_FEE = 1.00;

    // Build line items
    const lineItems: { description: string; quantity: number; unitPrice: number; total: number }[] = [];

    // Base rental
    lineItems.push({
      description: `Vehicle Rental (${booking.total_days} days @ $${booking.daily_rate}/day)`,
      quantity: booking.total_days,
      unitPrice: Number(booking.daily_rate),
      total: Number(booking.subtotal),
    });

    // Young driver fee (daily)
    if (booking.young_driver_fee && Number(booking.young_driver_fee) > 0) {
      const youngFeePerDay = Number(booking.young_driver_fee) / booking.total_days;
      lineItems.push({
        description: `Young Driver Fee (${booking.total_days} days @ $${youngFeePerDay.toFixed(2)}/day)`,
        quantity: booking.total_days,
        unitPrice: youngFeePerDay,
        total: Number(booking.young_driver_fee),
      });
    }

    // Daily regulatory fees
    const pvrtTotal = PVRT_DAILY_FEE * booking.total_days;
    const acsrchTotal = ACSRCH_DAILY_FEE * booking.total_days;
    
    lineItems.push({
      description: `PVRT (${booking.total_days} days @ $${PVRT_DAILY_FEE}/day)`,
      quantity: booking.total_days,
      unitPrice: PVRT_DAILY_FEE,
      total: pvrtTotal,
    });
    
    lineItems.push({
      description: `ACSRCH (${booking.total_days} days @ $${ACSRCH_DAILY_FEE}/day)`,
      quantity: booking.total_days,
      unitPrice: ACSRCH_DAILY_FEE,
      total: acsrchTotal,
    });

    // Add-ons
    (addOns || []).forEach((addon: any) => {
      lineItems.push({
        description: addon.add_on?.name || "Add-on",
        quantity: addon.quantity || 1,
        unitPrice: Number(addon.price),
        total: Number(addon.price) * (addon.quantity || 1),
      });
    });

    // Deposit section
    const depositAmount = Number(booking.deposit_amount) || 0;
    if (depositAmount > 0) {
      lineItems.push({
        description: "Security Deposit (Collected)",
        quantity: 1,
        unitPrice: depositAmount,
        total: depositAmount,
      });

      if (depositReleased > 0) {
        lineItems.push({
          description: "Security Deposit (Released)",
          quantity: 1,
          unitPrice: -depositReleased,
          total: -depositReleased,
        });
      }

      if (depositWithheld > 0) {
        lineItems.push({
          description: `Deposit Withheld${withholdReason ? `: ${withholdReason}` : ""}`,
          quantity: 1,
          unitPrice: 0,
          total: 0, // Not charged extra, just retained
        });
      }
    }

    // Calculate tax breakdown
    const subtotal = Number(booking.subtotal) + pvrtTotal + acsrchTotal + Number(booking.young_driver_fee || 0);
    const pstAmount = subtotal * PST_RATE;
    const gstAmount = subtotal * GST_RATE;
    const totalTax = pstAmount + gstAmount;

    // Calculate totals
    const totals = {
      subtotal: subtotal,
      pst: pstAmount,
      gst: gstAmount,
      tax: totalTax,
      total: Number(booking.total_amount),
      depositCollected: depositAmount,
      depositReleased: depositReleased,
      depositWithheld: depositWithheld,
      balanceDue: 0,
      dailyFees: {
        pvrt: pvrtTotal,
        acsrch: acsrchTotal,
      },
    };

    // Generate receipt number
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const receiptNumber = `REC-${timestamp}-${random}`;

    // Create receipt record
    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .insert({
        booking_id: bookingId,
        receipt_number: receiptNumber,
        line_items_json: lineItems,
        totals_json: totals,
        notes: withholdReason ? `Deposit withheld: ${withholdReason}` : null,
        created_by: booking.user_id, // System-generated but linked to customer
        status: "issued",
        issued_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (receiptError) {
      console.error("Failed to create receipt:", receiptError);
      throw new Error("Failed to create receipt record");
    }

    // Log receipt event
    await supabase.from("receipt_events").insert({
      receipt_id: receipt.id,
      action: "auto_generated",
      actor_user_id: booking.user_id,
      meta_json: { trigger: "return_deposit_processed" },
    });

    // Log audit entry
    await supabase.from("audit_logs").insert({
      user_id: booking.user_id,
      action: "receipt_generated",
      entity_type: "receipt",
      entity_id: receipt.id,
      new_data: { booking_id: bookingId, receipt_number: receiptNumber, trigger: "auto" },
    });

    console.log("Receipt created:", receiptNumber);

    // Send receipt email if Resend is configured
    let emailSent = false;
    let emailError = null;

    if (resendApiKey && userEmail) {
      try {
        const vehicleData = booking.vehicles as any;
        const locationData = booking.locations as any;
        const vehicleName = `${vehicleData?.year} ${vehicleData?.make} ${vehicleData?.model}`;

        const formatDate = (dateStr: string) => {
          const date = new Date(dateStr);
          return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
        };

        const lineItemsHtml = lineItems.map(item => `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e4e4e7; color: #52525b;">${item.description}</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e4e4e7; text-align: right; color: ${item.total < 0 ? '#10b981' : '#18181b'}; font-weight: 500;">
              ${item.total < 0 ? '-' : ''}$${Math.abs(item.total).toFixed(2)}
            </td>
          </tr>
        `).join("");

        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 28px; font-weight: 700;">C2C Rental</h1>
                <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">Premium Car Rentals</p>
              </div>

              <!-- Receipt Header -->
              <div style="padding: 30px; background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <h2 style="margin: 0 0 5px; color: #18181b; font-size: 20px;">Rental Receipt</h2>
                    <p style="margin: 0; color: #71717a; font-size: 14px;">Receipt #${receiptNumber}</p>
                  </div>
                  <div style="text-align: right;">
                    <p style="margin: 0; color: #10b981; font-size: 20px; font-weight: 700;">PAID</p>
                  </div>
                </div>
              </div>

              <!-- Booking Details -->
              <div style="padding: 30px;">
                <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr>
                      <td style="padding: 8px 0; color: #71717a;">Booking Code</td>
                      <td style="padding: 8px 0; color: #18181b; font-weight: 600; text-align: right; font-family: monospace;">${booking.booking_code}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #71717a;">Customer</td>
                      <td style="padding: 8px 0; color: #18181b; text-align: right;">${userName || userEmail}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #71717a;">Vehicle</td>
                      <td style="padding: 8px 0; color: #18181b; text-align: right;">${vehicleName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #71717a;">Pickup</td>
                      <td style="padding: 8px 0; color: #18181b; text-align: right;">${formatDate(booking.start_at)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #71717a;">Return</td>
                      <td style="padding: 8px 0; color: #18181b; text-align: right;">${formatDate(booking.actual_return_at || booking.end_at)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #71717a;">Location</td>
                      <td style="padding: 8px 0; color: #18181b; text-align: right;">${locationData?.name || 'N/A'}</td>
                    </tr>
                  </table>
                </div>

                <!-- Line Items -->
                <h3 style="margin: 0 0 15px; color: #18181b; font-size: 16px;">Charges</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  ${lineItemsHtml}
                </table>

                <!-- Totals -->
                <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #18181b;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr>
                      <td style="padding: 8px 0; color: #71717a;">Subtotal</td>
                      <td style="padding: 8px 0; color: #18181b; text-align: right;">$${totals.subtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #71717a;">Tax</td>
                      <td style="padding: 8px 0; color: #18181b; text-align: right;">$${totals.tax.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; color: #18181b; font-size: 18px; font-weight: 700;">Total Paid</td>
                      <td style="padding: 12px 0; color: #18181b; text-align: right; font-size: 18px; font-weight: 700;">$${totals.total.toFixed(2)}</td>
                    </tr>
                  </table>
                </div>

                ${depositAmount > 0 ? `
                <div style="margin-top: 25px; padding: 20px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                  <h4 style="margin: 0 0 10px; color: #166534; font-size: 14px;">Security Deposit</h4>
                  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr>
                      <td style="padding: 5px 0; color: #166534;">Collected</td>
                      <td style="padding: 5px 0; color: #166534; text-align: right;">$${depositAmount.toFixed(2)}</td>
                    </tr>
                    ${depositReleased > 0 ? `
                    <tr>
                      <td style="padding: 5px 0; color: #166534;">Released</td>
                      <td style="padding: 5px 0; color: #166534; text-align: right;">$${depositReleased.toFixed(2)}</td>
                    </tr>
                    ` : ""}
                    ${depositWithheld > 0 ? `
                    <tr>
                      <td style="padding: 5px 0; color: #dc2626;">Withheld</td>
                      <td style="padding: 5px 0; color: #dc2626; text-align: right;">$${depositWithheld.toFixed(2)}</td>
                    </tr>
                    ` : ""}
                  </table>
                </div>
                ` : ""}

                <p style="margin: 30px 0 0; color: #52525b; font-size: 14px; line-height: 1.6;">
                  Thank you for choosing C2C Rental! We hope you had a great experience. If you have any questions about this receipt, please don't hesitate to contact us.
                </p>
              </div>

              <!-- Footer -->
              <div style="background-color: #18181b; padding: 30px; text-align: center;">
                <p style="margin: 0 0 5px; color: white; font-size: 14px;">${locationData?.name || 'C2C Rental'}</p>
                <p style="margin: 0 0 10px; color: #a1a1aa; font-size: 12px;">${locationData?.address || ''}, ${locationData?.city || ''}</p>
                ${locationData?.phone ? `<p style="margin: 0 0 10px; color: #a1a1aa; font-size: 12px;">Phone: ${locationData.phone}</p>` : ""}
                <p style="margin: 15px 0 0; color: #71717a; font-size: 11px;">© ${new Date().getFullYear()} C2C Rental. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "C2C Rental <onboarding@resend.dev>",
            to: [userEmail],
            subject: `Your Receipt - Booking ${booking.booking_code}`,
            html: htmlContent,
          }),
        });

        const emailData = await emailResponse.json();

        if (emailResponse.ok) {
          emailSent = true;
          
          // Log successful email
          await supabase.from("notification_logs").insert({
            channel: "email",
            notification_type: "receipt_sent",
            booking_id: bookingId,
            user_id: booking.user_id,
            idempotency_key: `receipt_email_${receipt.id}_${Date.now()}`,
            status: "sent",
            provider_id: emailData?.id || null,
            sent_at: new Date().toISOString(),
          });

          await supabase.from("audit_logs").insert({
            user_id: booking.user_id,
            action: "receipt_emailed",
            entity_type: "receipt",
            entity_id: receipt.id,
            new_data: { email: userEmail, success: true },
          });

          console.log("Receipt email sent:", emailData?.id);
        } else {
          emailError = emailData;
          console.error("Receipt email failed:", emailData);

          await supabase.from("notification_logs").insert({
            channel: "email",
            notification_type: "receipt_sent",
            booking_id: bookingId,
            user_id: booking.user_id,
            idempotency_key: `receipt_email_${receipt.id}_${Date.now()}`,
            status: "failed",
            error_message: JSON.stringify(emailData),
          });

          await supabase.from("audit_logs").insert({
            user_id: booking.user_id,
            action: "receipt_emailed",
            entity_type: "receipt",
            entity_id: receipt.id,
            new_data: { email: userEmail, success: false, error: emailData },
          });
        }
      } catch (err: any) {
        emailError = err.message;
        console.error("Email send error:", err);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        receiptId: receipt.id, 
        receiptNumber,
        emailSent,
        emailError: emailError ? String(emailError) : null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in generate-return-receipt:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
