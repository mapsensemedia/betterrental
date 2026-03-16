

## Fix: Pickups Query Overlap & Cache Invalidation

### Problem
1. **Pickups shows overdue confirmed bookings** — queries `status = confirmed` with no start_at filter, so past-start bookings appear as "overdue"
2. **Active Rentals shows confirmed bookings that were never activated** — the `tab === "active"` filter includes `confirmed AND start_at <= now`, which auto-promotes unactivated bookings
3. **Cache not invalidated** — `useUpdateBookingStatus` doesn't invalidate `ops-pickups`, `ops-active-rentals`, or `ops-returns`

### User's clarification
Bookings should only appear in Active Rentals after staff explicitly clicks "Activate Rental." They should NOT auto-appear just because `start_at` has passed. Instead, they should remain in Pickups (with overdue styling) until activated.

### Changes

#### 1. `src/domain/bookings/queries.ts` — Remove auto-promotion from active tab
**Line 73-75**: Change the `tab === "active"` filter from `status.eq.active OR (confirmed AND start_at <= now)` to just `status.eq.active`. Same for `tab === "returns"` on lines 76-78.

```
// Before
} else if (filters.tab === "active") {
    const now = new Date().toISOString();
    query = query.or(`status.eq.active,and(status.eq.confirmed,start_at.lte.${now})`);
} else if (filters.tab === "returns") {
    const now = new Date().toISOString();
    query = query.or(`status.eq.active,and(status.eq.confirmed,start_at.lte.${now})`);

// After
} else if (filters.tab === "active") {
    query = query.eq("status", "active");
} else if (filters.tab === "returns") {
    query = query.eq("status", "active");
```

Pickups query (line 72) stays as `status.eq.confirmed` — no change needed. Overdue confirmed bookings correctly remain in pickups with red styling until staff activates them.

#### 2. `src/hooks/use-bookings.ts` — Add ops query key invalidations
**Lines 293-300**: Add three invalidations so ops views refresh after activation:

```typescript
queryClient.invalidateQueries({ queryKey: ["ops-pickups"] });
queryClient.invalidateQueries({ queryKey: ["ops-active-rentals"] });
queryClient.invalidateQueries({ queryKey: ["ops-returns"] });
```

### What stays unchanged
- Pickups query (`tab === "pickups"` and OpsPickups page) — confirmed bookings stay there with overdue styling until activated
- Full and manual handover activation paths
- Delivery flow

