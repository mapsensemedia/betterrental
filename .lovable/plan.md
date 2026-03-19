
Goal: restore Ops Step 2 card payments without running any transactions, using code/log analysis only.

Findings from investigation (no charges executed):
1) Browser console shows a ref warning in the payment step:
   - “Function components cannot be given refs… Check the render method of `StepPayment`.”
   - Stack includes `StepPayment` / `OpsPaymentAndDeposit`.
2) Clicking the Charge button with empty fields produced no `wl-pay`/`wl-authorize` network calls.
3) Edge function logs for `wl-pay`, `wl-authorize`, `wl-capture`, `wl-cancel-auth`, and `log-terminal-payment` show no recent invocations tied to this failure.
4) Worldline secrets are present (`WORLDLINE_MERCHANT_ID`, `WORLDLINE_API_PASSCODE`), and API base URL is production (`https://api.na.bambora.com`).
5) Terminal flow is a separate function (`log-terminal-payment`) and does not call Worldline directly.

Most likely break point:
- Card submit path is blocked before edge-function invocation (frontend layer).
- `OpsPaymentAndDeposit` depends on imperative `checkoutRef`; handler exits early if ref is unavailable, and current code can fail silently.
- Ready/disabled state is derived from `checkoutRef.current?.isReady()` in parent render, which is fragile and can desync from child hosted-field state.

Implementation plan (targeted fix):
1) Harden card flow state wiring (frontend)
   - File: `src/components/payments/WorldlineCheckout.tsx`
   - Add explicit readiness callback prop (e.g., `onReadyChange`) emitted whenever SDK/field validity/name state changes.
   - Add explicit mounted/initialized callback (or guaranteed imperative handle availability signal).
   - Keep tokenization method intact (`getToken`), but ensure parent can reliably know readiness without polling ref in render.

2) Remove fragile ref-derived button gating and silent no-op
   - File: `src/components/payments/OpsPaymentAndDeposit.tsx`
   - Track local `isCardReady` state from child callback, not `checkoutRef.current?.isReady()` in JSX.
   - In `handlePayAndHold`, if ref/SDK unavailable, surface clear error to UI/toast (no silent `return`).
   - Keep pay+hold sequence unchanged (token A -> `wl-pay`, token B -> `wl-authorize`) and preserve existing server-truth recovery logic.

3) Enforce strict card vs terminal isolation at Step 2
   - File: `src/components/admin/ops/steps/StepPayment.tsx`
   - Keep separate components/handlers, but ensure no shared submit/processing state between modes.
   - Maintain mode switch UI while preventing cross-mode side effects (card readiness should never depend on terminal state).
   - Confirm terminal controls only invoke `log-terminal-payment`; card controls only invoke `wl-pay` / `wl-authorize`.

4) Defensive observability for future incidents
   - Add minimal client-side debug logs (non-sensitive) around:
     - “card form initialized”
     - “charge click received”
     - “tokenization started/failed”
     - “edge function invoked”
   - This makes future production diagnosis possible without test charges.

5) Code-review verification checklist (no transactions)
   - Charge button click path always reaches either tokenization or a visible user-facing error (never silent).
   - Card mode uses only card state/handlers; terminal mode uses only terminal state/handlers.
   - `wl-pay`/`wl-authorize` payload remains `{ bookingId, token, name }` and is unchanged structurally.
   - Worldline credentials remain env-driven; no hardcoded values introduced.

Manual production validation (staff-run only, after deploy):
- Open any ops booking -> Step 2 -> Card Payment tab.
- Enter real card details and charge once (staff-only).
- Confirm rental payment + deposit hold complete.
- Switch between Card and Terminal tabs before/after entry to confirm no interference.
- Confirm booking/payment records update (`wl_transaction_id`, `wl_deposit_transaction_id`, payments rows).
