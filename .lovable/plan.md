# Card processing fee (2.5% / 1.5%)

Add a mandatory, transparent card processing fee to every rental transaction, quoted up front rather than surfaced at the payment step.

## The rule

- Fee base and tier test: the **pre-tax rental subtotal**.
- Subtotal up to $450.00 → **2.5%**
- Subtotal $450.01 and above → **1.5%**
- The fee is a **pass-through**: it is added after PST/GST and is not itself taxed.
- Rounded to the cent using integer-cents math (consistent with existing pricing rules).

Example: subtotal $223.60, tax $26.83 → fee 2.5% of $223.60 = $5.59 → total $256.02.

## Where it applies

- Online booking funnel (category list, protection, add-ons, checkout, confirmation)
- Walk-in / counter bookings
- Extensions, upgrades and modifications — the fee is recalculated on the new subtotal, and only the **difference** is charged, matching the existing delta-only repricing rule
- Not applied to security deposits (holds/captures stay unchanged)

## Customer-facing presentation

- Labelled **"Credit card processing fee (2.5%)"** (or 1.5% on larger bookings), always with the dollar amount beside it — never a bare percentage.
- Shown on the quote screens (search results total, protection, add-ons) and not introduced for the first time at payment, so the advertised all-in number matches what is charged (drip-pricing compliance).
- One short explanatory line in the price breakdown tooltip/footnote: the fee covers card processing costs, is charged on every booking, and drops to 1.5% on bookings over $450.
- Itemised as its own line on the booking detail financials, invoices, receipts and the rental agreement — never folded into taxes or "fees".
- Not waivable at the counter: no override field is added anywhere in ops/admin.

## Technical approach

1. **Single source of truth** — new `src/lib/processing-fee.ts` exporting the tiers (`PROCESSING_FEE_TIERS`, threshold $450) and `computeProcessingFee(subtotalCents)`. Mirror it in `supabase/functions/_shared/` so the server does not import client code.
2. **Client engine** — `src/lib/pricing.ts` `calculateBookingPricing()` gains `processingFee` and `processingFeeRate` in `PricingBreakdown`, computed from `subtotal` after taxes are derived; `total = subtotal + taxAmount + processingFee`. Subtotal and tax math stay untouched, so no existing line changes value. New cases added to `pricing.test.ts` (below/at/above threshold, rounding).
3. **Server engine** — the same addition in `supabase/functions/_shared/booking-core.ts` totals block, so `create-booking`, `create-walk-in-booking` and `reprice-booking` all produce the authoritative fee. Extension/upgrade delta logic keeps comparing new vs old totals, so the fee delta flows through automatically.
4. **Persistence** — add `bookings.processing_fee` (numeric, default 0) plus `processing_fee_rate` via migration so historical bookings keep a fee of 0 and existing totals are unaffected. Server functions write it; the client never writes financial fields (existing trigger rules).
5. **Display surfaces** — read the stored value (falling back to 0) in `FinancialBreakdown.tsx`, `OpsBookingSummary`/`MobileBookingSummary`, `BookingSummaryPanel`, `TotalBar`, `src/lib/pdf/invoice-data-builder.ts`, receipts and `generate-agreement`.
6. **Backwards compatibility** — old bookings, receipts and agreements show no fee line when the stored value is 0; nothing recalculates retroactively.

## Note

Your message mentioned "2.4%" in the wording example; the implementation uses the 2.5% / 1.5% tiers you specified, and the label text will show the actual applied rate.
