import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { worldlineRequest } from "../_shared/worldline.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  try {
    const { startId, endId } = await req.json();

    if (!startId || !endId || typeof startId !== "number" || typeof endId !== "number") {
      return new Response(JSON.stringify({ error: "startId and endId (numbers) are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cap range to max 100 IDs per request
    const cappedEnd = Math.min(endId, startId + 99);
    const BATCH_SIZE = 10;
    const transactions: unknown[] = [];

    for (let i = startId; i <= cappedEnd; i += BATCH_SIZE) {
      const batch: number[] = [];
      for (let j = i; j < Math.min(i + BATCH_SIZE, cappedEnd + 1); j++) {
        batch.push(j);
      }

      const results = await Promise.allSettled(
        batch.map(async (id) => {
          const res = await worldlineRequest("GET", `/payments/${id}`);
          if (!res.ok) return null; // skip 404s / errors
          return { id, ...(res.data as Record<string, unknown>) };
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled" && r.value !== null) {
          transactions.push(r.value);
        }
      }
    }

    return new Response(JSON.stringify({ transactions, scanned: { startId, endId: cappedEnd } }), {
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
