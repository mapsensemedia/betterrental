# Admin UI Refresh + Clean Payments Tab

Apply the clean TEST BACKEND look (shown in your screenshots) to the C2C admin shell, and strip the Payments page down to real, ledger-sourced data only — no demo alerts, no fabricated KPIs.

## 1. Shell visual refresh (matches screenshots)

Keep all existing routes and capabilities. Only restyle.

- **Sidebar** — narrower (240 → 232px), white/light surface, grouped with small uppercase labels: `OVERVIEW`, `ACTIVE WORK` (red label), `FLEET & ASSETS`, `MONEY & BILLING`, `CUSTOMER SERVICE`, `INSIGHTS & REPORTS`, `ADMINISTRATION`. Active item = solid dark pill (`bg-foreground text-background`), inactive = muted text + hover. Lucide icons, 16px.
- **Brand block** — "C2C RENTAL" + "Admin Console" subtitle (current logo stays).
- **Top bar** — single full-width search input (centered, muted background), help icon, avatar pill with email prefix + logout icon. Current date filter moves into the pages that actually use it (Finance, Reports) instead of living globally.
- **Active pill badges** — keep current `useSidebarCounts`; only the styling changes (red rounded badge on Alerts, neutral pill on others).
- New `Today` link at the top of the OVERVIEW group, pointing to existing `/admin` overview for now (no new page in this pass).

Files: `src/components/layout/AdminShell.tsx`, plus minor tokens in `src/index.css` if needed (semantic tokens only — no hardcoded colors).

## 2. Payments page cleanup (`/admin/finance`)

Goal: only show numbers that come from the real ledger. Anything that isn't backed by `payments` / `final_invoices` / `deposit_ledger` is removed.

**Keep:**

- Page header "Payments — Revenue, deposits, cash position, and settlement, all sourced from the ledger."
- Tabs: `Overview`, `Transactions`, `Cash Position`, `Batch Close` (existing).
- 4 KPI cards on Transactions: **Gross Revenue**, **Pending**, **Deposits Held**, **Invoices** — recomputed from:
  - Gross Revenue = sum of `payments.amount` where `status in ('succeeded','captured')` for the active date range.
  - Pending = sum of `payments.amount` where `status = 'pending'`.
  - Deposits Held = sum of `deposit_ledger` net per booking where state = `authorized` (existing helper).
  - Invoices = count of `final_invoices` in range.
- Sub-tabs: `Invoices`, `Receipts`, `Payments`, `Deposits` with **real counts** from the same queries (no hardcoded `(110)` / `(40)` if those are stale — recompute).
- Transactions table columns: TXN # · Customer · Booking (link) · Amount · Method · Status · Date · Actions (view / download receipt if present).

**Remove / fix (the "fake/unwanted" parts):**

- Any KPI that currently shows `$0.00` because it's wired to a placeholder rather than a query — either remove the card or hide it when the underlying query returns no data, with a small "No data for selected range" caption instead of a misleading zero.
- The "Show test data" toggle stays only if it actually filters; otherwise remove.
- Remove any alert banner on this page that isn't generated from `admin_alerts` (e.g., demo "Pending: $X needs attention" strips).
- Remove duplicate or stale "TERM-TEST-…" rows from the default view by filtering out `payments.method = 'terminal_test'` and any row where `booking_id is null` AND `metadata->>'simulated' = 'true'`. Real terminal pending rows stay.
- Trim the page-level alert/toast noise: only show toasts on user actions (refresh, export). No background "polling failed" toasts unless the query errors twice in a row.

**No business-logic changes:** integer-cents math, monotonic statuses, Worldline flow, deposit lifecycle, and edge-function writes are untouched. This is read-side cleanup + UI.

Files: `src/pages/admin/Finance.tsx` and the small components it imports under `src/components/admin/finance/*`. Query hooks (`use-payments`, `use-collected-revenue`, `use-deposit-ledger`) get filter args but no schema or RLS edits.

## 3. Inventory page polish (matches second screenshot)

Just a visual pass on the existing `All Vehicles` tab:

- 4 stat cards at top: Total Vehicles · Available · On Rental · In Maintenance — counted from the already-loaded query.
- Filter row: search · class · status · location (existing controls, restyled into a single card).
- Table gets a small photo column (uses `vehicles.hero_photo_url` if present, placeholder otherwise — no schema change).
- "Add Vehicle" button stays top-right.

Files: `src/components/admin/fleet/AllVehiclesTable.tsx`.

## Out of scope (call out, don't build)

- Merging `/ops` and `/admin`.
- New `Today` dashboard with activity feed (can do in a follow-up).
- Any change to booking, pricing, deposits, edge functions, RLS, or schema.

## Open questions

1. On Payments, should "Gross Revenue" follow the global date filter (Today / 24h / Week / All) or always show "this month to date"?  
Answer: Always Month to date but also allow the user to chnage filter
2. For the demo `TERM-TEST-…` rows — hide them by default with a "Show test transactions" toggle, or delete the filter entirely and rely on production data only?  
Answer: Rely on production data only 
3. Keep the existing `/admin` Overview page as-is, or also strip its KPIs to ledger-backed numbers in this same pass?  
Answer Keep it as is   
  
Make sure no previous data, bookins payments or any other things is affected 