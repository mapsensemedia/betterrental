

## Add Download Button & Show Customer Name in Agreement Dialog

### Changes — `src/pages/admin/BookingDetail.tsx`

**1. Add PDF download button to each agreement in the list (lines 1424-1432)**

Add a "Download PDF" button next to the existing "View Agreement" button. Use the existing `generateRentalAgreementPdf` function (already used in `RentalAgreementPanel` and `RentalAgreementSign`).

- Import `generateRentalAgreementPdf` from `@/lib/pdf/rental-agreement-pdf`
- Import `Download` icon from lucide-react
- Add a row with two buttons: "View Agreement" and "Download PDF"
- The download button calls `generateRentalAgreementPdf(agreement, bookingId)`

**2. Show customer typed name in the agreement dialog signature section (lines 1563-1586)**

Currently the dialog shows the signature image but not the customer's typed name. The `customer_signature` field contains the typed name (e.g. "Chantelle Depatie").

- After the "Signed on..." line, add: `Signed by: {viewingAgreement.customer_signature}`
- Show this regardless of whether a PNG signature image exists
- If `signed_manually` is true, add a small "(In-person)" note

### Files
| File | Change |
|------|--------|
| `src/pages/admin/BookingDetail.tsx` | Add PDF download button to agreement list; show customer name in dialog |

