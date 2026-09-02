# Fix and regenerate rental agreement — 3STR9EL7

## What's wrong today (verified in the database)

Booking 3STR9EL7 (active, Kia B977BH, VIN 3KPA25AD3PE570539) has an agreement created today whose snapshot reads:

- Kilometres out: **4,630** (should be 45,630)
- Fuel out: **5%** (should be 50%)
- Vehicle model: **"Kia Ria"** (should be "Kia Rio")

The odometer/fuel values come from the pickup inspection record for this booking, which stores the same wrong numbers (4630 / 5). The misspelling comes from the fleet vehicle record this unit belongs to, where the model is stored as "Ria" — so every future agreement, invoice and inventory listing for this car repeats the typo.

## Fix

1. **Correct the pickup inspection** for 3STR9EL7: odometer 4,630 → 45,630, fuel 5% → 50%.
2. **Correct the fleet record**: model "Ria" → "Rio" on the vehicle this unit belongs to (only unit affected is B977BH), and align the unit's current mileage with the corrected odometer.
3. **Void the existing agreement and regenerate it** so the new snapshot carries 45,630 km, 50% fuel and "2023 Kia Rio". Pricing, dates, signatures status and all money fields stay exactly as they are — only the vehicle/condition snapshot changes.
4. **Verify**: re-read the new agreement's snapshot and confirm the booking detail page and agreement PDF show 45,630 km / 50% / Kia Rio.

## Technical notes

- Steps 1 and 2 are data corrections applied through a migration (client writes to these tables are trigger-blocked).
- Step 3 uses the existing `generate-agreement` edge function after marking the current agreement `voided`, which is the standard regeneration path already used for name corrections on earlier bookings.
- No application code changes are required; the wrong values are data, not logic.
