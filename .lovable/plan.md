
# Admin Fleet — 3-Tab Restructure + Collapsible Sidebar

Goal: Make `/admin/fleet` more usable on wide tables and add two new views — a flat "All Vehicles" master list and a "Temporary Vehicles" register — without changing any booking, pricing, or financial behavior.

## What changes (and what does NOT)

**Changes (UI + a tiny schema additive):**
- New tabbed layout on Fleet Management page.
- Admin sidebar can be collapsed/expanded from the page header so wide tables fit.
- New "All Vehicles" master table.
- New "Temporary Vehicles" register (additive `is_temporary` flag + optional `temp_*` metadata on `vehicle_units`).

**Does NOT change:**
- Booking flow, pricing engine, pro‑rata logic, Worldline, deposits, RLS triggers.
- Category → VIN pool model (it stays; the new tabs are alternate views of the same `vehicle_units` table).
- Existing soft‑archive delete fallback (kept exactly as is).
- Drop‑off fees, locations, status enum semantics for active rentals.

---

## Tab 1 — Fleet Management (Categories) — **redesigned, same data**

Keeps current category + VIN pool functionality. UI improvements only:

```text
┌─ Fleet ────────────────────────────────────────[ ⇆ Hide sidebar ]─┐
│ [ Categories ] [ All Vehicles ] [ Temporary ]                     │
│                                                                   │
│  ┌─ Categories (left, 320px, collapsible) ─┬─ Category detail ──┐ │
│  │ 🔍 search                               │ Economy            │ │
│  │ • Economy            8/12 avail         │ Daily $45 · 12 VINs│ │
│  │ • Compact            3/6                │ [+ Add VIN]        │ │
│  │ • SUV                2/4                │                    │ │
│  │ [+ New category]                        │ VIN table…         │ │
│  └─────────────────────────────────────────┴────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

Improvements vs today:
- Sticky header with a "Hide sidebar" toggle (calls existing `useSidebar().setOpen(false)`).
- Left category rail is itself collapsible to a 56px icon strip.
- Status chips and counts aligned right; row click opens detail in the right pane instead of navigating away.

## Tab 2 — All Vehicles (new)

A flat, filterable master list of every permanent unit in `vehicle_units` where `is_temporary = false`.

Columns (in this order):
1. **Vehicle** — `{year} {make} {model}` (from joined `vehicles`)
2. **License Plate**
3. **VIN**
4. **Location** — Abbotsford / Surrey / Langley (from `locations.name`)
5. **Kilometers** — `current_mileage`
6. **Status** — colored badge (Available / On Rent / Maintenance / Damage / Retired)
7. **Actions** — Edit · Delete (kebab menu)

```text
┌─ All Vehicles ────────────────────────────────────────────────────┐
│ 🔍 Search VIN/plate   [Location ▾] [Status ▾] [Category ▾]  [+ Add]│
├───────────────────────────────────────────────────────────────────┤
│ Vehicle           Plate    VIN              Location   KM    Status│
│ 2023 Toyota Corolla  BC-1234  1HGCM82…   Surrey   42,310  ● Avail │
│ 2022 Honda Civic     BC-5588  2T1BURH…   Langley  88,902  ● Rent  │
│ 2024 RAV4            BC-9001  JTMRWRF…   Abbots.  12,440  ● Maint │
│ …                                                              ⋮  │
└───────────────────────────────────────────────────────────────────┘
                                              Showing 1–25 of 87  ‹›
