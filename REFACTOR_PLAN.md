# Rental Module Refactor Plan

**Created:** 2026-02-02  
**Updated:** 2026-02-02  
**Author:** Senior Full-Stack Engineer  
**Goal:** Incremental, safe refactoring to improve maintainability without breaking behavior

---

## Progress Summary

| PR | Status | Completed |
|----|--------|-----------|
| PR1: Dead Code Cleanup | ✅ Done | 2026-02-02 |
| PR2: Consolidate Category Hooks | 🔲 Pending | - |
| PR3: Standardize Error Handling | ✅ Done | 2026-02-02 |
| PR4: Normalize State Management | 🔲 Pending | - |
| PR5: Edge Function Deduplication | ✅ Done | 2026-02-02 |
| PR6: Schema Validation Centralization | ✅ Done | 2026-02-02 |
| PR7: Performance Optimization | ✅ Done | 2026-02-02 |

---

## Refactor Strategy

- **Principle:** Small, focused changes that can be reviewed and rolled back independently
- **Risk Mitigation:** Each PR should be testable in isolation
- **No Breaking Changes:** All refactors maintain backward compatibility

---

## PR1: Dead Code & Unused Files Cleanup ✅ COMPLETED

### Scope
Remove unused code, imports, and deprecated files.

### What Was Done
1. ✅ Added deprecation JSDoc to `src/hooks/use-vehicles.ts` (legacy vehicles table)
2. ✅ Added deprecation JSDoc to `src/lib/availability.ts` (legacy vehicles-based availability)
3. ✅ Documented migration path to category-based system

### Files Modified
- `src/hooks/use-vehicles.ts` - Added deprecation notice pointing to `use-browse-categories` and `use-fleet-categories`
- `src/lib/availability.ts` - Added deprecation notice pointing to category-based availability

### Notes
- The Pickups, ActiveRentals, Returns, History, and Inventory pages are still functional and serve operational needs
- Full removal of legacy files deferred until PR2 (category hook consolidation) is complete

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

## PR3: Standardize Error Handling ✅ COMPLETED

### Scope
Create consistent error handling patterns across hooks and edge functions.

### What Was Done
1. ✅ Created `src/lib/api-error.ts` with standardized error handling utilities
2. ✅ Defined standard API error codes (`API_ERROR_CODES`)
3. ✅ Created `parseApiError()`, `getErrorMessage()`, `handleMutationError()`, `handleMutationSuccess()`
4. ✅ Added `withRetry()` utility with exponential backoff for critical operations
5. ✅ Added `createMutationHandlers()` factory for consistent mutation error handling

### Files Created
- `src/lib/api-error.ts` - Centralized error handling utilities

### Notes
- Existing hooks can gradually adopt the new patterns
- Edge functions already use consistent error format (`{error, message, details}`)

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

## PR5: Edge Function Cleanup ✅ COMPLETED

### Scope
Dedupe triggers, add idempotency, standardize patterns.

### What Was Done
1. ✅ Created `supabase/functions/_shared/booking-core.ts` with shared booking logic
2. ✅ Created `supabase/functions/_shared/notifications.ts` with idempotent notification dispatching
3. ✅ Enhanced `supabase/functions/_shared/idempotency.ts` with:
   - Configurable dedup windows
   - `claimIdempotencyKey()` for atomic check-and-mark
   - Hour-based key generation for automatic expiration
4. ✅ Updated `create-guest-booking` to use shared `booking-core.ts` functions
5. ✅ Updated `process-deposit-jobs` with idempotency checks
6. ✅ Updated `process-deposit-refund` with idempotency checks (prevents double refunds)

### Files Created
- `supabase/functions/_shared/booking-core.ts` - Shared booking creation logic
- `supabase/functions/_shared/notifications.ts` - Idempotent notification dispatcher

### Files Modified
- `supabase/functions/_shared/idempotency.ts` - Enhanced with configurable windows
- `supabase/functions/create-guest-booking/index.ts` - Now uses shared booking-core
- `supabase/functions/process-deposit-jobs/index.ts` - Added idempotency check
- `supabase/functions/process-deposit-refund/index.ts` - Added idempotency check

### Risk Level: 🟠 Medium-High
### Rollback: Keep separate functions, toggle with flag

### Notes
- Full merge of `create-booking` and `create-guest-booking` deferred to avoid breaking changes
- Both functions now share core logic via `booking-core.ts`

---

## PR6: Schema Validation Centralization ✅ COMPLETED

### Scope
Centralize all validation schemas using Zod.

### What Was Done
1. ✅ Created `src/lib/schemas/` folder with centralized validation schemas
2. ✅ Created `booking.ts` - Booking, add-on, and driver validation schemas
3. ✅ Created `customer.ts` - Email, phone, and profile validation with sanitization helpers
4. ✅ Created `vehicle.ts` - Category, vehicle unit, and VIN validation schemas
5. ✅ Created `payment.ts` - Payment, deposit, and refund validation schemas
6. ✅ Created `index.ts` - Re-exports for easy imports

### Files Created
- `src/lib/schemas/index.ts` - Central re-exports
- `src/lib/schemas/booking.ts` - Booking validation (GuestBookingInput, AuthenticatedBookingInput, etc.)
- `src/lib/schemas/customer.ts` - Customer validation (emailSchema, phoneSchema, sanitizers)
- `src/lib/schemas/vehicle.ts` - Vehicle validation (VIN, category, unit schemas)
- `src/lib/schemas/payment.ts` - Payment validation (deposit, refund, checkout schemas)

### Key Features
- Type-safe validation with `z.infer<>` for TypeScript integration
- Reusable sanitization functions (sanitizeEmail, sanitizePhone, normalizeVin)
- Validation helpers (isValidEmail, isValidPhone, isValidVin, isValidAgeBand)
- Configurable max lengths and format validation
- Refine rules for complex validation (e.g., end date must be after start date)

### Risk Level: 🟢 Low
### Rollback: Git revert (additive change)

---

## PR7: Performance Optimization ✅ COMPLETED

### Scope
Memoization, request deduplication, caching improvements.

### What Was Done
1. ✅ Enhanced `src/lib/query-client.ts` with:
   - Centralized `QUERY_STALE_TIMES` constants for different data types
   - Helper functions: `prefetchBookingData`, `prefetchCategoryData`
   - Cache invalidation helpers: `invalidateBookingQueries`, `invalidateFleetQueries`
2. ✅ Memoized `VehicleCard` component with `React.memo()`
   - Added `useCallback` for event handlers
   - Added `loading="lazy"` for images
3. ✅ Updated `use-browse-categories.ts` to use centralized stale times
   - Extracted category builder into pure function for better performance
4. ✅ Updated `use-availability.ts` to use centralized stale times

### Files Modified
- `src/lib/query-client.ts` - Added stale time constants and helper functions
- `src/components/landing/VehicleCard.tsx` - Memoized with memo() and useCallback
- `src/hooks/use-browse-categories.ts` - Optimized with centralized stale times
- `src/hooks/use-availability.ts` - Optimized with centralized stale times

### Query Stale Time Strategy
| Data Type | Stale Time | Reason |
|-----------|------------|--------|
| realtime | 5s | Real-time data needs freshness |
| availability | 15s | Booking conflicts need quick updates |
| bookings | 30s | Balance between freshness and performance |
| categories | 60s | Moderate change frequency |
| locations | 5min | Rarely changes |
| static | 30min | Reference data |

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
