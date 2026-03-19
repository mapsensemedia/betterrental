

## Bambora/TD Worldline Payment Integration — Code Review Report

### 1. Environment & Credentials ✅ PASS

- **API base URL**: Hardcoded to `https://api.na.bambora.com` in `_shared/worldline.ts:13`. This is the **correct production URL** — Bambora NAM uses the same base URL for both sandbox and production; the merchant ID determines which environment you're in.
- **Credentials**: `WORLDLINE_MERCHANT_ID` and `WORLDLINE_API_PASSCODE` are read from environment variables (not hardcoded). Both are confirmed present in the project secrets.
- **Auth header**: Uses `Passcode base64(merchantId:passcode)` format — correct per Bambora spec.
- **`WORLDLINE_ENVIRONMENT`** secret exists but is **never read** by any edge function. This is a dead config — not harmful, but unused.
- **All 4 core functions** (`wl-pay`, `wl-authorize`, `wl-capture`, `wl-cancel-auth`) plus `wl-webhook`, `wl-query-txn`, `wl-search-txns`, `wl-get-profile`, and `wl-create-profile` all import from the same shared client — no function has its own hardcoded URL or credentials.

**No issues found.**

---

### 2. Checkout Flow (Customer) ✅ PASS

**Tokenization → Payment → Deposit sequence:**

1. **SDK**: `WorldlineCheckout.tsx` loads `https://libs.na.bambora.com/customcheckout/1/customcheckout.js` — correct production SDK URL
2. **Tokenization**: SDK's `createToken()` produces a single-use nonce — no card data touches the server
3. **Payment** (`wl-pay`): Sends `POST /v1/payments` with `complete: true`, `payment_method: "token"`, `token.code`, `order_number: booking_code`, server-derived `amount` from `booking.total_amount`
4. **Deposit hold** (`wl-authorize`): Sends `POST /v1/payments` with `complete: false`, same token flow, `order_number: booking_code + "-DEP"` suffix to avoid collision
5. **Amount**: Server-derived in both cases — customer cannot manipulate the charge amount
6. **DB writes**: Both functions correctly persist transaction IDs (`wl_transaction_id` / `wl_deposit_transaction_id`) and insert `payments` records

**Payload structure**: Matches Bambora Payments API spec. `order_number`, `amount`, `payment_method: "token"`, `token: { code, name }`, `complete: bool` are all correct fields.

**No issues found.**

---

### 3. Ops Panel Payment Step ✅ PASS

- **`OpsPaymentAndDeposit.tsx`**: Uses headless `WorldlineCheckout` ref to get tokens, then calls `wl-pay` and `wl-authorize` via `supabase.functions.invoke()` — same edge functions as customer checkout
- **Terminal payments** (`log-terminal-payment`): Does NOT call Bambora API — only records manually processed POS transactions. Correctly inserts into `payments` table and updates `bookings.status` to `confirmed` via `service_role`
- **Deposit capture/release** from ops: `StepPayment.tsx` calls `wl-capture` and `wl-cancel-auth` — both use the shared Worldline client with production credentials

**No issues found.**

---

### 4. Deposit Pre-Auth Lifecycle ✅ PASS

| Operation | Edge Function | Bambora Endpoint | Status |
|-----------|--------------|-----------------|--------|
| Authorize | `wl-authorize` | `POST /v1/payments` (complete: false) | ✅ |
| Capture | `wl-capture` | `POST /v1/payments/{txnId}/completions` | ✅ |
| Void/Release | `wl-cancel-auth` | `POST /v1/payments/{txnId}/void` | ✅ |

- All three use the correct Bambora API paths
- Transaction ID resolution: All functions correctly use `wl_deposit_transaction_id` with fallback to legacy `wl_transaction_id`
- Idempotency guards: Capture checks `deposit_status === "captured"`, void checks `released`/`voided`

**No issues found.**

---

### 5. Error Handling ✅ PASS (with one minor note)

- **`parseWorldlineError()`**: Maps known Bambora error codes (319, 302, 16) to friendly messages, falls back to `err.message` or field-level details
- **Frontend**: `WorldlineCheckout.tsx` handles three failure paths:
  1. SDK `error.context.json()` parsing for non-2xx responses
  2. `data.declined` flag check
  3. `data.error` string check
  4. **Recovery mechanism**: On any client-side error, verifies server-side state before reporting failure (prevents false negatives from network timeouts)
- **Ops panel**: `StepPayment.tsx`, `StepReturnDeposit.tsx`, `AccountCloseoutPanel.tsx` all use `extractEdgeFunctionError()` utility for consistent error extraction
- **Logging**: All edge functions use structured logger with booking/user context

**Minor note**: The `wl-pay` function returns a `debug` object on decline (bamboraStatus, bamboraMessage, etc.) which is visible in network responses. Not a security risk (no sensitive data), but consider removing for production cleanliness.

---

### 6. Webhook Handler ⚠️ ONE ISSUE

**`wl-webhook`** only matches bookings by `wl_transaction_id` (line 46). It does **not** check `wl_deposit_transaction_id`. This means:
- Deposit pre-auth callbacks (type `PA`) will fail to match if the deposit was stored under `wl_deposit_transaction_id` (which is the current flow)
- Void callbacks (`VP`) for deposits would also be missed

**Impact**: Low — the edge functions (`wl-capture`, `wl-cancel-auth`) handle state transitions synchronously, so webhooks are a backup confirmation. But this is an incomplete implementation that could cause state drift if a webhook arrives before the edge function response.

**Fix**: Add a second lookup on `wl_deposit_transaction_id` if the first lookup on `wl_transaction_id` returns no match.

---

### Summary

| Area | Status | Issues |
|------|--------|--------|
| Environment/Credentials | ✅ | None — no hardcoded sandbox values |
| Checkout Flow | ✅ | Correct endpoints, server-derived amounts |
| Ops Panel | ✅ | Same edge functions, correct DB writes |
| Deposit Lifecycle | ✅ | Correct API paths for auth/capture/void |
| Error Handling | ✅ | Comprehensive with server-side recovery |
| Webhook | ⚠️ | Missing `wl_deposit_transaction_id` lookup |
| Dead config | ℹ️ | `WORLDLINE_ENVIRONMENT` secret unused |

**Recommendation**: Fix the webhook deposit matching. Everything else is production-ready with no misconfigurations found.

