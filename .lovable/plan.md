

## March 2026 — Booking & Analytics Summary

Here is a consolidated read of all booking and analytics activity for **March 1 – March 31, 2026**, pulled directly from the database. No code changes are needed — this is a reporting answer.

### Bookings
| Metric | Value |
|---|---|
| Total bookings created | **37** |
| Completed | 26 |
| Active | 1 |
| Pending | 3 |
| Cancelled | 7 |
| Unique customers | 33 |
| Unique vehicles booked | 8 |
| Total billed | **$12,220.42** |
| Avg booking value | $330.28 |
| Avg rental length | 3.3 days |
| Total rental days | 123 |

### Fulfilment
- Pickups scheduled in March: **33**
- Scheduled returns in March: 31
- Actual returns in March: 30

### Revenue (payments table — source of truth)
| Status | Count | Amount |
|---|---|---|
| Completed | 30 | $6,824.72 |
| Captured | 2 | $520.74 |
| Authorized (holds) | 10 | $3,500.00 |
| Voided | 4 | $1,400.00 |
| **Collected revenue (completed + captured)** | **32** | **$7,345.46** |

### Web Analytics — Funnel (analytics_events)
| Stage | Events | Unique sessions |
|---|---|---|
| Page views | 965 | 229 |
| Search performed | 434 | 234 |
| Vehicle viewed | 238 | 139 |
| Vehicle selected | 282 | 146 |
| Protection selected | 72 | 56 |
| Add-ons selected | 33 | 28 |
| Checkout started | 50 | 43 |
| Payment method selected | 20 | 12 |
| Booking completed (tracked) | 12 | 12 |
| Errors logged | 10 | 5 |

**Funnel conversion (session-based):** Search → Vehicle viewed ≈ 59% → Checkout started ≈ 31% of viewers → Booking ≈ 28% of checkouts started.

### Incidents
- Damage reports filed: **2** (1 minor, 1 moderate)
- Estimated damage cost: $350.00

### Daily booking trend (top days)
- Mar 16 — 5 bookings, $3,252.49 billed (peak day)
- Mar 21 — 4 bookings, $1,017.77
- Mar 14 / Mar 15 — 3 bookings each
- Mar 10 / 19 / 25 / 27 / 28 — 2 bookings each

### Notes
- "Total billed" (bookings.total_amount) reflects contract value; **collected revenue is $7,345.46** — this is the authoritative number per your finance rules.
- Abandoned carts table has no March entries — tracking may not be firing for anonymous sessions.
- `unique_users: 0` on analytics events means most traffic is from unauthenticated sessions (expected for a booking funnel).

