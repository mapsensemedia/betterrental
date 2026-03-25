

## Root Cause Analysis: Cross-User Data Leakage in Bookings

### The Bug

There are **two independent root causes** creating the same symptom (wrong user data on bookings):

---

### Root Cause 1: `create-guest-booking` Never Sets `customer_id`

**File**: `supabase/functions/create-guest-booking/index.ts`
**File**: `supabase/functions/_shared/booking-core.ts` (line 789-820)

The guest booking flow (used for all online/website bookings) does the following:
1. Takes the customer's email → searches `profiles` table by email
2. If a profile exists, reuses that profile's `user_id`
3. If no profile exists, creates a new auth user + profile
4. Creates the booking with `user_id` only — **never creates or links a `customer_id`**

**Why this causes the bug**: If Customer A (e.g., Babru) previously created a profile with email X, and later someone else books using the same email (staff enters wrong email, or email is shared), the booking gets Babru's `user_id`. Since there's no `customer_id` to override the display, the system shows Babru's name, license, and documents.

**Currently affected bookings** (profile_name ≠ customer_name, online source):
- 69M6RYX9: Lovepreet Singh → shows BABRU SINGH MAAN
- 4HL5K9QV: Singh Lovepreet → shows BABRU SINGH MAAN  
- FZH86F8W: SUMANPREET KAUR → shows Devish Arora

### Root Cause 2: `create-walk-in-booking` Reuses Wrong `user_id` from Profile Email Match

**File**: `supabase/functions/create-walk-in-booking/index.ts` (lines 246-254)

The walk-in flow correctly creates/matches a `customer_id` (with name+email matching and conflict detection). But for the `user_id`, it does a blind email lookup on `profiles`:

```typescript
const { data: existingProfile } = await supabaseAdmin
  .from("profiles")
  .select("id, full_name")
  .eq("email", email)
  .maybeSingle();

if (existingProfile) {
  userId = existingProfile.id;  // ← WRONG: reuses another person's auth account
}
```

This means if the customer email happens to match an existing profile belonging to a different person, the booking gets the wrong `user_id`. The `customer_id` is correct, so the name displays correctly in views that use `customer_id`, but license, verification, and profile-dependent views show the wrong person.

**Currently affected bookings** (walk_in source):
- GJ662UXA: MALKEET SINGH SOHAL → user_id = BABRU SINGH MAAN
- E6MA7C5T: MALKEET SINGH SOHAL → user_id = BABRU SINGH MAAN

---

### Fix Plan

#### Fix 1: `create-guest-booking` — Add `customer_id` Resolution

**File**: `supabase/functions/create-guest-booking/index.ts`

After the user/profile resolution (line 235) and before calling `createBookingRecord` (line 238), add customer resolution logic:

1. Search `customers` table by email + name match (same logic as walk-in)
2. If found, reuse that `customer_id`
3. If not found, create a new `customers` record with the guest's name/email/phone
4. Pass `customer_id` to `createBookingRecord`

**File**: `supabase/functions/_shared/booking-core.ts`

Update `BookingInput` type and `createBookingRecord` to accept and insert an optional `customerId` field into the booking.

#### Fix 2: `create-walk-in-booking` — Create Dedicated Profile Instead of Reusing

**File**: `supabase/functions/create-walk-in-booking/index.ts` (lines 246-298)

Change the profile/auth user resolution to **always create a new auth user and profile** when the customer name doesn't match the existing profile name. Currently it only checks email — add a name comparison:

```typescript
if (existingProfile) {
  // Only reuse if the name actually matches (same person)
  if (existingProfile.full_name?.toLowerCase().trim() === sanitizedName.toLowerCase()) {
    userId = existingProfile.id;
  }
  // Otherwise fall through to create a new auth user for this different person
}
```

This prevents Person B's auth account from being used for Person A's booking just because they share an email.

#### Fix 3: `create-guest-booking` — Same Name Check on Profile Reuse

**File**: `supabase/functions/create-guest-booking/index.ts` (lines 194-201)

Add the same name-matching guard. If the profile email matches but the name is different, create a new auth user instead of reusing:

```typescript
if (existingProfile) {
  // Verify name matches before reusing profile
  const profileName = existingProfile.full_name?.toLowerCase().trim();
  const guestName = `${firstName} ${lastName}`.toLowerCase().trim();
  if (profileName === guestName) {
    userId = existingProfile.id;
  }
  // If names don't match, fall through to create new user
}
```

Also add `full_name` to the select query on profiles.

#### Fix 4: Data Correction for Currently Mismatched Bookings

Run database updates for the 5 remaining mismatched bookings (GJ662UXA, E6MA7C5T, 69M6RYX9, 4HL5K9QV, FZH86F8W) to set correct `user_id` and `customer_id` values matching the actual customer.

---

### Files Modified

1. `supabase/functions/create-guest-booking/index.ts` — add customer_id resolution + name-check on profile reuse
2. `supabase/functions/_shared/booking-core.ts` — accept optional `customerId` in `BookingInput` and `createBookingRecord`
3. `supabase/functions/create-walk-in-booking/index.ts` — add name-check before reusing existing profile
4. Database migration — fix 5 existing mismatched bookings

### What Does NOT Change
- `create-booking` (authenticated flow) — uses `auth.userId` from JWT, always correct
- All frontend display logic — already prioritizes `customer_id` over `user_id`
- RLS policies, triggers, payment flows — untouched
- Walk-in customer matching/conflict detection — already correct

