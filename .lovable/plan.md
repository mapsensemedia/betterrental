

## Dynamic Protection Pricing by Vehicle Category Group

### Overview
Currently, protection plan pricing is flat -- the same rates apply regardless of vehicle category. This plan introduces **three vehicle groups** with distinct protection pricing tiers, so larger/more expensive vehicles have appropriately higher protection costs.

### Vehicle Groups

| Group | Categories | Basic | Smart | All-Inclusive |
|-------|-----------|-------|-------|---------------|
| Group 1 | Mystery Car, Compact, Mid-Size Sedan, Full-Size Sedan, Mid-Size SUV | $32.99/day | $37.99/day | $49.99/day |
| Group 2 | Minivan, Standard SUV | $52.99/day | $57.99/day | $69.99/day |
| Group 3 | Large SUV | $64.99/day | $69.99/day | $82.99/day |

Deductibles remain consistent per plan tier: Basic = $800, Smart/All-Inclusive = $0.
Roadside assistance is only included in All-Inclusive.

### Technical Approach

**1. New utility: `src/lib/protection-groups.ts`**
- Define the 3 groups with category name matching logic
- Export a `getProtectionGroup(categoryName: string): 1 | 2 | 3` function
- Export a `getGroupProtectionPackages(group: number): ProtectionPackage[]` function that returns properly priced packages for each group
- The group matching will use substring matching on category names (e.g. "LARGE SUV" maps to Group 3, "MINIVAN" or "STANDARD SUV" to Group 2, everything else to Group 1)

**2. Update `src/hooks/use-protection-settings.ts`**
- Modify `useProtectionPackages()` to accept an optional `categoryName` parameter
- The hook will call `getProtectionGroup()` to determine the group, then return group-specific packages
- The `system_settings` table rates become the Group 1 defaults; Group 2 and Group 3 rates are derived from the new utility
- `buildProtectionPackages()` will accept an optional group parameter

**3. Update consumer pages to pass category name**

- **`src/pages/Protection.tsx`**: Already has `category` data. Pass `category.categoryName` (or the vehicle name) to `useProtectionPackages(categoryName)`.
- **`src/pages/AddOns.tsx`**: Same -- pass the category name so the correct protection rate is used in pricing calculations.
- **`src/pages/NewCheckout.tsx`**: Pass category name for correct rate lookup.
- **`src/components/shared/TotalBar.tsx`**: Already has vehicle data; pass category name.
- **`src/components/rental/BookingSummaryPanel.tsx`**: Pass category name to get correct protection rates.
- **`src/components/admin/ops/ProtectionChangePanel.tsx`**: Will need the booking's vehicle category to show correct group pricing. Will need to fetch or receive the category name.

**4. Admin panel (`src/components/admin/ProtectionPricingPanel.tsx`)**
- Update to show all 3 groups' pricing so admins can see the full structure
- Initially these will be code-defined rates (not in `system_settings`), keeping things simple. Future enhancement could store all group rates in `system_settings`.

### Database Changes
- **No database migrations required.** The group-to-pricing mapping is purely in code. The `protection_plan` field on bookings continues to store just the plan ID (none/basic/smart/premium), and the actual rate charged is already stored in the booking's financial totals.

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/protection-groups.ts` | **Create** - Group definitions and pricing lookup |
| `src/hooks/use-protection-settings.ts` | **Modify** - Accept category name, return group-specific packages |
| `src/pages/Protection.tsx` | **Modify** - Pass category name to hook |
| `src/pages/AddOns.tsx` | **Modify** - Pass category name for correct rate |
| `src/pages/NewCheckout.tsx` | **Modify** - Pass category name for correct rate |
| `src/components/shared/TotalBar.tsx` | **Modify** - Pass category name |
| `src/components/rental/BookingSummaryPanel.tsx` | **Modify** - Pass category name |
| `src/components/admin/ops/ProtectionChangePanel.tsx` | **Modify** - Use booking's vehicle category for group pricing |
| `src/components/admin/ops/OpsBookingSummary.tsx` | **Modify** - Use category-aware rates for display |
| `src/components/admin/ProtectionPricingPanel.tsx` | **Modify** - Show grouped pricing |
| `src/lib/pricing.ts` | **Modify** - Update static `PROTECTION_PACKAGES` defaults to Group 1 rates |

