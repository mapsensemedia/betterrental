# Text Message (SMS) Reference — C2C Rental

Written from reading the code only. Nothing was changed. Where something cannot
be determined from the code it says CANNOT TELL FROM CODE.

All texts go out through **one single Twilio account** — the same account
credentials and the same sending number are used by every text in this system.
There is no second provider and no marketing/bulk texting tool anywhere in the
code. [TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER]

---

## 1. Every text the system can send

| What the message says | Who receives it | What exactly causes it | Email sent at the same time? | Provider |
|---|---|---|---|---|
| Booking confirmed — vehicle, pickup/return date and time, branch, link to the booking | The customer | Automatically the moment a booking is saved: online booking, guest booking, walk-in booking created by staff, or a guest verifying their code at checkout | Yes — the confirmation email goes out in the same step | Twilio (single account) |
| "New C2C {branch} booking" — renter name, pickup date/time, booking code, Paid Online / At pick-up, return date/time | The **branch phone** (see section 3) | Automatically the moment any booking is created (online, guest or walk-in) | No | Twilio |
| Booking updated / booking cancelled / pickup-tomorrow reminder (three more versions of the customer booking text exist in the code) | The customer | Nothing in the app asks for these three. See section 4 | Only for cancellations, which are sent by a different message (below) | Twilio |
| "New C2C {branch} support ticket" — ticket number, renter name, renter phone, booking, issue text | The **branch phone** | Automatically when a support ticket is created. Fires from two places: a database rule on the ticket itself, and the customer-facing ticket screen | No | Twilio |
| "We've received your request {ticket no.}… call {branch number}" | The customer | Automatically when a **customer** creates a support ticket (database rule) | No | Twilio |
| "Your ticket {no.} has a new reply" | The customer | When a staff member sends the **first** customer-visible reply on that ticket | No | Twilio |
| 6-digit verification code, "expires in 10 minutes" | The customer | When the customer presses the send-code button on the checkout verification screen. The customer can choose code-by-text or code-by-email — one or the other, never both | No (email is the alternative, not an addition) | Twilio |
| 6-digit code to approve marking a booking as paid by bank transfer | **A hard-coded mobile number: +1 672-755-3399** | When staff/admin press the confirm button in the "Mark bank transfer paid" dialog | No | Twilio |
| Rental agreement is ready to sign | The customer | Automatically whenever a rental agreement is generated (handover step, or regenerated after a change), unless generation is run in silent/backfill mode | Yes — email with the sign link goes out in the same step | Twilio |
| Rental lifecycle updates — payment received, licence approved, licence rejected, vehicle assigned, agreement ready, agreement signed, check-in complete, vehicle prepped, inspection complete, rental active, return started, rental complete, deposit released, booking cancelled | The customer | Each one is fired by a specific staff action in the app or a status change — see section 4 for which ones are actually wired up | Yes — email and text are sent together from the same step | Twilio |
| Payment confirmed — amount paid, deposit held, pickup details | The customer | **Nothing. Never fires** (see section 4) | Would be yes if it ever ran | Twilio |
| Overdue rental / return-due-soon | Nobody | The nightly rental check only creates in-app alerts. The code has a note reading "TODO: Send SMS/email to customer about overdue status" — no text is sent | No | n/a |
| Delivery driver messages | Nobody | There is **no** driver texting anywhere in the code | No | n/a |
| Marketing / promotional texts | Nobody | None exist in the code | No | n/a |

---

## 2. Does any admin ever get a text?

**Yes — in exactly one place, and you are otherwise correct.**

- Admin notifications generally are **email plus in-app alerts only**. The admin
  notification code contains no texting at all. [supabase/functions/notify-admin]
- The one exception: the bank-transfer approval code is texted to a
  **hard-coded personal-looking mobile number, +1 672-755-3399**, written
  directly into the code. It is not in settings and not in the database, so
  changing it means changing code. [supabase/functions/send-bank-transfer-otp]
- Everything else goes to customers or to branch numbers.

Is a branch number really someone's personal mobile? The branch numbers on file
are the two published business numbers (604-763-4242 and 604-306-1029), so no.
**But** the branch alert is designed to text every staff member at that branch
who has alerts switched on and a mobile number saved on their staff profile. Right
now no staff profile has a phone number saved, so today every branch text falls
back to the business numbers. The moment someone saves a personal mobile on a
staff profile, that personal mobile starts receiving branch texts.
[supabase/functions/notify-branch-sms]

---

## 3. Where the branch numbers come from

Two sources, in this order:

1. **Per staff member, per branch.** Staff assigned to a branch, marked active,
   with alerts switched on, and with a phone number saved on their profile. Each
   one gets their own copy of the text. Matched by branch, not by name.
