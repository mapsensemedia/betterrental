

## Overhaul Booking Notifications: Rich, Stage-Specific SMS and Email

### Problem
1. The `send-booking-notification` edge function has **missing stages** -- `payment_received` and `deposit_released` are invoked by callers but have no templates, causing silent failures.
2. The **email templates are minimal** -- they don't include booking code, vehicle name, pickup/return dates, location address, or total amount in a consistent, information-rich format.
3. The **SMS messages are generic** -- they lack booking codes, dates, and specific details.
4. The **`locations` join is ambiguous** due to the new `return_location_id` FK, which may cause query failures.
5. The **vehicle info displays as "0 Vehicle"** because the template uses `year`, `make`, `model` fields that are always empty.

### Solution

Rewrite the `send-booking-notification` edge function with:
- All lifecycle stages with rich, detail-packed templates
- Every notification includes: booking code, vehicle name, pickup/return dates and times, location name and address, total amount
- Fix the ambiguous `locations` join to use `locations!location_id(...)`
- Fix vehicle name display to use category name directly

---

### Stages Covered (13 total)

| Stage | Trigger | Key Info in Notification |
|---|---|---|
| `payment_received` | Stripe webhook after successful payment | Amount paid, booking code, pickup date |
| `license_approved` | Admin verifies license | Next steps, pickup date reminder |
| `license_rejected` | Admin rejects license | What to do, re-upload instructions |
| `vehicle_assigned` | Ops assigns a unit | Vehicle name, pickup date/location |
| `agreement_generated` | Agreement created | Link to sign, deadline reminder |
| `agreement_signed` | Customer signs | Confirmation, next steps |
| `checkin_complete` | Customer checks in | Status update, what happens next |
| `prep_complete` | Vehicle cleaned/ready | "Your car is ready!", pickup location |
| `walkaround_complete` | Inspection done | Ready for handover |
| `rental_activated` | Keys handed over | Return date, return location, emergency line |
| `return_initiated` | Return process started | Inspection in progress |
| `rental_completed` | Rental closed out | Deposit release info, thank you |
| `deposit_released` | Deposit released | Amount released, timeline |

---

### Technical Changes

**File: `supabase/functions/send-booking-notification/index.ts`**

1. **Fix the `locations` join** -- change `locations (name, address, city)` to `locations!location_id (name, address, city)` and add `return_locations:locations!return_location_id (name, address, city)`.

2. **Add missing stages** to the `NotificationRequest` type: `payment_received`, `deposit_released`.

3. **Rewrite all stage templates** with rich content:
   - **SMS**: Every message includes booking code, vehicle, key date, and location in a concise format.
   - **Email**: Every email uses the existing branded HTML wrapper but with a detailed booking summary table (code, vehicle, dates, location, amount) embedded in every stage email.

4. **Fix vehicle info** -- replace the broken `year/make/model` concatenation with just the category name.

5. **Add return location** to the `rental_activated` email when it differs from pickup.

6. **Update the sign link** to use the correct app URL (use `APP_URL` env var or fallback to `https://c2crental.ca`).

No database changes required. No new secrets needed -- Resend and Twilio are already configured.

