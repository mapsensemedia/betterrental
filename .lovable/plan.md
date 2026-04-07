

## Redirect /admin → /admin/alerts

### Changes

**File: `src/App.tsx`**

1. Replace line ~156 (`<Route path="/admin" element={<AdminProtectedRoute><AdminOverview /></AdminProtectedRoute>} />`) with:
   ```tsx
   <Route path="/admin" element={<Navigate to="/admin/alerts" replace />} />
   ```

2. Remove the lazy import for `AdminOverview` (line ~63):
   ```tsx
   const AdminOverview = lazy(() => import("./pages/admin/Overview"));
   ```
   No other route references `AdminOverview`, so it's safe to remove.

No other files or routes affected.

