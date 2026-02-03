import {
  getCorsHeaders,
  handleCorsPreflightRequest,
} from "../_shared/cors.ts";
import { validateAuth, getAdminClient } from "../_shared/auth.ts";

interface ClaimDeliveryRequest {
  bookingId: string;
}

async function hasDriverRole(userId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "driver")
    .limit(1)
    .maybeSingle();

  return !error && !!data;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const auth = await validateAuth(req);
    if (!auth.authenticated || !auth.userId) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ClaimDeliveryRequest = await req.json();
    if (!body?.bookingId) {
      return new Response(JSON.stringify({ success: false, error: "Missing bookingId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isDriver = await hasDriverRole(auth.userId);
    if (!isDriver) {
      return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = getAdminClient();

    // Claim only unassigned delivery bookings.
    const { data: updated, error: updateError } = await admin
      .from("bookings")
      .update({
        assigned_driver_id: auth.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.bookingId)
      .is("assigned_driver_id", null)
      .not("pickup_address", "is", null)
      .in("status", ["pending", "confirmed", "active"])
      .select("id, assigned_driver_id")
      .maybeSingle();

    if (updateError) {
      console.error("[claim-delivery] update failed:", updateError);
      return new Response(JSON.stringify({ success: false, error: "Failed to claim" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!updated) {
      // Either not found, not a delivery booking, already claimed, or not in claimable status.
      return new Response(
        JSON.stringify({
          success: false,
          error: "Not claimable",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        bookingId: updated.id,
        assignedDriverId: updated.assigned_driver_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[claim-delivery] unexpected error:", e);
    return new Response(JSON.stringify({ success: false, error: "Server error" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
