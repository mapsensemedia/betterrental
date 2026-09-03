import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateAuth, isAdminOrStaff } from "../_shared/auth.ts";
import { requireBookingLocationOrThrow } from "../_shared/location-guard.ts";

/**
 * Force Close Booking
 * 
 * Admin-only endpoint to close an overdue or stuck booking without
 * running the standard return workflow. Bypasses seatbelt triggers
 * by using service_role.
 * 
 * Does NOT:
 * - Trigger payment processing or deposit release
 * - Run billing/repricing logic
 * - Send customer-facing notifications
 */

interface ForceCloseRequest {
  bookingId: string;
  actualReturnAt: string;        // ISO timestamp
  returnFuelLevel?: number;      // percentage (0-100)
  returnOdometer?: number;       // km reading
  closingImageUrl?: string;      // storage URL for closing photo
  adminNote?: string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Auth check
    const authResult = await validateAuth(req);
    if (!authResult.authenticated || !authResult.userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasAccess = await isAdminOrStaff(authResult.userId);
    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin/Staff only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ForceCloseRequest = await req.json();
    const { bookingId, actualReturnAt, returnFuelLevel, returnOdometer, closingImageUrl, adminNote } = body;

    if (!bookingId || !actualReturnAt) {
      return new Response(
        JSON.stringify({ error: "bookingId and actualReturnAt are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Branch scope: managers may only act on bookings from their own location.
    await requireBookingLocationOrThrow(authResult.userId, bookingId);

    // Fetch booking
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, booking_code, status, assigned_unit_id, notes")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Block if already completed or cancelled
    if (booking.status === "completed" || booking.status === "cancelled") {
      return new Response(
        JSON.stringify({ error: `Booking is already ${booking.status}` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const closingNote = adminNote || "Manually closed by admin — return processed outside standard flow.";
    const existingNotes = booking.notes ? `${booking.notes}\n---\n${closingNote}` : closingNote;

    // Update booking to completed (service_role bypasses seatbelt triggers)
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "completed",
        actual_return_at: actualReturnAt,
        return_state: "closeout_done",
        notes: existingNotes,
        account_closed_at: new Date().toISOString(),
        account_closed_by: authResult.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Failed to update booking:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update booking", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record return inspection metrics (fuel + odometer)
    if (returnFuelLevel !== undefined || returnOdometer !== undefined) {
      const { error: metricsError } = await supabase
        .from("inspection_metrics")
        .insert({
          booking_id: bookingId,
          phase: "return",
          fuel_level: returnFuelLevel ?? null,
          odometer: returnOdometer ?? null,
          recorded_by: authResult.userId,
          exterior_notes: "Recorded via admin force-close",
        });

      if (metricsError) {
        console.error("Failed to insert inspection metrics:", metricsError);
        // Non-fatal — booking is already closed
      }
    }

    // Store closing image as a condition photo if provided
    if (closingImageUrl) {
      const { error: photoError } = await supabase
        .from("condition_photos")
        .insert({
          booking_id: bookingId,
          phase: "return",
          photo_type: "closing_image",
          photo_url: closingImageUrl,
          captured_by: authResult.userId,
          notes: "Closing image — admin force-close",
        });

      if (photoError) {
        console.error("Failed to insert condition photo:", photoError);
      }
    }

    // Release vehicle unit back to available
    if (booking.assigned_unit_id) {
      const { error: releaseError } = await supabase
        .from("vehicle_units")
        .update({ status: "available", updated_at: new Date().toISOString() })
        .eq("id", booking.assigned_unit_id);

      if (releaseError) {
        console.error("Failed to release vehicle unit:", releaseError);
      }
    }

    // Promote any still-authorized rental payment rows to 'completed' so finance
    // dashboards / customer pass reflect reality (Worldline auto-settles).
    try {
      const { data: authRentals } = await supabase
        .from("payments")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("payment_type", "rental")
        .eq("status", "authorized");

      if (authRentals && authRentals.length > 0) {
        await supabase
          .from("payments")
          .update({ status: "completed" })
          .in("id", authRentals.map((r: { id: string }) => r.id));

        await supabase
          .from("bookings")
          .update({ wl_auth_status: "completed" })
          .eq("id", bookingId);
      }
    } catch (promoteErr) {
      console.warn("Failed to auto-complete authorized rental payments:", promoteErr);
    }

    // Audit log
    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        action: "admin_force_close",
        entity_type: "booking",
        entity_id: bookingId,
        user_id: authResult.userId,
        old_data: { status: booking.status },
        new_data: {
          status: "completed",
          actual_return_at: actualReturnAt,
          return_fuel_level: returnFuelLevel,
          return_odometer: returnOdometer,
          closing_image: closingImageUrl ? true : false,
          admin_note: closingNote,
        },
      });

    if (auditError) {
      console.error("Failed to write audit log:", auditError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        bookingCode: booking.booking_code,
        message: `Booking ${booking.booking_code} marked as closed.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Force close error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