2. **Fallback list** used only when step 1 finds nobody. It is a single settings
   entry in the database called `branch_sms_recipients`, and it currently holds:
   - Surrey Newton → +1 604-763-4242
   - Langley Centre → +1 604-763-4242
   - Abbotsford Centre → +1 604-306-1029
   - **Langley 200th Street is missing from this list.**

If neither exists, nothing is sent and a failure is recorded.

Where to change one: add or edit the phone number on the staff member's own
profile and switch their alerts on (that takes priority), or change the
`branch_sms_recipients` settings entry in the backend for the branch fallback.
The support-callback number quoted inside customer support texts is separate —
it comes from the branch's own phone number on the location record
(all four branches have one), falling back to (604) 763-4242.

---

## 4. Which messages never actually fire

### Written but never triggered by anything
- **Payment confirmed text and email.** The whole message exists and is
  deployed, but no screen, button, payment webhook or backend step ever calls
  it. [supabase/functions/send-payment-confirmation]
- **Booking updated** and **pickup-tomorrow reminder** texts. Both templates
  exist; nothing in the app requests them. There is no reminder scheduler
  anywhere — no timed job of any kind sends texts.
- **Booking cancelled** version inside the confirmation-text file is unused; a
  different cancellation message is used instead (that one does fire).
- **Overdue and return-due-soon customer texts.** Marked as a to-do in the code.
- Three lifecycle messages have templates but no caller: **prepped and ready for
  pickup**, **return started**, and **rental complete**. Note the "rental
  complete" case: when a booking is marked completed the code asks for a stage
  name ("return_completed") that does not exist in the message list, so the
  customer gets a bland catch-all "Update for booking X, check your email"
  text instead of the proper completion message.

### Only fires if staff complete that exact step in the app
Every one of these sends only because a staff member pressed the button in the
system. Done on paper or skipped, and the customer is silently never told:
- Licence approved / licence rejected — the verification screen
- Vehicle assigned — the assign-vehicle action
- Check-in complete — the check-in step
- Inspection complete — the walkaround step
- Agreement ready to sign — generating the agreement
- Agreement signed — the signature step
- Rental active — marking the booking active (and it is deliberately **skipped**
  when staff activate manually from the ops screen)
- Deposit released — the deposit release action
- Booking cancelled — cancelling or voiding through the system
- Ticket reply text — only on the first customer-visible staff reply; internal
  notes do not count
- Bank-transfer code — only from that dialog

### Could send twice
- **Branch support-ticket alert** is fired twice for one ticket: once by the
  database rule on the ticket, once by the customer ticket screen. A duplicate
  guard (one text per ticket per phone number) stops the second one, so in
  practice one text arrives. If that guard record ever fails to write, two
  would arrive.
- **Booking confirmation text** is guarded to one per booking per message type
  per day. A guest who books and then verifies with a code triggers the same
  confirmation twice; the guard absorbs the second.
- **Agreement ready** has **no duplicate guard at all**. Regenerate an agreement
  three times and the customer gets three texts and three emails.
- **Lifecycle texts** are guarded loosely: the same stage will not resend within
  one hour, but will resend if repeated after an hour.

---

## 5. When a message fails

Failures are recorded in the backend table **`notification_logs`**, one row per
attempt, per channel. Each row records: channel (sms or email), the message type,
the booking, the customer, sent / failed / skipped, the Twilio message ID when it
succeeded, and the error text when it failed.

What you can search by: booking (the row stores the booking, so you can search a
booking's texts), the message type, the date/time, and the customer. **You cannot
search by phone number** — the recipient's number is not stored in the row,
except that some failure rows include it inside the error text (for example
"invalid_phone: 604…").

Recorded reliably (booking lookup problems, no phone on file, unreadable phone
number, no branch recipient, Twilio not configured, Twilio rejection):
- Booking confirmation text, branch alerts, support ticket texts.

Recorded only partly, so failures can disappear:
- **Verification codes** (checkout code and bank-transfer code) write **nothing**
  to the log at all. If a code text fails, it exists only in the server console
  logs, which age out.
- **Agreement ready** and **lifecycle updates** log the send result, but if the
  booking can't be found they return an error without writing a row.
- Lifecycle updates write **one row for both channels combined**, so you cannot
  tell from the log whether it was the text or the email that failed.

**Retries: no.** Nothing in the system retries a failed text, ever. There is no
queue, no scheduler, no backfill.

**Does anyone get told: no.** No alert, email or dashboard warning is raised when
a text fails. It appears only in `notification_logs` and the server console, and
someone has to go and look.

**Delivery confirmation: no.** The system stores the Twilio message ID but there
is no callback from Twilio, so a text accepted by Twilio and then rejected by the
carrier is recorded here as "sent".
