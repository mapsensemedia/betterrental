import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { worldlineRequest } from "../_shared/worldline.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  try {
    const { transactionId } = await req.json();
    if (!transactionId) {
      return new Response(JSON.stringify({ error: "transactionId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await worldlineRequest("GET", `/payments/${transactionId}`);

    return new Response(JSON.stringify({ ok: res.ok, status: res.status, data: res.data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
