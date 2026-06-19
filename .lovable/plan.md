## Goal

1. Make the ops Pickups screen visually and functionally match the admin Pickups screen (icons, layout, badges, text, behavior).
2. Give a one-click way to jump into the pickup/return wizard from any booking detail page in ops, so staff don't have to navigate Ops → Pickups → find booking → Handover.

## What changes

### 1) Rebuild `src/pages/ops/OpsPickups.tsx` to mirror admin Pickups

Use the same structure, copy, and lucide icons as `src/pages/admin/Pickups.tsx`:

- Header: `KeyRound` icon + "Pickups & Handovers" title, subtitle "Manage scheduled pickups and complete handovers", "X Scheduled" badge, refresh button.
- Filters row: search input (Search icon), Date select (Today / Next 24 Hours / This Week) with Calendar icon, Location select with MapPin icon (reusing existing `useOpsLocationFilter` value).
- Data source: switch from raw `listBookings(...)` to the same `useHandovers(dateFilter, locationId)` hook the admin page uses, so we get the same readiness data (`paymentStatus`, `verificationStatus`, `vehicleReady`, `bufferCleared`).
- Group bookings by date with the same "Today / Tomorrow / MMM d - EEEE, MMMM d" headers.
- Card layout identical to admin: time block (HH:mm + date), booking code badge, customer name, vehicle line (Car icon), location line (MapPin icon, DeliveryBadge when applicable), four readiness badges (Payment / Verified / Vehicle / Buffer), warning row when not all-ready.
- Action buttons on each card:
  - "Open Booking" → `/ops/booking/:id` (detail)
  - Primary "Handover" → `/ops/booking/:id/handover` (wizard) — direct, no extra clicks
  - Flag issue (amber Flag icon) → creates an alert via `useCreateAlert`
- Reuse the same Handover Checklist dialog (verification / payment / inspection / notes) from admin Pickups, calling `useUpdateBookingStatus` to move the booking to `active`.
- Footer stats: "X ready, Y need attention".
- Wrap in `OpsShell` (not `AdminShell`) and keep the existing `OpsLocationFilter` integration.

No new domain/query/mutation code — only presentational re-skin reusing existing hooks.

### 2) Direct wizard launcher on booking detail (ops context)

In `src/pages/admin/BookingDetail.tsx` (this same page is mounted at `/ops/booking/:bookingId`), add a context-aware primary action button in the page header using `usePanelContext()`:

- When `isOps` is true:
  - status `draft` / `pending` / `confirmed` → button "Start Handover" with `Play` icon → navigates to `/ops/booking/:id/handover`
  - status `active` → button "Process Return" → `/ops/return/:id`
  - status `completed` / `cancelled` → no button
- When `isAdmin`, leave existing behavior unchanged.

This makes the wizard reachable in one click whenever a user lands on a booking detail in ops (from search, from notifications, from "Open Booking" on the pickups card, etc.), so they no longer have to backtrack through Pickups.

### 3) Small consistency tweak on OpsBookings

Keep current routing (pending/confirmed → handover wizard) but rename the row CTA icon/label to match admin Pickups ("Handover" with `Play` icon) so terminology is consistent across ops.

## Out of scope

- No changes to data fetching, RLS, edge functions, pricing, or wizard internals.
- Admin Pickups page is unchanged — it's the reference design.
- Returns/Active pages can be aligned the same way in a follow-up if you want; this plan focuses on Pickups as you described.

## Files touched

- `src/pages/ops/OpsPickups.tsx` (rewrite to mirror admin)
- `src/pages/admin/BookingDetail.tsx` (add ops-context wizard CTA in header)
- `src/pages/ops/OpsBookings.tsx` (icon/label only)

## Verification

- Visit `/ops/pickups` on mobile (390px) and desktop: layout, icons, badges, and copy match `/admin/pickups`.
- From `/ops/pickups`, clicking "Handover" opens the wizard directly.
- From `/ops/booking/:id` on a pending/confirmed booking, the new "Start Handover" button opens the wizard in one click.
