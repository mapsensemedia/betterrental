
# Persist Dates Immediately on Change

## Problem
Currently, pickup and return dates are stored in local component state when the user changes them, but they're only synced to the RentalBookingContext when the "Search" button is clicked. This means if a user navigates away or the page refreshes, the dates are lost.

The location field already works correctly - it persists to context immediately when changed.

## Solution
Update the date input `onChange` handlers to call the context setters (`setPickupDateTime` and `setReturnDateTime`) immediately, in addition to updating local state.

## Changes Required

### File: `src/components/rental/RentalSearchCard.tsx`

There are 4 date inputs that need updating (2 in delivery mode, 2 in pickup mode):

| Location | Lines | Current Behavior | New Behavior |
|----------|-------|------------------|--------------|
| Delivery Mode - Pickup Date | 399-406 | Only sets local `pickupDate` | Also calls `setPickupDateTime()` |
| Delivery Mode - Return Date | 461 | Only sets local `returnDate` | Also calls `setReturnDateTime()` |
| Pickup Mode - Pickup Date | 559-566 | Only sets local `pickupDate` | Also calls `setPickupDateTime()` |
| Pickup Mode - Return Date | 621 | Only sets local `returnDate` | Also calls `setReturnDateTime()` |

**Example change for pickup date:**
```typescript
// Before (line 559-566):
onChange={(e) => {
  setPickupDate(e.target.value);
  if (!returnDate || e.target.value > returnDate) {
    const nextDay = new Date(e.target.value);
    nextDay.setDate(nextDay.getDate() + 1);
    setReturnDate(nextDay.toISOString().split("T")[0]);
  }
}}

// After:
onChange={(e) => {
  const newDate = e.target.value;
  setPickupDate(newDate);
  // Persist to context immediately
  if (newDate) {
    setPickupDateTime(new Date(`${newDate}T${pickupTime}`), pickupTime);
  }
  if (!returnDate || newDate > returnDate) {
    const nextDay = new Date(newDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split("T")[0];
    setReturnDate(nextDayStr);
    // Also persist return date
    setReturnDateTime(new Date(`${nextDayStr}T${returnTime}`), returnTime);
  }
}}
```

**Example change for return date:**
```typescript
// Before (line 621):
onChange={(e) => setReturnDate(e.target.value)}

// After:
onChange={(e) => {
  const newDate = e.target.value;
  setReturnDate(newDate);
  if (newDate) {
    setReturnDateTime(new Date(`${newDate}T${returnTime}`), returnTime);
  }
}}
```

### Time Selects Also Need Updates
The time selects (lines 417, 487, 577, 647) should also persist immediately:

```typescript
// Before:
onValueChange={setPickupTime}

// After:
onValueChange={(time) => {
  setPickupTime(time);
  if (pickupDate) {
    setPickupDateTime(new Date(`${pickupDate}T${time}`), time);
  }
}}
```

### Remove Redundant Code in handleSearch
After implementing immediate persistence, lines 274-275 in `handleSearch` become redundant but can be kept as a safety net.

## Summary
This is a straightforward fix that mirrors the existing location persistence pattern. All 8 input handlers (4 dates + 4 times) need to call their respective context setters immediately on change.
