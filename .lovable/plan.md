
## Fix: Remove 30-Day Cap on Finance Revenue — Add "All Time" + Custom Date Range

### Problem
The Finance Overview tab's date range selector maxes out at "Last 30 Days." Staff wanting to see total revenue earned to date have no way to do so, causing confusion.

### Solution
Add two new options to the existing date range selector — no new components or redundant code needed:

1. **"All Time"** preset — queries from a fixed business start date (e.g., Jan 1 2024) to now
2. **"Custom"** option — shows a compact date picker (two `<input type="date">`) inline next to the selector

### Changes

**File: `src/pages/admin/Finance.tsx`**

1. **Extend the `DateRange` type** (line 75):
   ```ts
   type DateRange = "today" | "yesterday" | "week" | "month" | "last30" | "all" | "custom";
   ```

2. **Update `getDateRange` helper** (lines 176-192) — add `"all"` case returning `start: new Date("2024-01-01")` to `end: endOfDay(now)`. The `"custom"` case won't use this function (handled by state).

3. **Add custom date state** to `OverviewTab` (after line 259):
   ```ts
   const [customStart, setCustomStart] = useState<Date>(startOfMonth(new Date()));
   const [customEnd, setCustomEnd] = useState<Date>(new Date());
   ```

4. **Update the `start`/`end` memo** (line 261) to use custom dates when `dateRange === "custom"`:
   ```ts
   const { start, end } = useMemo(() =>
     dateRange === "custom"
       ? { start: startOfDay(customStart), end: endOfDay(customEnd) }
       : getDateRange(dateRange),
     [dateRange, customStart, customEnd]
   );
   ```

5. **Add dropdown options** (lines 616-621) — add `<SelectItem value="all">All Time</SelectItem>` and `<SelectItem value="custom">Custom Range</SelectItem>`.

6. **Add inline date inputs** after the Select (around line 622) — conditionally rendered when `dateRange === "custom"`:
   ```tsx
   {dateRange === "custom" && (
     <div className="flex items-center gap-1.5">
       <Input type="date" className="h-9 w-[140px]" value={format(customStart, "yyyy-MM-dd")} onChange={...} />
       <span className="text-xs text-muted-foreground">to</span>
       <Input type="date" className="h-9 w-[140px]" value={format(customEnd, "yyyy-MM-dd")} onChange={...} />
     </div>
   )}
   ```

### What Does NOT Change
- No backend, edge function, or database changes
- `use-collected-revenue.ts` hook unchanged (it already accepts arbitrary date ranges)
- No new files or components
- All existing date range options continue to work identically
- Reports and Analytics tabs unaffected

### Files
| File | Action |
|------|--------|
| `src/pages/admin/Finance.tsx` | Extend DateRange type, update getDateRange, add custom state + UI |
