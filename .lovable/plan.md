## Investigation Findings

**Booking:** ZB5NSXJJ (id `7825fa05-…`) — TUSHAR MALLESH YENNAM, Mystery Car (plate A819JZ).

**Who marked it Completed?**
Admin **Devish Arora** (`devarora25016@gmail.com`) called the `close-account` edge function on **2026-05-06 07:40 UTC (≈12:40 AM Vancouver)**. Audit trail shows `account_closed` action by his user_id, plus auto‑promotion of the rental payment to completed and final invoice INV‑2026‑01073 generated. This was a **manual admin action**, not automatic.

**Why "12:00 AM" return time?**
`end_at` is stored as `2026-05-10 07:00:00 UTC` = **2026-05-10 00:00 America/Vancouver** (midnight). Root cause is in `src/components/admin/WalkInBookingDialog.tsx`: the dialog has `pickupTime`/`returnTime` selects (state defaults to `DEFAULT_PICKUP_TIME`), but the submit handler sends `formData.startDate.toISOString()` / `formData.endDate.toISOString()` directly — the chosen times are **never merged into the date** before posting to `create-walk-in-booking`. So end_at always uses the calendar's default midnight-local component.

**Current vehicle state:** Unit `e2004597-…` is still `on_rent` (good, no need to flip).

---

## Plan

### 1. Restore the booking record (data fix, single existing row)
Update booking `7825fa05-a783-4415-916e-b131f88da6a1`:
- `status` → `active`
- `end_at` → `2026-05-10 21:30:00+00` (Sunday May 10, 1:30 PM America/Vancouver = 21:30 UTC during PDT)
- `actual_return_at` → `NULL`
- `return_state` → `not_started`
- `account_closed_at` → `NULL`
- `account_closed_by` → `NULL`

Vehicle unit already `on_rent` — leave as is (verify post‑update).

Revert the auto‑completed rental payment back to `authorized`:
- Payment `c67314d8-01a4-496e-97b4-664b788d48d3` → `status = authorized`
- Booking `wl_auth_status` → `authorized`

Void the prematurely generated final invoice INV‑2026‑01073 (mark as void/deleted so finance/customer pass don't show it). Will inspect `final_invoices` table first to choose the correct void column.

These writes go through the migration/insert tool (service_role) to bypass `block_sensitive_booking_updates` trigger.

### 2. Audit trail
Insert two `audit_logs` rows on entity `booking / 7825fa05-…`:
- `action: 'booking_status_corrected'` — old `{status: completed}`, new `{status: active, end_at: 2026-05-10T21:30Z}`, note: "Booking was mistakenly closed by admin before actual return. Restored to active; correct return time Sun May 10, 1:30 PM. Original close action preserved above."
- `action: 'invoice_voided'` — referencing INV‑2026‑01073, reason "premature account close reversal".

Existing audit entries are kept untouched (preserves the trail of who closed it).

### 3. Bug fix — return time defaulting to midnight
File: `src/components/admin/WalkInBookingDialog.tsx`

Before invoking `create-walk-in-booking`, build the actual datetimes by merging `pickupTime` / `returnTime` (`HH:mm`) into `startDate` / `endDate`. Approach:
```ts
const applyTime = (date: Date, hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);   // local time, becomes correct UTC via toISOString
  return d;
};
const startAt = applyTime(formData.startDate, formData.pickupTime).toISOString();
const endAt   = applyTime(formData.endDate,   formData.returnTime).toISOString();
```
Use these in the body and in the local `totalDays` calc if relevant. Also apply the same merge when auto‑bumping `endDate` on start date change, so the times stay attached.

No changes to the edge function itself — it already trusts `endAt` ISO string.

### 4. Verification
- Re‑query booking: status=active, end_at correct, actual_return_at null.
- Re‑query payment + invoice state.
- Confirm vehicle_units row still on_rent.
- Open admin panel → Tushar's booking should now show Active, return Sun May 10 1:30 PM.

---

### Confirmation needed
1. Return time: I'm assuming **1:30 PM America/Vancouver** (PDT, UTC‑7) → `2026-05-10T21:30:00Z`. Confirm timezone.
2. The premature final invoice INV‑2026‑01073 — **void it** (recommended) or leave it for finance to handle manually?
