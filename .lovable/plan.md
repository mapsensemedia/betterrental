

## Problem

Photos taken during the Ready Line step are saved to `condition_photos` with `phase = 'pickup'`. However, the dispatch readiness validation in three files queries for `phase = 'pre_delivery'` — a value that never exists in the database. This means the dispatch step always sees 0 photos regardless of how many were actually taken.

Booking N6EWHN97 has **7 photos** with `phase = 'pickup'`, but dispatch reports "0 taken".

## Fix

Change the dispatch readiness photo count query from `phase = 'pre_delivery'` to `phase = 'pickup'` in all three locations:

### File 1: `src/hooks/use-dispatch-readiness.ts`
- Line 60: Change `.eq("phase", "pre_delivery")` to `.eq("phase", "pickup")`
- Line 98: Same change in the batch query

### File 2: `src/hooks/use-assign-driver.ts`
- Line 41: Change `.eq("phase", "pre_delivery")` to `.eq("phase", "pickup")`

### File 3: `src/components/admin/ops/OpsStepContent.tsx`
- Line 102: Change `.eq("phase", "pre_delivery")` to `.eq("phase", "pickup")`

No database changes needed. No other files affected.

