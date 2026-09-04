# Extend E5JS3DUZ to 8 September — cost

Rental E5JS3DUZ (Rolf Wagner, Abbotsford Centre, walk-in, currently active).
Pickup 21 Aug 3:30 PM. Current return 4 Sep 3:30 PM = 14 days.
Extending to 8 Sep 3:30 PM = 18 days (4 extra days).

## New total for the full rental (18 days)

| Line | 14 days (now) | 18 days (new) |
| --- | --- | --- |
| Vehicle ($79.99/day + weekend uplift) | $1,191.85 | $1,547.81 |
| Smart Protection ($37.99/day) | $531.86 | $683.82 |
| Daily regulatory fees ($2.50/day) | $35.00 | $45.00 |
| Subtotal | $1,758.71 | $2,276.63 |
| GST + PST (12%) | $211.05 | $273.19 |
| Card processing fee (1.5%) | $26.38 | $34.15 |
| **Total rental cost** | **$1,996.14** | **$2,583.97** |

- Extra charge for the 4 added days: **$587.83**
- No add-ons, no additional drivers, no drop-off fee, no young-driver fee on this rental.
- Security deposit stays a separate $350 hold (already authorised).

## Money already taken

- Rental payment received: $445.13 (card, 21 Aug)
- So after the extension the balance still owing on the rental is **$2,138.84**.
  Note: earlier extensions (7 → 9 → 12 → 14 days) were never collected, so most of
  this balance predates the new extension.

## What I will do on approval

1. Apply the extension through Modify Rental (server-side reprice, `operation: "modify"`,
   new return 2026-09-08T22:30:00Z) so the booking, the agreement and the activity log all update.
2. Confirm the stored figures land on subtotal $2,276.63 / tax $273.19 / processing fee $34.15 /
   total $2,583.97, and report the recorded balance owing.

The stored 14-day price matches today's rate card exactly, so there is no pricing drift and
only the 4-day difference is added.

## Technical notes

- Booking id `d1463fe0-49c1-4577-a072-c5f41c7921f6`; figures reproduced with
  `calculateBookingPricing` (`src/lib/pricing.ts`) at 79.99 vehicle / 37.99 Smart (Group 1),
  pickup 2026-08-21T22:30:00Z — matches the stored 14-day subtotal to the cent.
- Weekend uplift is 15% per Fri/Sat/Sun; 18 days adds 2 weekend days versus 14 days.
- No payment will be taken automatically; collection stays a separate ops step.
