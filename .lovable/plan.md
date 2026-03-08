

## Problem

The "Confirm & Apply" button in `UnifiedVehicleManager.tsx` fails with "Failed to save changes" because the `saveMutation` (line 247) directly updates the `bookings` table from the client with financial fields (`daily_rate`, `subtotal`, `tax_amount`, `total_amount`). The database trigger `block_sensitive_booking_updates` blocks all client-side writes to these columns — only `service_role` is allowed.

**Root cause**: Lines 256-277 do `supabase.from("bookings").update(updatePayload)` with financial fields. The seatbelt trigger raises an exception, the mutation catches it, and shows "Failed to save changes."

## Fix

Route category changes through the existing `reprice-booking` edge function (which already supports the `"upgrade"` operation with unit assignment) instead of direct client-side booking updates.

### Changes to `src/components/admin/UnifiedVehicleManager.tsx`

**Replace the `saveMutation.mutationFn`** (lines 248-348):

1. **If category changed**: Call `supabase.functions.invoke("reprice-booking")` with `operation: "upgrade"`, passing the daily fee difference, the new category ID, and the selected unit ID. The edge function already handles `assignUnitId` and `assignUnitCategoryId` fields, updates `vehicle_id`, sets financial fields via service_role, and writes audit logs.

2. **If only unit changed (no category change)**: Use the existing `assign_vin_to_booking` / `release_vin_from_booking` RPCs (these are `SECURITY DEFINER` functions that bypass the trigger). The current unit-only path (lines 301-347) already does this correctly, but the direct `bookings.update({ assigned_unit_id })` on line 334 will also hit the seatbelt trigger for `updated_at`. Fix by removing the manual `updated_at` set or by only updating `vehicle_units` and relying on the RPC.

### Specific implementation:

**Category change path** — replace lines 253-298 with:
```ts
if (categoryChanged && selectedCategory) {
  const upgradeDailyFee = chargeCustomer 
    ? Number(selectedCategory.daily_rate) - booking.daily_rate 
    : 0;
  
  const { data, error } = await supabase.functions.invoke("reprice-booking", {
    body: {
      bookingId,
      operation: "upgrade",
      upgradeDailyFee,
      showToCustomer: chargeCustomer,
      categoryLabel: selectedCategory.name,
      upgradeReason: reason || "Category change via ops panel",
      assignUnitId: unitChanged ? selectedUnitId : undefined,
      assignUnitCategoryId: selectedCategoryId,
    },
  });
  if (error || data?.error) throw new Error(data?.error || error?.message || "Reprice failed");
}
```

**Unit-only change path** — for the case where `unitChanged && !categoryChanged`, keep the RPC calls but remove the direct `bookings.update({ assigned_unit_id, updated_at })` on line 334. Instead, after releasing the auto-assigned unit, use `assign_vin_to_booking` again or handle the specific unit swap via the edge function.

Actually, looking more carefully: the `assign_vin_to_booking` RPC is `SECURITY DEFINER` and updates `bookings.assigned_unit_id` directly — that should work. The problem line 334 does a direct client update which hits the trigger because `updated_at` change alone doesn't trigger the seatbelt (the trigger only checks financial/status fields). Let me re-check... the trigger checks `NEW.status IS DISTINCT FROM OLD.status OR NEW.subtotal IS DISTINCT FROM OLD.subtotal...` — so updating only `assigned_unit_id` should NOT trigger it.

This means the error is specifically from the **category change path** (lines 256-277) which updates `daily_rate`, `subtotal`, `tax_amount`, `total_amount`. The unit-only path should work fine.

### Summary of changes:

**One file**: `src/components/admin/UnifiedVehicleManager.tsx`
- Replace the category-change branch in `saveMutation` to call `reprice-booking` edge function with `operation: "upgrade"` instead of direct client-side `bookings.update()`
- Pass `assignUnitId` and `assignUnitCategoryId` to the edge function so it handles unit assignment atomically
- Keep the unit-only change path as-is (RPCs are security definer)

