

## Root Cause: Bambora SDK Fails to Remount After Card/Terminal Toggle

### Problem

In `StepPayment.tsx` (lines 291-305), switching between "Card Payment" and "Terminal" uses **conditional rendering**:

```tsx
{payMode === "card" ? (
  <OpsPaymentAndDeposit ... />   // mounts WorldlineCheckout with Bambora SDK
) : (
  <TerminalPaymentForm ... />
)}
```

When staff selects "Terminal", React **unmounts** `WorldlineCheckout`, destroying the DOM elements (`#wl-card-number`, `#wl-cvv`, `#wl-expiry`) that the Bambora SDK hosted fields are mounted on. When staff switches back to "Card Payment", a new `WorldlineCheckout` instance mounts and calls `window.customcheckout()` again, but the Bambora SDK does not cleanly support re-instantiation after its host elements were removed — the new `create()` + `mount()` calls fail or produce non-functional iframes.

There is also no cleanup logic in `WorldlineCheckout` (no `useEffect` return function) to tear down the SDK instance on unmount.

### Fix

**In `StepPayment.tsx`**: Replace the conditional render with **always-render-both, toggle visibility via CSS**. This keeps the Bambora SDK mounted and alive across tab switches:

```tsx
<div className={payMode === "card" ? "" : "hidden"}>
  <OpsPaymentAndDeposit
    bookingId={bookingId}
    rentalAmount={paymentStatus?.totalDue || 0}
    depositAmount={DEFAULT_DEPOSIT_AMOUNT}
    onUpdated={refreshData}
  />
</div>
<div className={payMode === "terminal" ? "" : "hidden"}>
  <TerminalPaymentForm
    bookingId={bookingId}
    amount={paymentStatus?.totalDue || 0}
    depositAmount={DEFAULT_DEPOSIT_AMOUNT}
    onUpdated={refreshData}
  />
</div>
```

Apply the same pattern for the deposit-only form (line 310-317) if it coexists with a terminal option (currently it does not, so no change needed there).

### Files to Change

| File | Change |
|------|--------|
| `src/components/admin/ops/steps/StepPayment.tsx` | Replace ternary conditional render (lines 291-305) with both components always rendered, toggled via `hidden` class |

### Why Not Add SDK Cleanup Instead?

The Bambora Custom Checkout SDK does not expose a `destroy()` or `unmount()` method. Adding cleanup would require manually removing iframes and resetting global state, which is fragile. Keeping the form mounted via CSS visibility is the standard pattern for hosted payment field SDKs (Stripe Elements uses the same approach).

