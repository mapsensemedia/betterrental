

## Fix Two Display Bugs in Booking Detail Page

### Bug 1 — Inspection metrics showing raw JSON

**Root cause**: The `exterior_notes` field on pickup inspections stores vehicle prep checklist data as JSON (from `useVehiclePrepStatus`), but `BookingDetail.tsx` renders it directly as text on lines 634-636 and 652-654.

**Fix in `src/pages/admin/BookingDetail.tsx`**:
- Replace the raw `{pickupInspection.exterior_notes}` and `{returnInspection.exterior_notes}` renders with a helper that:
  1. Tries to parse the string as JSON
  2. If it's a prep checklist object (keys like `fuel_verified`, `interior_clean`), render each entry as a formatted row with:
     - Label: convert snake_case key to Title Case (e.g. `fuel_verified` → "Fuel Verified")
     - Green checkmark icon if `checked: true`, red X if `checked: false`
     - Formatted date/time from `checkedAt` if present
  3. If parsing fails or it's plain text, render as-is (backward compatible)

### Bug 2 — Agreement modal shows only signature link

**Root cause**: The rental agreements query on line 256 only fetches `id, status, customer_signed_at, signature_png_url, created_at`. The "View Agreement" button (line 1352-1357) links directly to `signature_png_url` — opening just the signature image, not the agreement.

**Fix in `src/pages/admin/BookingDetail.tsx`**:
1. Expand the query (line 256) to also select `agreement_content, terms_json, customer_signature, staff_confirmed_at, signed_manually, agreement_type` 
2. Replace the simple signature link button with a Dialog that opens on click
3. Inside the Dialog, render the existing `AgreementStructuredView` component (already built and used elsewhere), passing the full agreement data
4. If no `terms_json` is available, fall back to rendering `agreement_content` as formatted text
5. Show signature image below the content if signed, or "Pending Signature" notice if not
6. Add the `AgreementStructuredView` import at the top of the file

### Files
| File | Change |
|------|--------|
| `src/pages/admin/BookingDetail.tsx` | Parse exterior_notes JSON into checklist UI; expand agreement query and add Dialog with full agreement view |

