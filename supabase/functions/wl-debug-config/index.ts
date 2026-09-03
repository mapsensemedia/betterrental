/**
 * wl-debug-config — Read-only Bambora merchant configuration probe
 *
 * Admin/staff only. Tries GET /configuration and GET /merchant against
 * the configured Bambora credentials. Returns the raw API responses for
 * inspection. NEVER moves money.
 */
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { getUserOrThrow, requireRoleOrThrow, AuthError, authErrorResponse } from "../_shared/auth.ts";
import { worldlineRequest } from "../_shared/worldline.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  try {
    const user = await getUserOrThrow(req, corsHeaders);
    await requireRoleOrThrow(user.userId, ["super_admin", "manager", "admin", "staff", "finance"], corsHeaders);

    const probes: Record<string, unknown> = {};
    for (const path of ["/configuration", "/merchant", "/profiles", "/reports/configuration"]) {
      try {
        const res = await worldlineRequest("GET", path);
        probes[path] = { status: res.status, ok: res.ok, data: res.data };
      } catch (e) {
        probes[path] = { error: e instanceof Error ? e.message : String(e) };
      }
    }

    return new Response(JSON.stringify({ environment: Deno.env.get("WORLDLINE_ENVIRONMENT"), probes }, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
