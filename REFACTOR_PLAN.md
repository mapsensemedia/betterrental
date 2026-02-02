# Rental Module Refactor Plan

**Created:** 2026-02-02  
**Author:** Senior Full-Stack Engineer  
**Goal:** Incremental, safe refactoring to improve maintainability without breaking behavior

---

## Refactor Strategy

- **Principle:** Small, focused changes that can be reviewed and rolled back independently
- **Risk Mitigation:** Each PR should be testable in isolation
- **No Breaking Changes:** All refactors maintain backward compatibility

---

## PR1: Dead Code & Unused Files Cleanup

### Scope
Remove unused code, imports, and deprecated files.

### Files to Clean

| File | Action | Reason |
|------|--------|--------|
| `src/hooks/use-vehicles.ts` | Add deprecation notice | Legacy - categories are primary now |
| `src/lib/availability.ts` | Review for removal | Uses legacy vehicles table |
| `src/pages/admin/Pickups.tsx` | Verify redirect works | Redirects to Bookings |
| `src/pages/admin/ActiveRentals.tsx` | Verify redirect works | Redirects to Bookings |
| `src/pages/admin/Returns.tsx` | Verify redirect works | Redirects to Bookings |
| `src/pages/admin/History.tsx` | Verify redirect works | Redirects to Bookings |
| `src/pages/admin/Inventory.tsx` | Verify redirect works | Redirects to Fleet |

### Unused Imports to Remove (Examples)
Run ESLint `no-unused-vars` across:
- All page components
- All hook files
- Utility libraries

### Risk Level: 🟢 Low
### Rollback: Git revert

### Tasks
1. Run unused import checker across codebase
2. Remove clearly unused imports
3. Add deprecation JSDoc to legacy files
4. Update imports in files that reference deprecated code
5. Test all affected routes

---

## PR2: Consolidate Category Hooks

### Scope
Merge 3 category hooks into unified architecture.

### Current State
```
use-vehicle-categories.ts (251 lines) - Admin CRUD
use-fleet-categories.ts (464 lines) - Admin + VIN ops
use-browse-categories.ts (145 lines) - Customer browse
```

### Target State
```
use-categories/
├── index.ts          - Re-exports
├── types.ts          - Shared interfaces
├── queries.ts        - Base query hooks
├── mutations.ts      - CRUD mutations
└── customer.ts       - Customer-facing availability
```

### New API
```typescript
// Customer flow
useCategoryAvailability(locationId, startAt, endAt)

// Admin flow
useCategories()
useCategoryById(id)
useCategoryMutations() // create, update, delete
useCategoryVins(categoryId)
```

### Migration Steps
1. Create new `use-categories/` folder structure
2. Move shared types to `types.ts`
3. Create `queries.ts` with base `useCategories` hook
4. Create `mutations.ts` with CRUD operations
5. Create `customer.ts` with availability logic
6. Update imports in consuming components (one at a time)
7. Deprecate old hooks
8. Remove old hooks after migration complete

### Risk Level: 🟡 Medium
### Rollback: Feature flag or parallel implementation

### Files Affected
- `src/hooks/use-vehicle-categories.ts` → Deprecate
- `src/hooks/use-fleet-categories.ts` → Deprecate
- `src/hooks/use-browse-categories.ts` → Deprecate
- `src/hooks/use-categories/` → New
- ~15 component files that import these hooks

---

## PR3: Standardize Error Handling

### Scope
Create consistent error handling patterns across hooks and edge functions.

### Current Issues
- Some hooks return null on error
- Some hooks throw
- Some show toast, some don't
- Edge functions return different error formats

### Target Pattern

#### Hook Error Handling
```typescript
// Standard hook return type
interface HookResult<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
}

// Standard mutation hook pattern
useMutation({
  onSuccess: () => {
    queryClient.invalidateQueries(...);
    toast.success("Action completed");
  },
  onError: (error) => {
    console.error("Action failed:", error);
    toast.error(error.message || "Something went wrong");
  },
});
```

#### Edge Function Error Format
```typescript
// Standard error response
{
  error: string,          // Machine-readable code
  message: string,        // Human-readable message
  details?: unknown,      // Optional debug info
}

// Standard success response
{
  success: true,
  data: { ... },
}
```

### Files to Update
- All hooks in `src/hooks/`
- All edge functions in `supabase/functions/`

### Risk Level: 🟡 Medium
### Rollback: Individual file reverts

---

## PR4: Normalize State Management

### Scope
Standardize when to use local state vs global context vs URL params.

### Current Issues
- `RentalBookingContext` is 390 lines and handles too much
- Some state lost on navigation
- Inconsistent use of URL params

### Target Pattern

| State Type | Storage | Example |
|------------|---------|---------|
| Search criteria | URL params | `?locationId=x&startAt=y` |
| Selection state | Context | Selected vehicle, add-ons |
| Form data | Local state | Customer info, payment |
| Persisted data | Database | Bookings, payments |

### Refactor Plan

#### 4a: Split RentalBookingContext
```
RentalBookingContext (390 lines)
    ↓
SearchContext (~100 lines)     - Dates, location, delivery
SelectionContext (~100 lines)  - Vehicle, add-ons, drivers
PricingContext (~50 lines)     - Calculated totals (derived)
```

#### 4b: URL Param Sync
- Search params persisted to URL
- Can be shared/bookmarked
- Survives refresh

### Files Affected
- `src/contexts/RentalBookingContext.tsx` → Split
- All components that consume context

### Risk Level: 🟠 Medium-High
### Rollback: Keep old context as fallback

