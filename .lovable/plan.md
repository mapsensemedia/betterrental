

## Manual Activation for Counter Pickup Handover

### Problem
The handover step only allows activation when ALL prerequisites are met. Staff need an "activate anyway" option for counter pickups when some items are incomplete.

### Post-Activation Editing (Your Question)
Yes, the plan fully supports adding missing items later:
- The **Ops panel** (`/admin/booking-ops/{id}`) already allows staff to access any step regardless of booking status — steps are not locked after activation
- The **ActiveRentalDetail** page already has editing panels (protection, add-ons, booking edits) and shows Health & Compliance status badges
- The plan adds an **amber banner** on ActiveRentalDetail showing what was incomplete at activation, with a direct link to the ops panel to complete those items

### Changes

#### 1. Backend: Extend `update-booking-status` edge function
**File:** `supabase/functions/update-booking-status/index.ts`

Accept optional `activationSource`, `activationReason`, `incompleteAtActivation` fields. When `newStatus === "active"`:
- Set `handed_over_at`, `handed_over_by`, `activated_at`, `activated_by`
- Set `activation_source` (default `"counter"`, or `"ops_manual"` for manual path)
- Set `activation_reason` if provided
- Skip SMS when `activationSource === "ops_manual"`
- Include incomplete items list in audit log `new_data`

#### 2. Types update
**File:** `src/domain/bookings/types.ts`

Add `activationSource`, `activationReason`, `incompleteAtActivation` to `UpdateBookingStatusInput`.

#### 3. Client hook: Extend `useUpdateBookingStatus`
**File:** `src/hooks/use-bookings.ts`

Pass new fields through to edge function. Suppress "customer notified" toast for manual activations.

#### 4. StepHandover UI: Add manual activation path
**File:** `src/components/admin/ops/steps/StepHandover.tsx`

When prerequisites are NOT all met, add below the existing amber alert:
- A `Textarea` for "Reason for manual activation" (min 10 chars)
- An "Activate Anyway (add missing details later)" outline button
- A confirmation `AlertDialog` listing incomplete items and confirming the rental will be activated immediately
- On confirm: call mutation with `ops_manual` source, reason, and incomplete items list

Add `onManualActivate` prop.

#### 5. OpsStepContent + BookingOps: Wire up
**Files:** `src/components/admin/ops/OpsStepContent.tsx`, `src/pages/admin/BookingOps.tsx`

Pass `onManualActivate` through to StepHandover.

#### 6. ActiveRentalDetail: Show "manually activated" banner
**File:** `src/pages/admin/ActiveRentalDetail.tsx`

When `activation_source === "ops_manual"`:
- Show amber Alert banner with activation reason and incomplete items
- Include "Complete Missing Items" link to `/admin/booking-ops/{id}`

### What stays unchanged
- Delivery flow and OpsBackupActivation untouched
- Full handover path (all prerequisites met) works as-is
- Existing ops step forms already work for active bookings — no changes needed for post-activation editing

