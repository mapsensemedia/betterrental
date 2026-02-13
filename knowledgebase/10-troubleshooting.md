# Troubleshooting Guide

## Missing Add-Ons After Booking

**Symptom**: Customer booked with add-ons selected, but `booking_add_ons` table has no rows for this booking.

**Diagnosis**:

1. **Check edge function logs** for `create-booking` or `create-guest-booking`:
   ```
   Search for: [persist-booking-extras] or "Add-on insert failed"
   ```

2. **Check if `trg_enforce_addon_price` blocked the insert**: If the insert was attempted without service_role (e.g., a code regression routing through client), the trigger zeros the price but still inserts. Look for rows with `price = 0`.

3. **Check if add-ons were sent in the request**: The client sends `addOns: [{addOnId, quantity}]`. If the array was empty or undefined, no add-ons are created.

4. **Check `computeBookingTotals()` filtering**: If protection is "premium" (All Inclusive) and the add-on is "Premium Roadside" or "Extended Roadside", it's silently filtered out. Look for log: `[booking-core] Filtering Premium Roadside (All Inclusive)`.

**Fix**: If add-ons are genuinely missing, staff can add them via the Counter Upsell Panel, which uses `persist-booking-extras` with proper service_role.

---

## Wrong Totals

**Symptom**: Booking total doesn't match the sum of line items visible in FinancialBreakdown.

**Diagnosis**:

1. **Check if add-ons were added/removed after creation**: The booking total may not have been repriced. Look for `reprice-booking` invocations in edge function logs.

2. **Check for upgrade fees**: `upgrade_daily_fee` is included in the total but may not be visible in all UI surfaces. Query:
   ```sql
   SELECT total_amount, subtotal, tax_amount, upgrade_daily_fee, total_days
   FROM bookings WHERE id = '<booking_id>';
   ```

3. **Reproduce the calculation**: Use the values from the booking record:
   ```
   vehicleTotal = daily_rate × total_days (± weekend surcharge, duration discount)
   + protection × total_days
   + SUM(booking_add_ons.price)
   + young_driver_fee
   + additional_drivers fees
   + (PVRT + ACSRCH) × total_days
   + delivery_fee + different_dropoff_fee
   + upgrade_daily_fee × total_days
   = subtotal
   + subtotal × 0.12 (PST + GST)
   = total_amount
   ```

4. **Check for rounding drift**: The $0.50 tolerance in `validateClientPricing()` means small rounding differences between client and server are accepted. If the drift exceeds $0.50, it's logged as a warning.

**Fix**: Staff can reprice the booking via the Modification Panel or by invoking `reprice-booking` directly.

---

## Drop-off Fee Missing

**Symptom**: Customer returned to a different location but `different_dropoff_fee` is $0.

**Diagnosis**:

1. **Check locations have fee_group set**:
   ```sql
   SELECT id, name, fee_group FROM locations
   WHERE id IN ('<pickup_id>', '<return_id>');
   ```
   If `fee_group` is NULL for either location, the fee will be $0.

2. **Check if return_location_id is set on booking**:
   ```sql
   SELECT location_id, return_location_id, different_dropoff_fee
   FROM bookings WHERE id = '<booking_id>';
   ```
   If `return_location_id` is NULL or equals `location_id`, fee is $0.

3. **Check fee_group pair**: The supported pairs are:
   - `langley|surrey` → $50
   - `abbotsford|langley` → $75
   - `abbotsford|surrey` → $75
   - Any other pair → $0

4. **Check migration backfill**: Older bookings may have the legacy $25 fee or $0. The backfill migration (`20260213031838`) updated existing bookings.

**Fix**: Staff can reprice the booking via `reprice-booking` which recomputes `computeDropoffFee()` from current DB values.

---

## Pricing Mismatch (400 PRICE_MISMATCH)

**Symptom**: Customer gets error during checkout: "Price mismatch".

**Diagnosis**:

1. **Check edge function logs** for the mismatch details:
   ```
   [price-validation] MISMATCH: client=$X, server=$Y, diff=$Z
   ```

2. **Common causes**:
   - **Stale daily rate**: Admin changed vehicle price between page load and checkout
   - **Stale protection rate**: system_settings changed
   - **Stale add-on rate**: add_ons table rates updated
   - **Client-side rounding bug**: Compare `src/lib/pricing.ts` calculations with `_shared/booking-core.ts`
   - **Drop-off fee discrepancy**: Client computed fee from cached location data; server recomputed from DB

3. **Check if constants are in sync**: Both files should have identical values for PST_RATE, GST_RATE, PVRT_DAILY_FEE, etc.

**Fix**: The client should display the server-corrected total and retry. If mismatches are recurring, check for constant drift between `src/lib/pricing.ts` and `_shared/booking-core.ts`.

---

## Stripe Payment Issues

### Payment Intent Created But No Webhook

**Diagnosis**:
1. Check `stripe_webhook_events` for the event:
   ```sql
   SELECT * FROM stripe_webhook_events
   WHERE booking_id = '<booking_id>'
   ORDER BY created_at DESC;
   ```
2. Check Stripe dashboard for webhook delivery failures
3. Verify `STRIPE_WEBHOOK_SECRET` is correctly configured

### Duplicate Payments

**Diagnosis**:
1. Check `payments` table:
   ```sql
   SELECT * FROM payments
   WHERE booking_id = '<booking_id>'
   ORDER BY created_at;
   ```
2. Check for duplicate `transaction_id` values — the partial unique index should prevent this
3. Check `stripe_webhook_events` for duplicate event processing

### Booking Status Not Updating After Payment

**Diagnosis**:
1. Check monotonic status guard:
   ```sql
   SELECT status FROM bookings WHERE id = '<booking_id>';
   ```
   If status is already `confirmed` or `active`, the webhook won't downgrade it
2. Check edge function logs for: `[stripe-webhook] Skipping status downgrade`
3. Verify the webhook handler matched the correct event type

### Deposit Hold Issues

**Diagnosis**:
1. Check booking's Stripe fields:
   ```sql
   SELECT stripe_deposit_pi_id, stripe_deposit_client_secret,
          deposit_status, deposit_amount
   FROM bookings WHERE id = '<booking_id>';
   ```
2. Check if PaymentIntent is still active in Stripe
3. For capture/release issues, check `deposit_ledger`:
   ```sql
   SELECT * FROM deposit_ledger
   WHERE booking_id = '<booking_id>'
   ORDER BY created_at;
   ```

---

## General Debugging Steps

1. **Edge function logs**: Check Supabase edge function logs for the specific function
2. **Audit logs**: Check `audit_logs` for the booking:
   ```sql
   SELECT * FROM audit_logs
   WHERE entity_id = '<booking_id>'
   ORDER BY created_at DESC;
   ```
3. **Notification logs**: Check if notifications were sent:
   ```sql
   SELECT * FROM notification_logs
   WHERE booking_id = '<booking_id>'
   ORDER BY created_at DESC;
   ```
4. **Payment history**: Full payment timeline:
   ```sql
   SELECT amount, payment_type, status, transaction_id, created_at
   FROM payments WHERE booking_id = '<booking_id>'
   ORDER BY created_at;
   ```
