## Issues 32, 33, 34 — Agreements & Invoices

### Database State Summary

From querying the database:

- **12 bookings** in confirmed/active/completed status
- **10 agreements** exist — all linked to valid bookings (no phantoms)
- **7 invoices** exist — generated via `close-account` during return flow
- **5 completed bookings** missing invoices: 76SH95PZ, 6TYA39YT, 4HL5K9QV, FZH86F8W, and active 26HDD44Y (expected — still active)
- **2 completed bookings** missing agreements: 4HL5K9QV, FZH86F8W

### Issue 32 — Missing invoices/agreements for some bookings

**Root cause**: 4HL5K9QV and FZH86F8W were completed without going through the full return ops flow (which triggers `close-account` to generate invoices). 76SH95PZ and 6TYA39YT have agreements but no invoices — same issue, `close-account` was never called for them.

**Fix**: Add a "Generate Invoice" button on the BookingDetail page for completed bookings that have no invoice. This calls the existing `close-account` edge function (which is idempotent — it creates an invoice if one doesn't exist). Similarly, add a "Generate Agreement" button for bookings missing agreements (calls `generate-agreement`).

**File: `src/pages/admin/BookingDetail.tsx**`

- In the invoice section, if `finalInvoices.length === 0` and booking status is `completed`, show a "Generate Invoice" button that invokes `close-account` with the booking ID
- In the agreement section, if no agreement exists and booking is confirmed/active/completed, show a "Generate Agreement" button that invokes `generate-agreement`

### Issue 33 — Phantom agreement

**Finding**: No phantom exists. All 10 rental agreements have valid `booking_id` references that match real bookings. The Agreements page query does not filter by booking status, so it may show agreements for pending/draft bookings. However, the data shows all 10 agreements are linked to real confirmed/active/completed bookings.

If the user sees a "ghost" entry, it's likely the 26HDD44Y agreement (active, still in `pending` agreement status). No code fix needed — this is expected behavior. We can add booking status badges to the agreements list for clarity.

**File: `src/pages/admin/BookingDetail.tsx**`

- Import and render `PaymentDepositPanel` in the payment/financial section of the detail page
- This surfaces the existing "Send Payment Request" button (which creates a Stripe payment link and sends it via email/SMS) for any booking with outstanding balance

### Summary of Changes


| File                                | Change                                                                                                                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/admin/BookingDetail.tsx` | Add PaymentDepositPanel for payment collection; add "Generate Invoice" button for completed bookings without invoices; add "Generate Agreement" button for bookings without agreements |
| `src/pages/admin/Agreements.tsx`    | Add booking status badge column for clarity on agreement status context                                                                                                                |


### Technical Details

- "Generate Invoice" button calls `supabase.functions.invoke("close-account", { body: { bookingId } })` — the function is idempotent and handles completed bookings
- "Generate Agreement" button calls `supabase.functions.invoke("generate-agreement", { body: { bookingId } })`
- No database schema changes required