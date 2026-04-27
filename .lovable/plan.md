# Stripe Removal — Full Audit

## TL;DR

Stripe is **completely dormant** in this project. Worldline/Bambora is the only active payment flow. Removing Stripe will not break anything currently working — but `send-payment-request` (used by admin "Send Payment Link") still uses Stripe Checkout and would need a Worldline replacement (or removal) before we delete it.

Below is the full inventory. **Nothing has been changed yet.**

---

## 1. Frontend files referencing Stripe

| File | What's there | Active? |
|------|--------------|---------|
| `src/pages/NewCheckout.tsx` | 3 stale comments only ("Stripe webhook handles…", "Stripe hosted checkout…"). No imports, no calls. | Comments only |
| `src/components/admin/PaymentDepositPanel.tsx` | Visible UI text: *"Payments are collected at checkout via Stripe."* + invokes `send-payment-request` (Stripe edge fn) | **Live UI** |
| `src/components/admin/return-ops/steps/StepReturnDeposit.tsx` | Invokes `send-payment-request` for the "send payment link" button at return | **Live UI** |
| `src/lib/card-validation.ts` | One comment ("would typically be done… with Stripe"). No code. | Comment only |
| `src/hooks/use-payments.ts` | Header comments only ("Stripe webhooks", "Stripe-only"). No Stripe code. | Comments only |
| `src/integrations/supabase/types.ts` | Auto-generated types for `stripe_deposit_*` columns + `stripe_webhook_events` table | Auto-regen after migration |

**No file imports `@stripe/react-stripe-js` or `@stripe/stripe-js`.** The npm packages are dead weight.

---

## 2. NPM packages

In `package.json`:
- `@stripe/react-stripe-js` ^5.6.0
- `@stripe/stripe-js` ^8.7.0

Both have **zero imports** anywhere in `src/`. Safe to remove.

Lockfiles (`bun.lock`, `bun.lockb`, `package-lock.json`, `deno.lock`) will regenerate.

---

## 3. Supabase edge functions using Stripe

| Function | Status | Called from |
|----------|--------|-------------|
| `stripe-webhook/` | Stripe webhook handler | Stripe only (no Stripe = nothing) |
| `create-checkout-session/` | Stripe Checkout for rentals | **Not called by any frontend code** |
| `create-checkout-hold/` | Stripe PaymentIntent for deposit holds | **Not called by any frontend code** |
| `create-payment-intent/` | Standard Stripe PI for authed users | **Not called by any frontend code** |
| `send-payment-request/` | Creates a Stripe Checkout session, emails/SMS the link | **CALLED by `PaymentDepositPanel` and `StepReturnDeposit`** |
| `close-account/` | Imports Stripe SDK, collects `stripe_payment_ids` for the export | Called by account-deletion flow |

`get-stripe-config/` is referenced in `supabase/config.toml` but the function folder no longer exists (orphaned config block).

`_shared/cors.ts` allows the `stripe-signature` header — harmless but Stripe-specific.

---

## 4. Environment variables / secrets

In Supabase secrets (Lovable Cloud):
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

In `.env`: none. In code: only those two names referenced.

---

## 5. Database tables / columns / migrations

**Table:** `stripe_webhook_events` — **0 rows**. Created in migration `20260116012359…`, unique constraint added in `20260214033202…`.

**Columns on `bookings` table** (all NULL on every row — verified, 0 rows have a `stripe_deposit_pi_id`):
- `stripe_deposit_pi_id`
- `stripe_deposit_pm_id`
- `stripe_deposit_charge_id`
- `stripe_deposit_client_secret`
- `stripe_deposit_refund_id`

**Columns on `deposit_ledger`** (all unused):
- `stripe_refund_id`, `stripe_charge_id`, `stripe_balance_txn_id`, `stripe_pi_id`
- CHECK constraint includes `'stripe_hold'` and `'stripe_release'` action values

**Columns on `closed_accounts`** (or similar, written by `close-account`):
- `stripe_payment_ids` (jsonb), `stripe_refund_ids` (jsonb), `stripe_charge_ids` (jsonb)

Migration `20260205133740…` added all the above. Migration `20260209031600…` has Stripe in a comment only.

