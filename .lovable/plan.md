

## Problem

The delivery detail page (`src/features/delivery/pages/Detail.tsx`) is a **standalone page** — it does NOT use the standard ops panel step system (`OpsStepContent`, `ops-steps.ts`). The agreement step was added to `ops-steps.ts`, which only affects the admin ops panel, not the delivery detail page.

Currently, the delivery detail page only has a small "Agreement" button buried in the Handover Requirements section (line 237-241) that links to `/booking/:id/agreement`. There is no inline agreement generation/signing panel.

## Fix

Add a dedicated **Rental Agreement section** directly into the delivery detail page, using the existing `RentalAgreementPanel` component (same one used by the standard ops panel). This will be placed as a prominent card between the Customer Contact section and Special Instructions, giving staff full agreement functionality inline.

### Changes

**`src/features/delivery/pages/Detail.tsx`**
1. Import `RentalAgreementPanel` from `@/components/admin/RentalAgreementPanel`
2. Import `useRentalAgreement` from `@/hooks/use-rental-agreement` to show signed/pending status
3. Add a new "Rental Agreement" card section after Customer Contact (before Special Instructions) containing:
   - A header with status badge (Signed / Awaiting Signature)
   - The `RentalAgreementPanel` component with `bookingId={delivery.id}` and `customerName` resolved from delivery data
4. Keep the existing small Agreement button in Handover Requirements as a secondary access point

This reuses the exact same agreement generation, signing, and display logic as the standard ops panel — no edge function changes needed.

