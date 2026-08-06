// TEMPORARY one-off: regenerates the extension rental agreements for the two
// bookings whose long-term pricing was corrected (L2J4F7JK, ZKFF584Q).
// Only these hardcoded booking ids are accepted. Delete after use.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED = [
  "3e9bbe4b-6736-4c0e-856f-70fdb53dfe9a", // L2J4F7JK
  "67a5ce80-1e07-4671-8d78-6e0f74e0f0a7", // ZKFF584Q
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const results: unknown[] = [];

  for (const bookingId of ALLOWED) {
    const { data: existing } = await supabase
      .from("rental_agreements")
      .select("id, customer_signed_at")
      .eq("booking_id", bookingId)
      .neq("status", "voided")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const resp = await fetch(`${supabaseUrl}/functions/v1/generate-agreement`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({
        bookingId,
        forceRegenerate: true,
        suppressNotifications: true,
        copySignatureFromLatest: !!existing?.customer_signed_at,
        agreementType: "extension",
      }),
    });

    const text = await resp.text();
    results.push({ bookingId, status: resp.status, body: text.slice(0, 400) });
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
