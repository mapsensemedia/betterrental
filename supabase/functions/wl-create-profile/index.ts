/**
 * wl-create-profile — Create a Worldline/Bambora payment profile (tokenized card)
 * 
 * Authenticated users only. Saves a card for future use.
 */

import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { getUserOrThrow, getAdminClient, AuthError, authErrorResponse } from "../_shared/auth.ts";
import { worldlineRequest, parseWorldlineError } from "../_shared/worldline.ts";
import { createLogger } from "../_shared/logger.ts";

interface BamboraProfileResponse {
  customer_code: string;
  message: string;
  code: number;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  const log = createLogger("wl-create-profile");

  try {
    const user = await getUserOrThrow(req, corsHeaders);
    log.setUser(user.userId);

    const { token, name, email } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = getAdminClient();

    // Check if user already has a profile
    const { data: existingProfile } = await supabase
      .from("payment_profiles")
      .select("worldline_customer_code")
      .eq("user_id", user.userId)
      .limit(1)
      .maybeSingle();

    if (existingProfile?.worldline_customer_code) {
      // Add card to existing profile
      const res = await log.timed("bambora_add_card", () =>
        worldlineRequest("POST", `/profiles/${existingProfile.worldline_customer_code}/cards`, {
          token: { code: token, name: name || "Cardholder" },
        }),
      );

      if (!res.ok) {
        return new Response(
          JSON.stringify({ error: parseWorldlineError(res.data) }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      log.info("Card added to existing profile", { customer_code: existingProfile.worldline_customer_code });

      return new Response(
        JSON.stringify({ success: true, customerCode: existingProfile.worldline_customer_code }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create new profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.userId)
      .single();

    const res = await log.timed("bambora_create_profile", () =>
      worldlineRequest<BamboraProfileResponse>("POST", "/profiles", {
        token: { code: token, name: name || "Cardholder" },
        billing: {
          name: name || profile?.full_name || "Cardholder",
          email_address: email || profile?.email || "",
        },
      }),
    );

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: parseWorldlineError(res.data) }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const customerCode = res.data.customer_code;

    // Store in our DB
    await supabase.from("payment_profiles").insert({
      user_id: user.userId,
      worldline_customer_code: customerCode,
      is_default: true,
    });

    log.info("Profile created", { customer_code: customerCode });

    return new Response(
      JSON.stringify({ success: true, customerCode }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);
    log.error("Profile creation failed", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
