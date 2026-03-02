/**
 * wl-get-profile — Fetch saved payment profiles for the authenticated user
 */

import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { getUserOrThrow, getAdminClient, AuthError, authErrorResponse } from "../_shared/auth.ts";
import { worldlineRequest } from "../_shared/worldline.ts";
import { createLogger } from "../_shared/logger.ts";

interface BamboraCard {
  card_type: string;
  last_four: string;
  expiry_month: string;
  expiry_year: string;
}

interface BamboraProfileResponse {
  customer_code: string;
  card: BamboraCard;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  const log = createLogger("wl-get-profile");

  try {
    const user = await getUserOrThrow(req, corsHeaders);
    log.setUser(user.userId);

    const supabase = getAdminClient();

    const { data: profiles } = await supabase
      .from("payment_profiles")
      .select("*")
      .eq("user_id", user.userId)
      .order("created_at", { ascending: false });

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ cards: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch card details from Bambora for each profile
    const cards = [];
    for (const p of profiles) {
      try {
        const res = await worldlineRequest<BamboraProfileResponse>(
          "GET",
          `/profiles/${p.worldline_customer_code}`,
        );
        if (res.ok && res.data.card) {
          cards.push({
            profileId: p.id,
            customerCode: p.worldline_customer_code,
            cardType: res.data.card.card_type,
            lastFour: res.data.card.last_four,
            expiryMonth: res.data.card.expiry_month,
            expiryYear: res.data.card.expiry_year,
            isDefault: p.is_default,
          });
        }
      } catch {
        // Skip profiles that fail to fetch
        log.warn("Failed to fetch profile", { customer_code: p.worldline_customer_code });
      }
    }

    return new Response(
      JSON.stringify({ cards }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);
    log.error("Get profile failed", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
