# Additional Documents step in the rental handover flow

Adds a new step to the handover wizard, right after Payment & Deposit, where staff upload
any extra paperwork the customer provided or the company requires before releasing the car.

## The step

- New step "Additional Documents" appears as step 3 in the standard pickup flow (after
  Payment & Deposit, before Vehicle Walkaround), and in the delivery pre-dispatch flow in the
  same position.
- Contents:
  - Upload area (drag-and-drop or file picker), accepting images and PDFs, multiple files at
    once, up to 20MB each. Camera capture works on phones/tablets.
  - Each upload asks for a free-text document label (e.g. "Passport", "Employer letter") and
    an optional note.
  - A list of everything uploaded for this booking: label, note, file type, who uploaded it,
    when, with view and delete actions. Deletes are staff-only and logged.
- The step is **required**: at least one document must be on file before the rental can be
  activated at the Handover step, and the sidebar shows it as incomplete until then. The
  activation button explains what's missing if staff try to skip it.

## Where the documents show up

1. **Booking detail page** — an "Additional documents" card listing every document with a
   thumbnail/file icon; clicking opens it in a viewer.
2. **Active rental page** — the same card, so staff working a live rental can pull up the
   paperwork and add more mid-rental.
3. **Customer profile** — all additional documents for that customer across their bookings,
   each tagged with the booking code it came from.
4. **Activity history** — an entry each time a document is uploaded or removed, attributed to
   the staff member and their branch.

Files are stored privately. Only signed-in staff can open them, scoped to the booking's
branch (super admins see everything). Nothing is publicly reachable and no link works without
an authenticated staff session.

## Technical notes

- New private storage bucket `booking-documents`, 20MB per-file limit, path
  `<booking_id>/<uuid>-<filename>`. RLS on `storage.objects` allows read/insert/delete to
  active staff via `can_access_location` against the booking's location, plus super admins.
- New table `public.booking_documents`: `id`, `booking_id` (FK, cascade), `customer_user_id`,
  `label` (text, not null), `notes`, `storage_path`, `file_name`, `mime_type`, `file_size`,
  `uploaded_by`, `uploaded_at_location_id`, `created_at`, `deleted_at` (soft delete). Migration
  includes GRANTs (`authenticated`, `service_role`) and staff-scoped RLS using
  `is_active_staff` + `can_access_location`; customers get no access.
- Upload/delete go through a new edge function `manage-booking-documents` so the row insert and
  the matching `audit_logs` entry (`booking_document_uploaded` / `booking_document_deleted`)
  are written server-side with correct staff attribution — consistent with the existing rule
  that attribution never reads `profiles`.
- `src/lib/ops-steps.ts`: add `"documents"` to `OpsStepId`, insert the step into `OPS_STEPS`
  and `OPS_STEPS_DELIVERY_PRE` (renumbering the following steps), add
  `documents: { documentsUploaded: boolean }` to `StepCompletion`, and wire
  `checkStepComplete` / `getMissingItems`. Add a blocking issue in `getBlockingIssues` for
  `handover` when no document is on file.
- New `src/components/admin/ops/steps/StepDocuments.tsx` plus a shared
  `BookingDocumentsCard` used by the step, `src/pages/admin/BookingDetail.tsx` and
  `src/pages/admin/ActiveRentalDetail.tsx`; new `src/hooks/use-booking-documents.ts` for
  fetching, signed URLs, upload and delete.
- `src/pages/admin/BookingOps.tsx` computes the completion flag from the document count;
  `OpsStepContent.tsx` renders the new step and includes it in step advancement.
- Customer profile view gets a documents section querying by `customer_user_id`.
