# Audit result: all three issues are real

I checked the actual code for each claim. All three exist. Below is what each one is, why it happens in plain language, and how to fix it.

---

## 1. Return receipt double-counts fees — CONFIRMED

**Where:** `supabase/functions/generate-return-receipt/index.ts`

**What happens:** The receipt starts with the booking's stored subtotal, which *already* includes the young-driver fee, the $1.50/day PVRT and the $1.00/day ACSRCH fees. The receipt then lists those same three fees as extra lines and, worse, adds them to the subtotal a second time before calculating tax (`subtotal = booking.subtotal + pvrt + acsrch + young_driver_fee`). The grand total on the receipt is still the booking's real total, so the receipt fails its own math: subtotal + tax does not equal total. The listed add-ons are also multiplied by quantity again even though the stored price is already the full line total, and the security deposit is mixed into the charge lines.

**Fix:**
- Compute a true vehicle-rental line = stored subtotal minus (young-driver fee + PVRT + ACSRCH + add-on line totals + additional-driver fees + delivery/drop-off/upgrade fees). Use that remainder as the "Vehicle Rental" line, so the individual fee lines are the only place those charges appear.
- Set receipt subtotal = stored `booking.subtotal` (no re-adding), tax = stored `booking.tax_amount` split into PST/GST for display, total = stored `booking.total_amount`.
- Use `addon.price` directly as the line total (no re-multiplying by quantity).
- Move the deposit lines out of the charge list into a separate deposit summary block in `totals_json` (collected / released / withheld), so they never affect subtotal or tax.
- Add a self-check: if `subtotal + tax` differs from `total` by more than one cent, log a warning and still store the stored booking figures as authoritative.

---

## 2. Extras on a walk-in booking are never charged — CONFIRMED

**Where:** `supabase/functions/create-walk-in-booking/index.ts` (add-on rows inserted after totals are already written) and `src/features/delivery/pages/WalkIn.tsx` (writes booking totals directly from a client-side estimate with no extras at all).

**What happens:** When a walk-in booking is created, the price is fixed first and saved to the booking. Add-on rows (GPS, child seat, fuel, etc.) are then written into the add-ons table afterwards, and nothing goes back and raises the booking's subtotal/tax/total. The customer pays the pre-extras price. Later, the booking summary tries to itemize: it subtracts every known charge from the stored subtotal, and because the add-ons exist as rows but were never included in the subtotal, the leftover goes negative and is displayed as a phantom "Discount / Adjustment −$X" line (`src/components/admin/ops/FinancialBreakdown.tsx`). Extras added *after* creation through the counter upsell panel are fine — that path reprices properly.

**Fix:**
- In `create-walk-in-booking`, pass the requested add-ons into the canonical `computeBookingTotals()` call before writing the booking, so subtotal, tax and total include them; insert the add-on rows with the server-computed prices inside the same flow.
- Order the work as: compute totals (with extras) → insert booking → insert extras rows → verify the sum of rows matches what was priced.
- Replace the direct `bookings` insert in `src/features/delivery/pages/WalkIn.tsx` with a call to `create-walk-in-booking`, so delivery walk-ins get server pricing instead of a client estimate.
- Add a guard in `FinancialBreakdown.tsx`: when the leftover is negative, show it as an explicit "Unbilled extras (not charged)" warning line instead of a fake discount, so staff can see money is missing rather than assuming a discount.

---

## 3. Applying an upgrade silently rewrites the whole price — CONFIRMED

**Where:** `supabase/functions/reprice-booking/index.ts`, the `upgrade` and `remove_upgrade` branches.

**What happens:** Adding an upgrade does not simply add the upgrade fee. It recalculates the entire booking from scratch through the pricing engine — protection rate from current settings, add-on prices from the current price list, weekend surcharge, drop-off fee, regulatory fees — then overwrites subtotal, tax and total with that fresh figure plus the upgrade. Any difference between the price the customer originally agreed to and today's computed price is silently absorbed into the new total. On walk-in bookings, where the saved price was set by staff and never validated against the engine, that gap can be hundreds of dollars, and the only trace is the raw before/after numbers in the audit log with no explanation.

**Fix:**
- Change `upgrade` / `remove_upgrade` to delta-only: keep the stored subtotal, add (or subtract) `upgrade_daily_fee × days`, then recompute tax and total from that. Do not re-derive the rest of the booking.
- Before writing, compare the stored subtotal against the engine's canonical subtotal. If they differ by more than $0.50, still apply the delta, but record a `pricing_drift` entry in `audit_logs` with both figures and return the drift in the response.
- Surface that drift in the counter/upgrade UI as a visible notice ("Saved price differs from current price list by $X — review before charging") instead of quietly folding it into the total, with an explicit "Reprice to current rates" action for when staff genuinely want a full recalculation.
- Keep the existing full-recalculation behaviour only for the `modify` operation, where changing dates legitimately requires it.

---

## Technical notes

- Files to change: `supabase/functions/generate-return-receipt/index.ts`, `supabase/functions/create-walk-in-booking/index.ts`, `supabase/functions/reprice-booking/index.ts`, `src/features/delivery/pages/WalkIn.tsx`, `src/components/admin/ops/FinancialBreakdown.tsx`, plus the upgrade UI in `src/components/admin/ops/CounterUpsellPanel.tsx` for the drift notice.
- All money math stays in integer cents, consistent with the existing pricing rules.
- No historical bookings or receipts are rewritten by this work. Existing receipts with bad math can be reissued individually after the fix; a data-repair pass for specific bookings with unbilled walk-in extras can be run separately on request.
- Verification: create a walk-in booking with a child seat and confirm the total includes it; apply an upgrade to a walk-in booking and confirm the total moves by exactly the upgrade amount; generate a return receipt and confirm subtotal + tax = total.