```

Features:
- **Add vehicle** — opens existing `VinFormDialog` (category required, all current validation intact).
- **Edit** — inline drawer to update plate, VIN, mileage, location, status, notes. Uses existing `useUpdateVehicleUnit` which already surfaces clear errors (duplicate VIN/plate, permission).
- **Delete** — uses existing `useDeleteVehicleUnit`: blocks if pending/confirmed/active booking on the unit (lists booking codes); otherwise hard delete; if historical FKs exist, **soft‑archives** to `status = retired` and clears `location_id`. No change to this logic.
- **CSV export** of the current filtered view (client‑side, no backend).
- URL‑synced filters (`?loc=&status=&q=`) so views are shareable.

## Tab 3 — Temporary Vehicles (new)

For short‑term rentals you don't own (loaner from vendor, partner unit, etc.). Stored in the same `vehicle_units` table with `is_temporary = true` so all booking/assignment plumbing keeps working.

Extra columns vs Tab 2:
- **Source** (vendor / owner name) — `temp_source`
- **Start date** — `temp_start_date`
- **End date** — `temp_end_date` (badge turns amber within 3 days, red if past)
- **Daily cost to us** — `temp_daily_cost` (informational; does NOT touch customer pricing)

```text
┌─ Temporary Vehicles ──────────────────────────────────────────────┐
│ [+ Add temporary vehicle]                Showing active only ☑    │
├───────────────────────────────────────────────────────────────────┤
│ Vehicle        Plate   Source        Location  Ends      Status   │
│ 2023 Sienna    BC-TMP1 Enterprise    Surrey    Jun 28 ⚠ ● Avail   │
│ 2022 Kona      BC-TMP2 Owner: Raj    Langley   Jul 10    ● Rent   │
└───────────────────────────────────────────────────────────────────┘
```

Features:
- **Add** — dedicated dialog: vendor/source, start/end, category, plate, VIN (VIN optional → auto‑generated `TMP-<8>` placeholder if missing, since VIN is NOT NULL today).
- **Return / Remove** — one‑click "Return to vendor" sets `actual_disposal_date = today`, status → `retired`, and hides from default view. Real delete only allowed if the unit has zero bookings (same rules as Tab 2).
- A nightly check (existing pattern) could flag temps past `temp_end_date`; out of scope for this change but the data supports it.

---

## Collapsible sidebar

`AdminShell` already wraps content in `SidebarProvider`. Add a `SidebarTrigger` to the Fleet page header so a single click hides the left admin nav and gives the table full width. State persists per session via the existing sidebar cookie.

---

## Safety & permissions

- All add/edit/delete go through existing hooks (`useDeleteVehicleUnit`, `useUpdateVehicleUnit`, `useCreateVehicleUnit`) which respect RLS and the active‑booking guard.
- **You can delete a vehicle** only when it has no pending/confirmed/active bookings. If it has historical bookings/invoices, the system **archives** it (status = `retired`) so finance history stays intact — no FK breakage, no lost revenue records.
- **You can edit** plate, VIN, mileage, location, status, notes at any time; duplicates and permission errors are surfaced verbatim.
- Temporary flag is purely a view filter + metadata; it does not alter availability, pricing, deposits, or assignment.

---

## Technical details

Schema (single additive migration, no destructive changes):
```sql
ALTER TABLE public.vehicle_units
  ADD COLUMN IF NOT EXISTS is_temporary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS temp_source text,
  ADD COLUMN IF NOT EXISTS temp_start_date date,
  ADD COLUMN IF NOT EXISTS temp_end_date date,
  ADD COLUMN IF NOT EXISTS temp_daily_cost numeric;
CREATE INDEX IF NOT EXISTS idx_vehicle_units_is_temporary
  ON public.vehicle_units(is_temporary) WHERE is_temporary = true;
```
No RLS or GRANT changes needed (existing policies cover the new columns).

Files to touch:
- `src/pages/admin/FleetManagement.tsx` — wrap content in `<Tabs>` with 3 tabs; add header `SidebarTrigger`.
- `src/components/admin/fleet/AllVehiclesTable.tsx` *(new)* — Tab 2 table, filters, edit drawer.
- `src/components/admin/fleet/TemporaryVehiclesTable.tsx` *(new)* — Tab 3 table + add dialog.
- `src/components/admin/fleet/EditVehicleUnitDrawer.tsx` *(new)* — shared edit form.
- `src/hooks/use-vehicle-units.ts` — extend query to join `vehicles` + `locations`, accept `isTemporary` filter. Reuses existing mutations.
- No edge function, pricing, or booking changes.

Out of scope (call out, do not build now): vendor billing for temp units, automated end‑date alerts, bulk CSV import.
