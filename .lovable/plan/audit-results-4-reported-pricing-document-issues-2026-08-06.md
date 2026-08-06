# Audit results: 4 reported pricing/document issues

I checked each claim against the actual code and, where possible, against live data. Verdicts:

| # | Reported issue | Verdict |
|---|---|---|
| 1 | Extension leaves extras at old price | **Real (partly fixed already)** — additional drivers are synced, add-on rows are not |
| 2 | Invoice PDF total ignores late fees / damage charges | **Real, confirmed with live invoices** |
| 3 | Upgrade screen omits tax | **Real** |
| 4 | Extension screen omits protection and add-ons | **Real** |

---

## 1. Extension leaves add-on prices at the old duration

**Status: real, but narrower than described.**

What the code does today (`supabase/functions/reprice-booking/index.ts`): after a date change it re-runs the pricing engine for the new duration, so protection, extras and driver fees are all counted in the new total. It then explicitly re-writes the **additional driver** rows so their stored fee matches the new number of days. It does **not** re-write the stored price on the **add-on** rows (`booking_add_ons.price`).

Why this causes the symptom: the booking's total says "extras for 7 days" while the add-on line still says "extras for 5 days". The financial breakdown adds the itemized lines and compares them with the stored total; the leftover gap has nowhere to go, so it prints as a rate/manual adjustment line.

Live data check: only 7 bookings have add-on rows and none of them has been extended yet, so no customer has hit this. It is a latent bug that will surface the first time an extended booking carries a per-day add-on.

**Fix:** in the same block that already syncs driver fees, also recompute each `booking_add_ons.price` for the new billed days (daily rate x quantity x days, plus any one-time fee), using the same rate source the engine uses. Skip it, exactly like the driver sync does, when `preserveExtrasPrices` is set (mid-rental pro-rated upsells intentionally keep their partial-period price).

## 2. Invoice PDF total ignores late fees and damage charges

**Status: real, and it has already affected two customers.**

The invoice record (`final_invoices`) stores `grand_total = booking total + late fees + damage charges + other fees`. The PDF builder (`src/lib/pdf/invoice-data-builder.ts`) prints the late-fee and damage lines from the invoice record, but takes the grand total and the amount due from `bookings.total_amount` instead of the invoice's own `grand_total`.

Confirmed invoices where the PDF would understate what is owed:

```text
INV-2026-01040  JBVM2KGR   record $228.38   PDF would print $148.38   (late fee $80.00)
INV-2026-01034  WE4ZFCXC   record $250.47   PDF would print $237.97   (late fee $12.50)
```

**Fix:** the PDF must trust the invoice record.
- `grandTotal` = `invoice.grand_total`.
- `amountDue` = `invoice.grand_total - credited payments` (keep the existing payment/offline-credit logic, just start from the invoice total).
- Keep the rental subtotal / tax lines as they are, so the itemization still reconciles: rental subtotal + tax + late fees + damage + other fees = grand total.
- Add a guard: if the itemized lines don't add up to `grand_total`, log it and show a single explicit "Other charges" line rather than silently dropping money.
- Re-issue the two invoices above so the customers receive a correct document.

## 3. Upgrade screen doesn't show tax

**Status: real.**

`src/components/admin/ops/VehicleUpgradePanel.tsx` previews the new total as `booking.total_amount + fee x days` — no tax. The server (`reprice-booking`, upgrade branch) adds the upgrade to the subtotal and then applies PST 7% + GST 5%. So $50/day x 5 days shows as +$250 on screen and charges +$280.

**Fix:** make the preview show the same breakdown the server produces — upgrade subtotal, tax on the upgrade at 7% + 5%, and the resulting new total, with the tax line visible. The panel already has the numbers it needs (stored subtotal, days, current upgrade fee), so the calculation mirrors the server branch exactly instead of guessing. Label the figure "estimated" and reconcile against the value the server returns after applying.

## 4. Extension screen omits protection and add-ons

**Status: real.**

`previewModification()` in `src/hooks/use-booking-modification.ts` accepts `protectionDailyRate`, `addOnsPerDay` and `deliveryFee`, but the only caller (`BookingModificationPanel.tsx`) calls it as `previewModification(booking, newEndDate)` — so all three default to **0**. The preview therefore prices the car only, while the server prices car + protection + add-ons + driver fees. A 2-day extension on a booking with Smart Protection and an add-on can quote ~$75 and charge ~$160.

**Fix:** feed the preview real inputs and show a proper before/after breakdown.
- Load the booking's protection plan rate and its add-on/driver rows in the panel and pass them into `previewModification`.
- Render a before/after table: days, vehicle, protection, extras, drivers, regulatory fees, subtotal, tax, total, and the difference to collect.
- Keep the existing "agreed price differs from the rate card" warning.

---

## Technical summary of changes

| File | Change |
|---|---|
| `supabase/functions/reprice-booking/index.ts` | Extend the post-update sync block to recompute `booking_add_ons.price` for the new billed days (skipped when `preserveExtrasPrices`) |
| `src/lib/pdf/invoice-data-builder.ts` | `grandTotal` / `amountDue` sourced from `final_invoices.grand_total`; reconciliation guard + "Other charges" fallback |
| `src/lib/pdf/invoice-pdf.ts` | Render the fallback "Other charges" line if present |
| `src/components/admin/ops/VehicleUpgradePanel.tsx` | Preview mirrors the server: upgrade subtotal + PST/GST + new total |
| `src/components/admin/ops/BookingModificationPanel.tsx` | Fetch protection rate / add-ons / drivers, pass to preview, render before/after breakdown |
| `src/hooks/use-booking-modification.ts` | Include protection, extras, driver fees and regulatory fees in the preview breakdown output |

No database schema changes. No changes to how money is actually charged, except issue 1 (add-on rows now match the billed period) and issue 2 (invoice PDF shows the amount already recorded as owed).
