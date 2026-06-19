# Admin UI Style Standardization

Lock the look from the Payments and Inventory screenshots as the standard for every page under `/admin/*`. Pure presentation pass — no data, business logic, queries, or routes change.

## Visual rules (locked)

- **Surfaces**: page background `bg-muted/40` (soft off-white). All content blocks are white cards with `border border-border rounded-xl`, no heavy shadow.
- **Sidebar**: active item = solid dark pill (`bg-foreground text-background`), inactive = muted text + subtle hover. Already in place — leave as is.
- **Page header**: large bold H1 + one-line muted subtitle, primary action button top-right. One pattern, every page.
- **Tabs**: text labels with a 2px underline on the active tab (the Overview/Transactions/Cash Position/Batch Close pattern). Replace pill/segmented tabs elsewhere.
- **KPI cards**: uppercase muted label top-left, small tinted square icon top-right, large bold number, optional muted sub-label. Always in a 4-up grid on desktop, 2-up tablet, 1-up mobile.
- **Filter rows**: search + selects sit inside one white card above the table, never floating on the page background.
- **Tables**: white card, muted uppercase column headers, row dividers only (no vertical lines), badge pills for status.

## Shared primitives (new)

Create four small components so every page renders the same shell without per-page restyling:

1. `src/components/admin/ui/PageHeader.tsx` — `{ title, subtitle?, action? }`
2. `src/components/admin/ui/StatCard.tsx` — `{ label, value, icon, tone?, sublabel? }` with tone-tinted icon chip
3. `src/components/admin/ui/StatGrid.tsx` — responsive 4-up wrapper
4. `src/components/admin/ui/UnderlineTabs.tsx` — thin wrapper around shadcn `Tabs` that styles `TabsList`/`TabsTrigger` with the underline treatment

These are pure styling. No new state, no new data.

## Pages to convert

Every route mounted under `AdminShell`:

```text
Today (Overview)        Ops / BookingOps        ActiveRentals
Pickups   Returns        Handovers              Alerts
Inventory*              FleetCategories          FleetCosts
FleetAnalytics          FleetManagement          Incidents / Damages
Payments (Finance)*     Agreements               Billing / Invoices
Offers                  Customers / Verifications  Vendors
Reports / Analytics     SupportV2 / Tickets / SupportAnalytics
AuditLogs   History   Settings   AbandonedCarts
```

`*` already match the target style and become the reference. Every other page is rewritten to use the four primitives above — header, stat grid, filter card, table card, underline tabs.

## Out of scope (explicit)

- No changes to data fetching, mutations, RLS, edge functions, or routing.
- No changes to KPI sources or formulas. If a card currently shows `$0.00` from a placeholder it stays `$0.00` — only the visual container changes. (Cleanup of placeholder KPIs and test-row filtering is **not** included in this pass per your selection.)
- No sidebar restructuring. Active pill already matches.
- Customer-facing booking site untouched.

## Rollout

1. Build the four primitives + a Storybook-style demo page is unnecessary — verify visually on Payments/Inventory first (they should look unchanged).
2. Convert pages in this order, one PR-sized chunk per group: Overview & Ops → Fleet group → Money & Billing → Customer Service → Insights/Settings.
3. After each group: scan the route, confirm no functional regression (counts, actions, filters all still wired), move on.

## Risks

- Pages with custom dense layouts (BookingOps, ActiveRentals, Reports) may need a "wide table" variant of the card — handled inline, not a new primitive.
- Some pages currently use shadcn `Card` with shadow; swapping to the flat bordered card is a className change only.

Approve and I'll start with the four primitives and the Overview/Ops group.