---

## PR5: Edge Function Cleanup

### Scope
Dedupe triggers, add idempotency, standardize patterns.

### Current Issues
- `create-booking` and `create-guest-booking` have duplicated logic
- Some notifications fire multiple times
- Inconsistent idempotency handling

### Target State

#### Unified Booking Creation
```
create-booking (unified)
├── Handles both guest and authenticated
├── Validates input with Zod
├── Creates booking atomically
├── Queues notifications (fire-and-forget)
└── Returns consistent response format
```

#### Notification Idempotency
```typescript
// Add idempotency key to all notifications
const idempotencyKey = `${bookingId}-${stage}-${Date.now()}`;
await sendNotification({ ..., idempotencyKey });
```

### Files to Update
- `supabase/functions/create-booking/index.ts`
- `supabase/functions/create-guest-booking/index.ts` → Merge into create-booking
- `supabase/functions/send-booking-notification/index.ts`
- Add `supabase/functions/_shared/notifications.ts`

### Risk Level: 🟠 Medium-High
### Rollback: Keep separate functions, toggle with flag

---

## PR6: Schema Validation Centralization

### Scope
Centralize all validation schemas using Zod.

### Current State
- Validation scattered across components
- Some validation in edge functions
- Some validation in hooks
- Inconsistent error messages

### Target State
```
src/lib/schemas/
├── index.ts           - Re-exports
├── booking.ts         - Booking validation
├── customer.ts        - Customer info validation
├── payment.ts         - Payment validation
└── vehicle.ts         - Vehicle/category validation
```

### Example Schema
```typescript
// src/lib/schemas/booking.ts
import { z } from "zod";

export const bookingInputSchema = z.object({
  categoryId: z.string().uuid(),
  locationId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  driverAgeBand: z.enum(["21_25", "25_70"]),
}).refine(
  (data) => new Date(data.endAt) > new Date(data.startAt),
  { message: "Return date must be after pickup date" }
);

export type BookingInput = z.infer<typeof bookingInputSchema>;
```

### Files to Create/Update
- `src/lib/schemas/` → New folder
- `src/pages/NewCheckout.tsx` → Use schemas
- `supabase/functions/create-guest-booking/index.ts` → Use schemas

### Risk Level: 🟢 Low
### Rollback: Git revert (additive change)

---

## PR7: Performance Optimization

### Scope
Memoization, request deduplication, caching improvements.

### Current Issues
- Some components re-render unnecessarily
- Some hooks refetch on every mount
- No request deduplication for parallel calls

### Optimizations

#### 7a: Query Deduplication
```typescript
// Already have in query-client.ts
staleTime: 30 * 1000,
gcTime: 10 * 60 * 1000,
```

Add to more queries.

#### 7b: Component Memoization
```typescript
// Wrap heavy components
const VehicleCard = memo(function VehicleCard({ vehicle }) {
  // ...
});
```

#### 7c: Lazy Loading
```typescript
// Split large admin pages
const FleetAnalytics = lazy(() => import('./FleetAnalytics'));
```

### Files to Update
- High-traffic components (VehicleCard, BookingSummaryPanel)
- Admin pages with many tabs
- Query configurations in hooks

### Risk Level: 🟢 Low
### Rollback: Remove memoization

---

## Implementation Order

| PR | Priority | Dependencies | Estimated Effort |
|----|----------|--------------|------------------|
| PR1 | 🔴 High | None | 2-3 hours |
| PR6 | 🔴 High | None | 3-4 hours |
| PR3 | 🟠 Medium | None | 4-5 hours |
| PR2 | 🟠 Medium | None | 6-8 hours |
| PR7 | 🟡 Low | None | 2-3 hours |
| PR4 | 🟡 Low | PR2 | 8-10 hours |
| PR5 | 🟡 Low | PR3, PR6 | 6-8 hours |

**Total Estimated Effort:** 31-41 hours

---

## Rollback Plans

### Per-PR Rollback
Each PR can be reverted independently using:
```bash
git revert <commit-hash>
```

### Feature Flags (for larger PRs)
```typescript
// src/lib/feature-flags.ts
export const FEATURES = {
  USE_NEW_CATEGORY_HOOKS: false,
  USE_UNIFIED_BOOKING: false,
  USE_SPLIT_CONTEXT: false,
};
```

### Blue-Green Deployment
For PR4 and PR5, maintain both old and new implementations during migration.

---

## Testing Strategy

### Per-PR Testing

| PR | Unit Tests | Integration Tests | E2E Tests |
|----|------------|-------------------|-----------|
| PR1 | N/A | Build passes | Smoke test routes |
| PR2 | Hook tests | API calls work | Booking flow |
| PR3 | Error format tests | Hook error states | Error UI |
| PR4 | Context tests | State persistence | Full flow |
| PR5 | Edge function tests | Webhook handling | Payment flow |
| PR6 | Schema validation | Edge function calls | Form validation |
| PR7 | N/A | Performance metrics | Load testing |

### Regression Testing
Run full E2E suite after each PR merge:
```bash
npx playwright test
```

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Duplicate hook files | 3 | 0 |
| Lines in RentalBookingContext | 390 | <150 |
| Edge functions with idempotency | 1 | 6 |
| Zod schemas coverage | ~20% | 100% |
| Components with memo | ~5% | 40% |

---

## Notes

- All PRs should be reviewed by at least one other developer
- Each PR should include updated tests if behavior changes
- Documentation should be updated as part of each PR
- Monitor error rates after each deployment
