

## Fix: Correct Return Time for Booking ZM87GULY

### Current State

| Field | Current Value | Correct Value |
|-------|--------------|---------------|
| `actual_return_at` | `2026-03-27 04:30:00+00` (9:30 PM PDT) | `2026-03-26 16:30:00+00` (9:30 AM PDT) |
| `late_return_fee` | 0 | 0 (already correct) |
| `late_return_fee_override` | NULL | NULL (already correct) |

The AM/PM bug we just fixed in the time picker caused this — 9:30 AM was saved as 9:30 PM (21:30 → UTC 04:30 next day).

### What Needs to Change

**One data update** — set `actual_return_at` to `2026-03-26 16:30:00+00` (9:30 AM PDT on March 26).

### What Does NOT Need to Change

- `late_return_fee` is already 0
- No late fee payment records exist (only a rental payment of $207.18 and a deposit authorization of $350)
- No late fee override fields are set
- `return_state` is `evidence_done` — correct for the current return flow position
- No code changes needed

### Verification After Fix
- `actual_return_at` = 9:30 AM (before the 6 PM `end_at`) → on-time/early return
- No late return fee or charges
- Booking timeline reflects early return

