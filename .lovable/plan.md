

## Problem

In the Ops payment flow (`OpsPaymentAndDeposit`), when staff need to charge rental + place deposit hold, the component:
1. Renders a `WorldlineCheckout` for the rental charge
2. On success, **unmounts** the form (via key change) and renders a **new** one for the deposit — forcing staff to re-enter card details
3. The `onUpdated()` call in `handlePaySuccess` triggers parent query invalidation which can unmount the entire component before the deposit step renders

## Solution

Use the same pattern as `NewCheckout.tsx`: keep a single `WorldlineCheckout` instance in **headless** mode, use its ref to call `getToken()` twice — once for `wl-pay`, once for `wl-authorize` — without unmounting or re-entering card details.

## Changes

### 1. `src/components/payments/OpsPaymentAndDeposit.tsx` — Full rewrite of the pay+hold flow

**For `isPayAndHold` mode (rental + deposit):**
- Render a single `WorldlineCheckout` with `headless={true}` and a ref
- Show one button: **"Charge $X rental + $350 deposit hold"**
- On click, execute a sequential flow:
  1. Call `ref.getToken()` → get token A → invoke `wl-pay` with token A
  2. If rental succeeds, call `ref.getToken()` again → get token B → invoke `wl-authorize` with token B
  3. If deposit also succeeds → show success, call `onUpdated()` once
  4. If rental succeeds but deposit fails → show partial success toast ("Rental paid. Deposit hold will be arranged separately."), call `onUpdated()`
- **Remove** the `collecting-deposit` step entirely for pay+hold flows — no more two-phase UI
- **Remove** `onUpdated()` from the rental-only success path — only fire after the full flow completes

**For deposit-only mode (`rentalAmount === 0`):**
- Keep existing behavior: single `WorldlineCheckout` in standard (non-headless) mode with `mode="authorize"`

**Race condition fix:**
- `onUpdated()` is deferred to after both operations complete (or after the flow ends with partial success), preventing premature unmount

### 2. No changes to `WorldlineCheckout.tsx`

The component already exposes `getToken()` via its ref, which generates a fresh single-use token from the same mounted card fields. No modifications needed.

### 3. No changes to `StepPayment.tsx`

The parent component passes `rentalAmount` and `depositAmount` — no interface changes needed.

### 4. No changes to edge functions

`wl-pay` and `wl-authorize` each accept a `token` parameter independently. The sequential calls with separate tokens will work as-is.

## Technical Detail

Bambora's Custom Checkout SDK allows calling `createToken()` multiple times on the same mounted hosted fields. Each call produces a new single-use token. This is the same pattern used in the customer-facing checkout (`NewCheckout.tsx` lines 904-910).

The sequential flow in the component will be:
```text
[Card Form (headless)] → Button Click
  ├─ getToken() → token_A → POST wl-pay (rental charge)
  │   ├─ success → getToken() → token_B → POST wl-authorize (deposit hold)
  │   │   ├─ success → "Both complete!" → onUpdated()
  │   │   └─ fail → "Rental paid, deposit separate" → onUpdated()
  │   └─ fail → show error, form stays mounted for retry
  └─ (deposit-only mode uses standard non-headless flow, unchanged)
```

