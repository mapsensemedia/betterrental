import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { worldlineRequest } from "../_shared/worldline.ts";

// Bambora Reports API: search transactions by order number.
// Field 5 = trnOrderNumber. Date range required.
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  try {
    const { orderNumber, startDate, endDate } = await req.json();
    if (!orderNumber || !startDate || !endDate) {
      return new Response(
        JSON.stringify({ error: "orderNumber, startDate, endDate required (YYYY-MM-DDTHH:mm:ss)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const res = await worldlineRequest("POST", "/reports", {
      name: "Search",
      start_date: startDate,
      end_date: endDate,
      start_row: 1,
      end_row: 200,
      criteria: [
        { field: 5, operator: "=", value: String(orderNumber) },
      ],
    });

    return new Response(JSON.stringify({ ok: res.ok, status: res.status, data: res.data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
