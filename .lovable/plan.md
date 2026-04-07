

## Remove Activity Tab from Reports Page

### Changes — `src/pages/admin/Reports.tsx`

**1. Remove imports (line 68)**
- Delete `useAuditLogs, useAuditStats, type AuditLog` import from `@/hooks/use-audit-logs`
- Remove `formatDistanceToNow` from date-fns import (only used by AuditLogItem)

**2. Remove unused icon imports (line 15-45)**
- Remove icons only used by audit: `History`, `User`, `ChevronDown`, `ChevronUp` (verify none used elsewhere first)
- Remove `Collapsible, CollapsibleContent, CollapsibleTrigger` imports (lines 53-63) if only used by AuditLogItem

**3. Remove constants and components (lines 106-178)**
- Delete `ACTION_CONFIG` object
- Delete `getActionConfig` function
- Delete `formatActionLabel` function
- Delete `AuditLogItem` component

**4. Remove state variables (lines 185-187)**
- Delete `auditSearch`, `auditCategoryFilter`, `entityFilter` state declarations

**5. Remove data hooks (lines 228-229)**
- Delete `useAuditLogs` call (`logs`, `logsLoading`, `refetchLogs`)
- Delete `useAuditStats` call (`auditStats`)

**6. Remove derived data (lines 408-432)**
- Delete `NOISE_ACTIONS` constant
- Delete `filteredLogs` useMemo
- Delete `entityTypes` useMemo

**7. Remove tab trigger (lines 535-538)**
- Delete the `<TabsTrigger value="audit">Activity</TabsTrigger>`

**8. Remove tab content (lines 841-909)**
- Delete the entire `<TabsContent value="audit">` block

**9. Update subtitle (line 445)**
- Change "Revenue, conversions, fleet utilization & activity logs" → "Revenue, conversions & fleet utilization"

### Files
| File | Change |
|------|--------|
| `src/pages/admin/Reports.tsx` | Remove Activity tab, its component, hooks, state, and constants |

