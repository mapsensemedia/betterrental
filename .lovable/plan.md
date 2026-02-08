

# Single-Page Rental Agreement PDF

## Problem
The current rental agreement PDF spills onto multiple pages because:
1. The edge function generates ~5,800 characters of verbose content with decorative borders, 9 sections of detailed terms, and 6 checkboxes
2. The PDF renderer parses this raw text line-by-line and keeps adding content vertically without enforcing a single-page boundary

## Solution
Redesign both the **content generation** (edge function) and the **PDF renderer** to produce a compact, single-page rental record inspired by the Hertz reference image.

### Approach: Use Structured Data (`terms_json`) Instead of Raw Text

The edge function already stores a well-structured `terms_json` object with all booking data (vehicle, rental period, financials, policies). Instead of parsing the verbose `agreement_content` text, the PDF renderer will build the layout directly from `terms_json`, giving us precise control over spacing and layout.

### Layout Design (Letter size: 612 x 792 pt)

```text
+----------------------------------------------------------+
|  [LOGO]           RENTAL RECORD         Booking: XXXX    |
|----------------------------------------------------------|
| RENTER                    |  RENTAL PERIOD               |
| Name: John Doe            |  Pickup: Jan 26, 2026 3:33PM |
| Email: john@email.com     |  Return: Jan 27, 2026 3:33PM |
|                           |  Duration: 1 day(s)          |
|----------------------------------------------------------|
| VEHICLE                   |  LOCATIONS                   |
| Category: Economy         |  Pickup: Airport Location    |
| Make/Model: Toyota Corolla|  Address: 123 Main St        |
| Year: 2024  Color: White  |  Drop-off: Same as pickup    |
| Plate: ABC 1234           |                              |
| VIN: 1HGBH41JXMN109186   |  CONDITION AT PICKUP         |
| Fuel: Gas  Trans: Auto    |  KMs Out: 12,345 km          |
| Tank: 50L  Seats: 5       |  Fuel Level: 100%            |
|----------------------------------------------------------|
| CHARGES                   | SERVICE CHARGES/TAXES        |
| Daily Rate: $49.99 x 1    | PVRT: $1.50/day        (G)  |
| Vehicle Subtotal: $49.99  | ACSRCH: $1.00/day      (S)  |
| Add-ons: $0.00            | GST 5%: $2.63          (N)  |
| Young Driver Fee: $0.00   | PST 7%: $3.68          (N)  |
|                           |                              |
| TOTAL: $57.80 CAD         | Deposit: $350.00 (refundable)|
|----------------------------------------------------------|
| TERMS (compact, small font ~5pt, two-column)             |
| Driver must be 20+. Valid license & govt ID required.    |
| No smoking, pets, racing, off-road, or intl travel.      |
| Return with same fuel level. Late fee: 25% daily rate/hr |
| after 30-min grace. Renter liable for damage & tickets.  |
| Third party liability included. Optional coverage avail. |
|----------------------------------------------------------|
| ACKNOWLEDGMENT                                           |
| Signed By: ____________  Date: ____________              |
| Confirmed: ____________                                  |
|----------------------------------------------------------|
| C2C Car Rental | Generated Feb 8, 2026 | Booking XXXX   |
+----------------------------------------------------------+
```

## Technical Changes

### 1. Rewrite PDF Renderer (`src/lib/pdf/rental-agreement-pdf.ts`)

- **Stop parsing raw text**: Remove `parseAndRenderContent()` and all the line-by-line text parsing logic
- **Use `terms_json`**: Build the PDF from the structured JSON data already stored in the agreement
- **Two-column grid layout**: Render renter/rental period, vehicle/locations, charges/taxes side-by-side
- **Condensed terms**: Render all 9 T&C sections as a single dense paragraph block in ~5pt font
- **Fixed positioning**: Place the signature block and footer at fixed positions near the bottom of the page, ensuring content never overflows
- **Auto-scaling safety net**: If content approaches the signature area, reduce font sizes dynamically

Key changes:
- New function `renderFromTermsJson()` replacing `parseAndRenderContent()`
- Two-column helper using fixed column widths (half of content width)
- Condensed terms rendered as a single wrapped text block instead of individual numbered items with bullet points
- Signature block positioned at a fixed Y coordinate (e.g., 700pt) rather than flowing after content
- Footer at fixed position (778pt)

### 2. Update Edge Function (`supabase/functions/generate-agreement/index.ts`)

- **Shorten `agreement_content`**: Reduce the verbose text to a compact summary (the full structured data is already in `terms_json`)
- **Remove decorative borders**: No more `▓▓▓`, `═══`, `┌──┐` box-drawing characters
- **Condense T&C**: Merge 9 sections into a short paragraph
- **Remove checkboxes**: Acknowledgment is implicit in the signature

### 3. Update Agreement Interface (`src/hooks/use-rental-agreement.ts`)

- Add `terms_json` typing to properly type the structured data used by the new PDF renderer

## What Won't Change
- The database schema stays the same
- The signing/confirming/voiding flow stays the same
- The `RentalAgreementSign.tsx` component keeps calling `generateRentalAgreementPdf()` the same way
- Existing agreements in the database will still work (the renderer falls back to text parsing if `terms_json` is empty)
