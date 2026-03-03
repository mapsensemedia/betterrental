

## Plan: Walk-in Payment in StepPayment + Stale BookingId Fix

### Bug 1 — Inline "Take Payment" in StepPayment.tsx

**Current state**: When `wl_transaction_id` is null and no `wl_auth_status`, the panel shows "Payment not yet received" with only a broken "Send Payment Link" button.

**Changes to `src/components/admin/ops/steps/StepPayment.tsx`**:

1. Import `WorldlineCheckout`, `WorldlineCheckoutHandle`, `useRef` from React, and `DEFAULT_DEPOSIT_AMOUNT` from `@/lib/pricing`
2. Add state: `walkinPayStep` (`"idle" | "paying" | "depositing" | "done"`), `walkinError` (string | null)
3. Add a `worldlineRef` via `useRef<WorldlineCheckoutHandle>(null)`
4. Replace the "no payment" section (lines 299-331) with:
   - When `walkinPayStep !== "done"`: render `WorldlineCheckout` in `mode="pay"`, `amount={paymentStatus.totalDue}`, standalone mode (not headless), with `buttonLabel="Pay $X.XX + $350.00 deposit hold"`
   - **Key requirement**: The `WorldlineCheckout` stays mounted through both steps. During the deposit hold step, render a semi-transparent overlay with a spinner and "Placing $350.00 deposit hold..." text **on top of** the card form, preventing interaction while keeping the SDK mounted
   - `onSuccess` handler:
     a. Set `walkinPayStep` to `"depositing"`
     b. Call `worldlineRef.current.getToken()` to get a fresh token from the still-mounted card fields
     c. Call `supabase.functions.invoke("wl-authorize", { body: { bookingId, token, name } })`
     d. On deposit success: toast success, invalidate queries
     e. On deposit failure: log warning, toast info "Rental paid but deposit hold failed — customer can complete later", invalidate queries (non-blocking)
     f. Set `walkinPayStep` to `"done"`
   - `onError` handler: set `walkinError`, toast error
   - When `walkinPayStep === "done"`: hide `WorldlineCheckout`, show success message with checkmark
5. Keep the existing "Send Payment Link" button as a fallback below the card form

**Changes to `src/hooks/use-payment-deposit.ts`**:
- Add `bookingStatus` to the select query (add `status` column) and expose it in `PaymentSummary` interface so StepPayment can gate the form to confirmed/pending bookings only.

### Bug 2 — Stale bookingId in NewCheckout.tsx

**Problem**: `pendingBooking` state persists if a previous booking attempt set it. If user starts a new checkout, the old booking ID could leak.

**Changes to `src/pages/NewCheckout.tsx`**:
- At the **start** of `handleSubmit` (line 307, after validation but before any API call), add:
  ```
  setPendingBooking(null);
  setPaymentError(null);
  setCheckoutStep("idle");
  ```
  This ensures no stale booking data from a previous attempt survives into a new submission.

### Files Modified
- `src/components/admin/ops/steps/StepPayment.tsx` — inline WorldlineCheckout with overlay during deposit step
- `src/hooks/use-payment-deposit.ts` — add `bookingStatus` field
- `src/pages/NewCheckout.tsx` — clear stale state at start of handleSubmit

