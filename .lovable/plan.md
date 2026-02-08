
# Fix All Issues Plan

## Issues Found

### Issue 1 (Critical): Edge Function Queries Non-Existent Database Columns
The `generate-agreement` edge function tries to select `make`, `model`, and `year` from the `vehicle_units` table, but **these columns do not exist**. The actual columns on `vehicle_units` are: `id`, `vehicle_id`, `vin`, `license_plate`, `color`, `current_mileage`, `tank_capacity_liters`, `status`, etc.

This causes the entire unit query to fail silently, so VIN, license plate, color, and tank capacity are all lost -- even when a vehicle unit IS assigned to the booking.

**Proof**: Booking `SLJN543Z` has unit `6386a933` assigned (VIN: `3KPA24AD1PE112233`, Plate: `ECO-103`), but the agreement's `terms_json` shows all vehicle fields as null.

### Issue 2 (Medium): Existing Agreements Have Missing Data
All 3 rental agreements in the database were generated with the broken edge function, so they all have null vehicle details. Regenerating them requires voiding and recreating.

### Issue 3 (Minor): Customer Name Displays as Email
Some profiles have `full_name` set to their email address (e.g., `admin@c2crental.ca`). The edge function and PDF display this verbatim, making the rental record look unprofessional.

### Issue 4 (Minor): Console Warning - forwardRef in SelectContent
A React warning about function components not supporting refs appears in the console from the `OpsLocationFilter` component. This is cosmetic and does not affect functionality.

---

## Fix Plan

### Step 1: Fix Edge Function (`supabase/functions/generate-agreement/index.ts`)

**Remove non-existent columns from the vehicle_units query:**

Current (broken):
```
.select("vin, license_plate, tank_capacity_liters, color, year, make, model, current_mileage")
```

Fixed:
```
.select("vin, license_plate, tank_capacity_liters, color, current_mileage")
```

Also remove `make`, `model`, and `year` from the `unitInfo` default object since they don't come from this table.

**Extract make/model info from category name** as a fallback. The category names follow a pattern like `"MID SIZE SUV - Toyota Rav4 or Similar"`, so we can parse this to extract the make/model for the PDF.

**Handle customer name = email**: If `full_name` equals the email or is empty, use a formatted version or "Valued Customer" as fallback.

### Step 2: Update PDF Renderer (`src/lib/pdf/rental-agreement-pdf.ts`)

- Use the category name directly for the vehicle description (e.g., "MID SIZE SUV - Toyota Rav4 or Similar") since that's more descriptive than separate make/model fields
- Show VIN and plate only when available (skip the line rather than showing "N/A")
- Show odometer/fuel only when inspection data exists
- Remove the `make`/`model`/`year` fields from the `TermsJson` interface since they aren't reliably available

### Step 3: Re-deploy and Test

- Deploy the fixed edge function
- For existing bookings: void the current agreement and regenerate to get correct data
- Verify the PDF now shows all available information on a single page

---

## What Won't Change

- Database schema stays the same (no new columns needed)
- The signing/confirming/voiding workflow stays the same
- Protection pricing (already fixed)
- The overall PDF layout and single-page design stays the same
