# Make customer cancellation work on the first click

## What I found

I traced the cancellation the customer just did (booking EQCX2Y4L, 7:58 PM tonight):

- The cancel action ran **twice**, two seconds apart. Only the second run completed and cancelled the booking. The first run left no trace at all — the cancel action currently logs nothing when it starts or fails, so a failed attempt is invisible.
- A cancellation **text was sent** on the successful run (recorded as sent at 7:58:43 PM).
- The cancellation **email failed**, with the same reason as every other customer email: the `c2crental.ca` sending domain is still not verified, so emails to customers are rejected. This is unrelated to the cancel button and cannot be fixed in code.

So two real problems: the button is unreliable on the first press, and when a press fails the customer sees a generic failure with nothing recorded anywhere.

## What to change

1. **Never fail on a repeat press.** If the booking is already cancelled and belongs to the same customer, treat the request as done and report success instead of an error. Pressing twice can therefore never produce a scary message, and never a second text.

2. **Send the text after replying, not before.** Right now the reply to the browser waits for the text-message service to start up and finish. Move that to run in the background after the cancellation is confirmed, so a slow or failing message service can never make the button look broken. Still exactly one text per cancellation, still nothing resent for older cancellations.

3. **Record every attempt.** Log the start, the outcome, and the real error for each cancellation attempt, and write a failed row to the notification log if the text cannot be attempted. Next time a customer reports this we will have evidence.

4. **Tidy the dialog.** Keep the button disabled from the first press until the result comes back (one request in flight only), show the server's actual reason instead of a generic message, refresh the booking on the page after success, and close cleanly.

5. **Leave untouched:** pricing, availability, payment and deposit handling, the security triggers, the staff void flow, and all other notification stages.

## Still blocked after this

Cancellation **emails** will keep failing until the `c2crental.ca` domain is verified for sending. Texts are unaffected. Say the word and I will walk you through the domain verification separately.

## Technical notes

- `supabase/functions/cancel-booking/index.ts`: add entry/exit logging; make the `CANCELLABLE` check return `{ success: true, alreadyCancelled: true }` when status is already `cancelled` and `user_id` matches; move the `send-booking-notification` invoke into a background task after the response is prepared; log a `failed` `notification_logs` row when the invoke cannot be dispatched.
- `src/components/booking/CancelBookingDialog.tsx`: guard against concurrent submits, surface `data.error` / `error.message` verbatim, invalidate the booking query on success.
- No database migration, no config change; redeploy `cancel-booking` only.
