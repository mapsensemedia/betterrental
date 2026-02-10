

# Billing, Invoicing, and Receipt Cleanup Plan

## Problem Summary

The current billing system has several issues:

1. **Duplicacy between Final Invoice and Receipt** -- Both are generated when closing a rental (`close-account` creates a `final_invoice`, then calls `generate-return-receipt` which creates a `receipt`). These contain overlapping data but serve unclear purposes.
2. **Pricing Breakdown is incomplete** -- The booking detail Financial tab only shows daily rate, subtotal, and tax. It does not show add-ons, young driver fee, PVRT/ACSRCH fees, or protection plan costs.
3. **Final Invoice is not downloadable** -- Only receipts have PDF download; final invoices don't.
4. **Final Invoices are not searchable in Admin Billing** -- The Billing page only has tabs for Receipts, Payments, and Deposits. No Invoices tab exists.
5. **Receipt detail dialog lacks full breakdown** -- Missing vehicle info, rental period, add-on itemization in some contexts.

## Clarification: Invoice vs Receipt

- **Final Invoice** = The authoritative billing document generated at account closeout. Contains the full financial summary (rental, add-ons, taxes, fees, damages, payments received, amount due). This is the primary billing record.
- **Receipt** = A payment confirmation sent to the customer (via email). Generated automatically by `generate-return-receipt` as a notification artifact.

The plan will make the Final Invoice the primary billing document and keep receipts as lightweight payment confirmations.

---

## Changes

### 1. Booking Detail - Complete Pricing Breakdown (BookingDetail.tsx)

Update the "Pricing Breakdown" card in the Financial tab to show:
- Daily rate and subtotal (existing)
- All booking add-ons with individual prices (already partially done, ensure it always renders)
- Young driver fee (existing)
- PVRT and ACSRCH daily regulatory fees (calculated from `total_days`)
- Protection plan cost if applicable
- Tax breakdown (PST + GST)
- Grand total

This uses data already fetched by `useBookingById` (which includes `addOns` array and booking fields like `young_driver_fee`).

### 2. Add "Invoices" Tab to Admin Billing Page (Billing.tsx)

Add a new "Invoices" tab alongside Receipts, Payments, and Deposits:
- Query `final_invoices` table with booking and profile data
- Display in a searchable table: Invoice #, Customer, Booking Code, Grand Total, Amount Due, Status, Date
- Search by invoice number, booking code, or customer name
- Clicking "View" opens a detail dialog showing the full invoice breakdown
- Include a "Download PDF" button that generates a professional invoice PDF

### 3. Invoice PDF Generation (new file: src/lib/pdf/invoice-pdf.ts)

Create `generateInvoicePdf()` function similar to `receipt-pdf.ts` but with invoice-specific data:
- Invoice number, issue date
- Customer name, email
- Vehicle name, booking code
- Rental period
- Full line items from `line_items_json`
- Subtotals: Rental, Add-ons, Taxes, Late Fees, Damage Charges
- Payments received, Amount due
- Notes

### 4. Make Final Invoice Viewable and Downloadable in Booking Detail (BookingDetail.tsx)

In the Financial tab's "Final Invoice" card:
- Add a "Download PDF" button that calls `generateInvoicePdf()`
- Show the full line items breakdown (from `line_items_json` stored in the invoice)

### 5. Remove Receipt Duplication and Clean Up

- The `close-account` edge function already calls `generate-return-receipt`. This is fine -- the receipt serves as the customer email notification.
- Remove the manual "Create Receipt" button from the Billing page since receipts are auto-generated. Keep the dialog for viewing existing receipts only.
- Update the receipt detail dialog to pull line items from the receipt's own `line_items_json` and `totals_json` (already stored), not from re-fetching booking data.
- Clean up unused imports and dead code.

### 6. Update Stats Cards (Billing.tsx)

Update the stats section to include invoice count alongside receipt count.

---

## Technical Details

### Files to Create
- `src/lib/pdf/invoice-pdf.ts` -- Invoice PDF generator using jsPDF

### Files to Modify
- `src/pages/admin/Billing.tsx` -- Add Invoices tab, invoice detail dialog, invoice PDF download, remove "Create Receipt" button, clean up
- `src/pages/admin/BookingDetail.tsx` -- Expand pricing breakdown with add-ons/fees, add invoice PDF download button
- No edge function changes needed -- the existing `close-account` and `generate-return-receipt` flow is correct

### Data Flow (no changes needed)
```
Return Closeout -> close-account edge function
  -> Creates final_invoice record
  -> Calls generate-return-receipt (creates receipt + sends email)
  -> Updates booking status to completed
```

### No Database Changes Required
All needed tables (`final_invoices`, `receipts`, `booking_add_ons`) already exist with the right columns.

