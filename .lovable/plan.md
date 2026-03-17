

## Root Cause Analysis: Wrong Customer Assignment on Booking Creation

### What's happening

Three bugs work together to cause wrong customer linking:

### Bug 1: Profile upsert OVERWRITES existing customer data (critical)

In `create-walk-in-booking/index.ts` lines 152-159, after finding an existing profile by email, the code does:
```typescript
await supabaseAdmin.from("profiles").upsert({
  id: userId,           // existing customer's ID
  full_name: sanitizedName,  // NEW walk-in customer's name
  phone: sanitizedPhone,     // NEW walk-in customer's phone
}, { onConflict: "id" });
```

This **silently overwrites** the existing customer's name and phone. If staff creates a walk-in for "John Doe" and enters an email that already belongs to "Lovepreet Singh", the booking is linked to Lovepreet's profile AND Lovepreet's name/phone get replaced with John Doe's. From then on, all of Lovepreet's past bookings also show the wrong name.

### Bug 2: Email-only lookup matches wrong person

Both `create-walk-in-booking` and `create-guest-booking` resolve customer identity using **email alone**:
```typescript
.from("profiles").select("id").eq("email", email).maybeSingle()
```

There are already duplicate profiles with the same email in the DB (e.g. `malkeetsohal134@gmail.com` has 2 profile rows). `maybeSingle()` returns one arbitrarily — it could be the wrong one.

### Bug 3: Walk-in dialog does NOT reset form state

`WalkInBookingDialog` uses `useState` with default values, but the shadcn `Dialog` keeps children mounted when closed. When staff opens the dialog, fills in customer data, cancels, then opens it again — the **previous customer's email, name, and phone are still populated**. Staff may not notice and submit a booking with stale customer info.

### Fix Plan

#### 1. Reset form state in `WalkInBookingDialog.tsx` when dialog opens

Add a `useEffect` that resets all form fields whenever `open` transitions to `true`:

```typescript
useEffect(() => {
  if (open) {
    setFormData({
      firstName: "", lastName: "", email: "", phone: "",
      locationId: "", vehicleId: "",
      startDate: new Date(), endDate: addDays(new Date(), 1),
      pickupTime: DEFAULT_PICKUP_TIME, returnTime: DEFAULT_PICKUP_TIME,
      driverAgeBand: "25_70", dailyRate: 0,
      depositAmount: DEFAULT_DEPOSIT_AMOUNT, notes: "",
    });
  }
}, [open]);
```

#### 2. Fix `create-walk-in-booking/index.ts` — stop overwriting existing profiles

When an existing profile is found by email, do NOT upsert name/phone. Only upsert for newly created users:

```typescript
if (existingProfile) {
  userId = existingProfile.id;
  // DO NOT overwrite existing customer's name/phone
} else {
  // ... create new auth user ...
  userId = newUser.user.id;
  // Only upsert profile for NEW users
  await supabaseAdmin.from("profiles").upsert({ ... });
}
```

Move the profile upsert (lines 152-159) inside the `if (!userId)` block so it only runs for newly created users.

#### 3. Fix `create-guest-booking/index.ts` — same pattern

The guest booking flow (lines 194-235) has the same email-only lookup but at least only upserts for new users (line 227 is inside the `else` block). This is correct, no change needed there.

#### 4. Handle duplicate email profiles

The DB currently has duplicate profiles with the same email. To prevent `maybeSingle()` from returning an arbitrary match:
- Add `UNIQUE` index on `profiles.email` (with `WHERE email IS NOT NULL`) via migration
- Before adding the index, deduplicate existing records — merge the duplicates by keeping the profile with the most bookings and updating the other bookings' `user_id`

#### 5. Add a guard rail in `create-walk-in-booking` — log when reusing existing profile

When an existing profile is matched, log the match details so mismatches can be audited:

```typescript
if (existingProfile) {
  userId = existingProfile.id;
  console.log(`[walkin] Reusing existing profile ${userId} for email ${email}`);
}
```

### Files to Change

| File | Change |
|------|--------|
| `src/components/admin/WalkInBookingDialog.tsx` | Add `useEffect` to reset form state when `open` becomes `true` |
| `supabase/functions/create-walk-in-booking/index.ts` | Move profile upsert inside the new-user branch only; stop overwriting existing customer data |
| Database migration | Deduplicate profiles with same email, add unique partial index on `profiles.email` |

### What this does NOT change
- No existing bookings or customer records are altered (except deduplicating profile rows that are exact copies)
- No payment amounts are modified
- The `create-guest-booking` and `create-booking` flows are already correctly scoped