We will **not delete the historical migrations** (they're append-only history). New migration will drop the columns/tables/constraints.

---

## 6. UI surfaces shown to users

Admin-only:
- **`PaymentDepositPanel`** on `/admin/bookings/:id` — explicit text "Payments are collected at checkout via Stripe" + a "Send Payment Link" button that hits `send-payment-request` (Stripe Checkout email).
- **`StepReturnDeposit`** in the return-ops wizard — same "send payment link" action.

No customer-facing UI shows Stripe branding.

---

## Confirmation answers

**Is Stripe actively used by any live payment flow?**
No. The customer rental + deposit flow runs entirely through `wl-pay`, `wl-authorize`, `wl-webhook`, `wl-completion`, etc. Stripe edge functions are unreachable from the UI **except** `send-payment-request`, which is only triggered when an admin clicks "Send Payment Link" on a booking — and that hasn't been migrated to Worldline.

**Dependencies between Stripe code and Worldline?**
None. No Worldline edge function imports the Stripe SDK or reads Stripe DB columns. They are fully independent.

**Will removing Stripe break anything currently working?**
Only one thing: the admin **"Send Payment Link"** button in `PaymentDepositPanel` and `StepReturnDeposit`. If we delete `send-payment-request`, those buttons stop working. Three options:
1. Replace `send-payment-request` with a Worldline-based hosted-payment-link version.
2. Remove the "Send Payment Link" button entirely (admins collect payment in person via the existing `OpsPaymentAndDeposit` flow).
3. Leave `send-payment-request` + its Stripe secret in place for now and remove everything else.

---

## Proposed removal plan (for your approval)

### A. Code deletions
- **Delete edge functions:** `stripe-webhook/`, `create-checkout-session/`, `create-checkout-hold/`, `create-payment-intent/`, and (pending decision above) `send-payment-request/`. Call `supabase--delete_edge_functions` to deprovision them from Cloud.
- **`close-account/index.ts`:** strip the `import Stripe from …`, drop `stripe_payment_ids` / `stripe_charge_ids` from the export object.
- **`_shared/cors.ts`:** remove `stripe-signature` from allowed headers + the comment.
- **`supabase/config.toml`:** remove `[functions.stripe-webhook]`, `[functions.create-checkout-session]`, `[functions.create-payment-intent]`, `[functions.create-checkout-hold]`, `[functions.get-stripe-config]`, and `[functions.send-payment-request]` (if deleted).
- **`PaymentDepositPanel.tsx`:** remove the Stripe sentence + "Send Payment Link" button (or rewire — your call).
- **`StepReturnDeposit.tsx`:** remove or rewire the "send payment link" call.
- **Stale comments:** clean `NewCheckout.tsx`, `card-validation.ts`, `use-payments.ts`.

### B. Package removal
- `bun remove @stripe/react-stripe-js @stripe/stripe-js`

### C. Database migration
```sql
ALTER TABLE bookings
  DROP COLUMN stripe_deposit_pi_id,
  DROP COLUMN stripe_deposit_pm_id,
  DROP COLUMN stripe_deposit_charge_id,
  DROP COLUMN stripe_deposit_client_secret,
  DROP COLUMN stripe_deposit_refund_id;

ALTER TABLE deposit_ledger
  DROP COLUMN stripe_refund_id,
  DROP COLUMN stripe_charge_id,
  DROP COLUMN stripe_balance_txn_id,
  DROP COLUMN stripe_pi_id;

-- Drop & recreate the deposit_ledger action CHECK without 'stripe_hold'/'stripe_release'
ALTER TABLE deposit_ledger DROP CONSTRAINT <action_check_name>;
ALTER TABLE deposit_ledger ADD CONSTRAINT deposit_ledger_action_check
  CHECK (action IN ('hold','release','deduct','authorize','partial_capture','capture','expire','cancel'));

-- Closed-accounts table: drop stripe_*_ids columns
ALTER TABLE <closed_accounts_table>
  DROP COLUMN stripe_payment_ids,
  DROP COLUMN stripe_refund_ids,
  DROP COLUMN stripe_charge_ids;

DROP TABLE stripe_webhook_events;
```
(Exact constraint/table names confirmed during execution.)

### D. Secrets
After deploy succeeds, you delete `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` from Cloud secrets manually (I can't delete secrets, only request them).

### E. Knowledgebase
Mark Stripe-specific runbooks/incidents (`stripe-payment-failed.md`, `webhook-not-firing.md`, etc.) as archived/deprecated, and update `06-edge-functions.md`, `02-architecture.md`, etc., to remove Stripe references.

---

## Decision needed before I execute

1. **Send Payment Link button** — delete it, leave it (keep `send-payment-request` + Stripe secret), or rebuild it on Worldline? (My recommendation: delete it for now; on-counter payments already work via `OpsPaymentAndDeposit`. We can add a Worldline payment-link flow later as its own task.)
2. Confirm you want the DB columns dropped (irreversible, but all values are NULL — verified).