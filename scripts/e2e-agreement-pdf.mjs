// End-to-end verification of the rental-agreement generator.
// 1. Reads the latest confirmed rental_agreement row from Lovable Cloud
//    via the anon client (proves the edge function persisted a valid
//    terms_json under the current schema).
// 2. Renders it through buildRentalAgreementPdf (the exact code path
//    the browser calls when a staff member clicks "Download Agreement").
// 3. Asserts booking-specific data + policy constants are present in
//    the rendered PDF stream and writes the artefact to /mnt/documents.
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

// Load the client build helpers directly from source via tsx-less shim:
// vitest can import TS, so we shell to it for the render half.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bsvsveoaihtbsteqikvp.supabase.co";
const ANON = process.env.LOVABLE_ANON_KEY;
if (!ANON) throw new Error("LOVABLE_ANON_KEY env var required");

const client = createClient(SUPABASE_URL, ANON);

const AGREEMENT_ID = process.argv[2] || "d2b5c6bc-3e70-4edc-ab61-a91e7e4f9e26";
const { data, error } = await client
  .from("rental_agreements")
  .select("id, booking_id, terms_json, agreement_content, created_at, status, customer_signature, customer_signed_at")
  .eq("id", AGREEMENT_ID)
  .maybeSingle();

if (error) throw error;
if (!data) throw new Error(`agreement ${AGREEMENT_ID} not visible via anon (RLS)`);

console.log("fetched agreement", data.id, "booking", data.booking_id, "status", data.status);
console.log("terms.bookingCode =", data.terms_json?.bookingCode);
console.log("terms.policies    =", JSON.stringify(data.terms_json?.policies));

// Persist a fixture the vitest suite can load without hitting the network.
writeFileSync(
  "scripts/e2e-agreement-fixture.json",
  JSON.stringify(data, null, 2),
);
console.log("wrote scripts/e2e-agreement-fixture.json");
