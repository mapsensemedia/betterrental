

# Auto-Fetch All Bambora Transactions (No Manual Range Entry)

## Approach

Instead of requiring the user to manually enter transaction ID ranges, automatically determine the range by:
1. Finding the **min and max** `wl_transaction_id` and `wl_deposit_transaction_id` from the `bookings` table
2. Scanning the full range (min → max) from Bambora, skipping 404s
3. This captures all transactions — including ones not tied to any booking

Since Bambora has no "list all" endpoint, we still need to scan by ID. But the range is auto-computed.

## Changes

### 1. New edge function: `supabase/functions/wl-search-txns/index.ts`
- Accepts `startId` (number) and `endId` (number)
- Iterates the range, calling `GET /v1/payments/{id}` for each
- Processes in parallel batches of 10, skips 404s
- Caps range to max 100 IDs per request
- Returns array of found transactions

### 2. Register in `supabase/config.toml`
- Add `[functions.wl-search-txns]` with `verify_jwt = false`

### 3. Update `src/pages/admin/Reconciliation.tsx`
- Remove `manualTxnInput` state and the manual input field
- Update `handleFetchBambora`:
  - Query `bookings` for `MIN` and `MAX` of numeric transaction IDs (both `wl_transaction_id` and `wl_deposit_transaction_id`)
  - Pad the range: `startId = min - 2`, `endId = max + 5` (to catch nearby unlinked transactions)
  - Call the new `wl-search-txns` edge function with that range
  - Display all returned transactions in the existing table
  - Add a `type` column showing Bambora transaction type code (P = Purchase, PA = Pre-Auth, etc.)

