# New Engineer Onboarding Guide

## System Mental Model

This is a **car rental platform** with a trust-no-client security architecture:

```
Browser (untrusted) → Edge Functions (trust boundary) → PostgreSQL (enforced)
```

- **All financial computation happens server-side** in `supabase/functions/_shared/booking-core.ts`
- Client-side pricing (`src/lib/pricing.ts`) is display-only and explicitly labeled as such
- PostgreSQL has "seatbelt" triggers that zero out financial fields if writes don't come through service_role
- RLS + FORCE RLS ensures even the table owner respects access policies

## Key Folders

```
src/
├── components/         # React UI components
├── hooks/              # React Query hooks (data fetching)
├── lib/                # Utilities, client-side pricing
├── pages/              # Route components
├── integrations/
│   └── supabase/
│       ├── client.ts   # Auto-generated, DO NOT EDIT
│       └── types.ts    # Auto-generated, DO NOT EDIT

supabase/
├── functions/
│   ├── _shared/        # Shared server libraries
│   │   ├── auth.ts     # JWT validation, role enforcement
│   │   ├── booking-core.ts  # Pricing engine (SOURCE OF TRUTH)
│   │   ├── cors.ts     # CORS + rate limiting
│   │   └── ...
│   ├── create-booking/
│   ├── stripe-webhook/
│   └── ...
├── migrations/         # SQL migrations (read-only)
└── config.toml         # Auto-generated, DO NOT EDIT

knowledgebase/          # You are here
```

## Critical Files

| File | Purpose | Editable? |
|------|---------|-----------|
| `supabase/functions/_shared/booking-core.ts` | Server pricing engine | Yes — with extreme care |
| `src/lib/pricing.ts` | Client pricing preview | Yes — must stay synced with booking-core.ts |
| `src/integrations/supabase/types.ts` | DB type definitions | NO — auto-generated |
| `src/integrations/supabase/client.ts` | Supabase client | NO — auto-generated |
| `supabase/config.toml` | Supabase config | NO — auto-generated |

## Security Model

1. **RLS** on all public tables → users can only see their own data
2. **FORCE RLS** on financial/incident tables → even table owner must go through policies
3. **Seatbelt triggers** → `trg_block_sensitive_booking_updates`, `trg_enforce_addon_price`, `trg_enforce_driver_fee` zero out financial fields unless `current_setting('role') = 'service_role'`
4. **Price validation** → server recomputes all prices; if |server - client| > $0.50, booking is rejected

## Pricing Engine

Two implementations, one truth:
- **Server** (`booking-core.ts`): `computeBookingTotals()` — reads rates from DB, computes everything
- **Client** (`pricing.ts`): `calculateBookingPricing()` — mirrors server logic with hardcoded rates for UI preview

The $0.50 tolerance absorbs rounding differences, not intentional drift. Any constant change must update BOTH files.

## First-Day Tasks

1. **Read** `knowledgebase/01-system-overview.md` through `knowledgebase/11-glossary.md`
2. **Trace** a booking flow: start at `create-booking/index.ts`, follow through `booking-core.ts`, see the DB writes
3. **Read** the seatbelt triggers in the migrations folder — understand what they block and why
4. **Query** the test database:
   ```sql
   SELECT * FROM bookings ORDER BY created_at DESC LIMIT 5;
   SELECT * FROM booking_add_ons WHERE booking_id = '<id>';
   SELECT * FROM audit_logs WHERE entity_id = '<id>' ORDER BY created_at DESC;
   ```
5. **Test** a pricing scenario: calculate a 3-day rental manually using the constants, then compare with `computeBookingTotals` output
6. **Review** RLS policies: `SELECT * FROM pg_policy WHERE polrelid = 'public.bookings'::regclass;`

## Debug Exercises

1. **Exercise**: A booking has `total_amount = 0`. Why?
   - Check if seatbelt trigger zeroed it (non-service_role write)
   - Check audit_logs for the mutation

2. **Exercise**: Add-ons show $0 price. Why?
   - `trg_enforce_addon_price` fired because insert didn't use service_role
   - Correct path: `persist-booking-extras` edge function

3. **Exercise**: Drop-off fee is $0 but locations differ. Why?
   - Check `locations.fee_group` for both pickup and return locations
   - NULL fee_group → $0 fee
