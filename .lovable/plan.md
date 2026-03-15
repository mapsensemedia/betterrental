

# Return Time Loss — Root Cause & Fix

## The Bug

When a customer selects a return time (e.g. 2:30 PM) and the page is loaded fresh via URL (deep-link, page refresh), the return time silently resets to the default `"10:00"`.

## Root Cause

**File**: `src/contexts/RentalBookingContext.tsx`, lines 196-204

During context initialization, the hydration from URL params extracts **only the date** from ISO timestamps — the time portion is discarded:

```typescript
// endAt = "2026-03-18T21:30:00.000Z" (which is 2:30 PM PDT)
const d = new Date(endAt);
stored.returnDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
// returnTime stays as default "10:00" ← BUG
```

There IS a safety net in `Search.tsx` (lines 85-91) that extracts time from URL params, but it only runs when `!searchData.returnDate`. Since the context initializer already set `returnDate` (without time), the safety net is skipped.

**Same issue exists for pickup time.**

## Fix

### 1. Context initializer — extract time from URL params

**File**: `src/contexts/RentalBookingContext.tsx` (lines 184-205)

When hydrating `startAt`/`endAt` from URL params, also extract the time component using `getHours()`/`getMinutes()` (which returns local timezone values) and set `pickupTime`/`returnTime`:

```typescript
if (startAt) {
  if (startAt.length === 10 && !startAt.includes("T")) {
    stored.pickupDate = parseLocalDate(startAt);
    // no time info in date-only string — keep existing/default
  } else {
    const d = new Date(startAt);
    if (!isNaN(d.getTime())) {
      stored.pickupDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      // NEW: extract time from ISO string
      stored.pickupTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
  }
}
// Same pattern for endAt → returnDate + returnTime
```

### 2. localStorage hydration — also restore time fields

**File**: `src/contexts/RentalBookingContext.tsx` (lines 144-169)

The `loadFromStorage` function restores dates but relies on the spread `...parsed` for `pickupTime`/`returnTime`. This already works correctly since those are plain strings. No change needed here.

### Summary

| File | Change |
|------|--------|
| `src/contexts/RentalBookingContext.tsx` | Extract and set `pickupTime`/`returnTime` from ISO URL params during initialization (lines 184-205) |

One file, ~4 lines added. No schema changes, no edge function changes.

