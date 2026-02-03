
# Points & Membership System Fix Plan

## Problems Identified

### 1. Points Settings Key Mismatch
The database stores setting keys in `snake_case` format (`earn_rate`, `earn_base`, etc.) but the frontend code expects `camelCase` keys (`earnRate`, `earnBase`, etc.). This causes the settings to never be properly loaded from the database.

**Database keys:** `earn_rate`, `earn_base`, `redeem_rate`, `redeem_rules`, `expiration`
**Code expects:** `earnRate`, `earnBase`, `redeemRate`, `redeemRules`, `expiration`

### 2. Missing Membership Tiers Table
The `MembershipManagementPanel` component tries to query a `membership_tiers` table that does not exist in the database. This table needs to be created to store tier configuration.

### 3. Points Not Being Awarded
Because the settings aren't loading correctly (Issue 1), when a booking is marked as "completed", the points calculation uses only default values and the settings lookup fails silently. The completed booking `ACTV0001` has no points ledger entry.

### 4. Customer Dashboard Display
While the dashboard code is correct, it shows 0 points because no points have been awarded due to the above issues.

---

## Solution

### Step 1: Create Membership Tiers Table
Create the missing `membership_tiers` table with proper structure and seed data for Bronze, Silver, Gold, and Platinum tiers.

```sql
CREATE TABLE membership_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  min_points INTEGER NOT NULL DEFAULT 0,
  benefits JSONB DEFAULT '[]',
  color TEXT DEFAULT '#CD7F32',
  icon TEXT DEFAULT 'medal',
  sort_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default tiers
INSERT INTO membership_tiers (name, display_name, min_points, benefits, color, icon, sort_order)
VALUES 
  ('bronze', 'Bronze', 0, '["5% bonus points", "Birthday reward"]', '#CD7F32', 'medal', 1),
  ('silver', 'Silver', 5000, '["10% bonus points", "Priority support", "Free GPS on rentals"]', '#C0C0C0', 'award', 2),
  ('gold', 'Gold', 15000, '["15% bonus points", "Free upgrades", "Dedicated support line"]', '#FFD700', 'crown', 3),
  ('platinum', 'Platinum', 30000, '["25% bonus points", "Exclusive offers", "VIP lounge access"]', '#E5E4E2', 'gem', 4);

-- RLS policies
ALTER TABLE membership_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tiers" ON membership_tiers FOR SELECT USING (true);
CREATE POLICY "Admins can modify tiers" ON membership_tiers FOR ALL USING (is_admin_or_staff(auth.uid()));
```

### Step 2: Fix Points Settings Key Mapping
Update the frontend code to properly map between database snake_case keys and frontend camelCase keys.

**Files to modify:**
- `src/hooks/use-points.ts` - Add key mapping in `usePointsSettings()` and `useUpdatePointsSettings()`
- `src/hooks/use-bookings.ts` - Fix the inline settings parsing

**Key mapping approach:**
```typescript
const KEY_MAP: Record<string, keyof PointsSettings> = {
  earn_rate: 'earnRate',
  earn_base: 'earnBase',
  redeem_rate: 'redeemRate',
  redeem_rules: 'redeemRules',
  expiration: 'expiration',
};

// When reading from DB:
const mappedKey = KEY_MAP[row.setting_key];
if (mappedKey) {
  settings[mappedKey] = row.setting_value;
}

// When writing to DB:
const REVERSE_KEY_MAP: Record<keyof PointsSettings, string> = {
  earnRate: 'earn_rate',
  earnBase: 'earn_base',
  redeemRate: 'redeem_rate',
  redeemRules: 'redeem_rules',
  expiration: 'expiration',
};
```

### Step 3: Retroactively Award Points for Completed Bookings
Create an admin action or one-time script to award points for already-completed bookings that didn't get points.

**Option A:** Add a "Sync Missing Points" button in admin settings
**Option B:** Run a database function to backfill

### Step 4: Real-time Points Updates
Ensure the customer dashboard refreshes points when they change by adding `points_ledger` and `profiles` to the realtime subscription.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/use-points.ts` | Add KEY_MAP for snake_case to camelCase conversion in settings hooks |
| `src/hooks/use-bookings.ts` | Fix inline settings parsing to use same key mapping |
| `src/components/admin/PointsSettingsPanel.tsx` | Ensure save uses correct key format |
| **Database Migration** | Create `membership_tiers` table with seed data and RLS |

---

## Testing Verification

After implementation:
1. Visit Admin Settings page - should show Membership Tiers panel without errors
2. Check that points settings are loaded correctly (not using defaults)
3. Mark a booking as "completed" - verify points are awarded
4. Check customer dashboard - verify points balance updates
5. Try editing membership tier benefits - verify changes persist

---

## Technical Notes

- The `update_points_balance` database function already exists and works correctly
- RLS policies for `points_ledger` and `points_settings` are already in place
- The `profiles` table already has the necessary membership columns
