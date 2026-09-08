/**
 * validate-promo-code
 *
 * Validates a promo code typed at checkout. The only code currently supported is
 * the internal QA test code stored in the TEST_PROMO_CODE secret, which reduces
 * every charge and the deposit hold by 99%.
 *
 * SECURITY:
 * - Never returns or hints at the correct code.
 * - Rate limited per IP so the code cannot be brute-forced.
 * - The discount is re-validated server-side at booking creation; a client that
 *   fakes a valid response gets no discount and fails the price-mismatch check.
 */
import {
  getCorsHeaders,
  handleCorsPreflightRequest,
  getClientIp,
} from "../_shared/cors.ts";
import { checkRateLimitDb } from "../_shared/rate-limit-db.ts";
import { resolveTestPromoCode, TEST_PROMO_PERCENT_OFF } from "../_shared/booking-core.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimitDb(`promo-code:${ip}`, 60 * 10, 10);
    if (!rl.allowed) {
      return json({ valid: false, message: "Too many attempts. Please try again later." }, 429);
    }

    const body = await req.json().catch(() => ({}));
    const rawCode = typeof body?.code === "string" ? body.code : "";
    if (!rawCode.trim() || rawCode.length > 64) {
      return json({ valid: false, message: "Please enter a code." });
    }

    const resolved = resolveTestPromoCode(rawCode);
    if (!resolved) {
      return json({ valid: false, message: "This code isn't valid." });
    }

    return json({
      valid: true,
      percentOff: TEST_PROMO_PERCENT_OFF,
      label: "Test discount",
    });
  } catch (err) {
    console.error("[validate-promo-code] error", err);
    return json({ valid: false, message: "Could not check that code right now." }, 500);
  }
});
