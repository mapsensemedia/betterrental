

## Current State

**Already linked (skip):**
| Booking | customer_id | Customer Record |
|---------|------------|-----------------|
| 76SH95PZ | 31077be8 | CHARANJIT SINGH KALIRAI |
| BXUF8BJR | cfc0dc90 | okoli walter |
| NQWRN79T | 1b056903 | KAUR AMANDEEP |
| VQX7TWLZ | 5c3edf2e | LESLIE DALE HUNTER |
| WL6GWEGZ | e27b4724 | MAURICIO ALBERTO PEREZ GONZALEZ |

**Need fixing (6 bookings, 5 new customer records):**
| Booking | True Customer | Available Data |
|---------|--------------|----------------|
| F2PRBG3P | Paramjeet Dillon | No contact fields on booking |
| 6TYA39YT | Sangat Singh Khalsa | card_holder: "Sangat singh" |
| RE44EN2U | Brahmdeep | card_holder: "gurnishan singh virdi" (different person — use provided name) |
| FZH86F8W | Sumanpreet Kaur | No contact fields on booking |
| 69M6RYX9 | Lovepreet Singh | card_holder: "lovepreet singh", pickup: "LOVEPREET s", card: MC 3393 |
| 4HL5K9QV | Lovepreet Singh | No data (confirmed via audit log) |

69M6RYX9 and 4HL5K9QV share the same customer — one record, two links.

## Plan

### Step 1 — Create 5 customer records

Insert into `customers` table:
1. **PARAMJEET DILLON** (no phone/email available)
2. **SANGAT SINGH KHALSA** (no phone/email available)
3. **BRAHMDEEP** (no phone/email available)
4. **SUMANPREET KAUR** (no phone/email available)
5. **LOVEPREET SINGH** (no phone/email available)

All using name only since contact fields are not populated on these bookings.

### Step 2 — Link 6 bookings to customer_id

Update each booking's `customer_id` to the corresponding new customer record:
- F2PRBG3P → Paramjeet Dillon's customer ID
- 6TYA39YT → Sangat Singh Khalsa's customer ID
- RE44EN2U → Brahmdeep's customer ID
- FZH86F8W → Sumanpreet Kaur's customer ID
- 69M6RYX9 → Lovepreet Singh's customer ID
- 4HL5K9QV → Lovepreet Singh's customer ID (same record)

### Step 3 — Verify

Query all 11 bookings joining `customers` to confirm `customer_id` is set and `full_name` matches the expected name.

### No code changes needed
The display layer (`src/domain/bookings/queries.ts`) already prefers `customers` over `profiles` when `customer_id` is set — these bookings will immediately show the correct names.

