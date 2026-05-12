## Add third location: Abbotsford – 32835 South Fraser Way

### Good news: most of the wiring already exists

- The `locations` table already has an **Abbotsford Centre** row (UUID `a1b2c3d4-3333-4000-8000-000000000003`) with the correct address `32835 South Fraser Way, Abbotsford, BC`, `fee_group = 'abbotsford'`, phone, email, and hours filled in. It's just `is_active = false`.
- Cross-location drop-off fees are already defined in code:
  - `src/lib/pricing.ts` and `supabase/functions/_shared/booking-core.ts` both return **$75** for `abbotsford|surrey` and `abbotsford|langley` pairs. No fee changes needed.
- Customer-facing surfaces (`LocationsSection`, `Locations` page, `LocationDetail`, footer/topnav, `/abbotsford` SEO page, blog posts, sitemap) all already reference Abbotsford. They auto-show once `is_active = true`.

### Inventory question (need your call before I build)

You said *"no separate inventory — same car categories."* In our system, every `vehicle_unit` is tied to **one** `location_id`, which is how availability and ops queues filter cars per branch. Two ways to honor "no separate inventory":

| Option | What it means | Trade-off |
|---|---|---|
| **A. Customer-facing only** (recommended) | Abbotsford appears in the website / SEO / "Our Locations" page and on the `/abbotsford` landing page, but **is not selectable as a pickup/return location at checkout**. Customers in Abbotsford still book Surrey or Langley pickup. | Zero ops changes. Pure marketing presence. |
| **B. Bookable at checkout, units stay at Surrey/Langley** | Abbotsford shows in pickup/return dropdowns. When a customer picks Abbotsford, we route the booking to an existing Surrey or Langley unit (since no units live at Abbotsford). Surrey↔Abbotsford and Langley↔Abbotsford show the existing **$75** drop-off fee. | Requires availability logic to fall back to other locations' units when Abbotsford has none, otherwise customers see "no cars available." Bigger code change. |
| **C. Make all units location-agnostic** | Set `vehicle_units.location_id = null` so every unit is bookable from any branch. | Affects how Surrey vs Langley inventory currently operates — breaks the per-branch ops queues you set up last week. **Not recommended.** |

### If you pick A (recommended), the changes are tiny

1. **DB migration (1 row)**: flip `is_active` to `true` on the Abbotsford row.
2. **`src/constants/rentalLocations.ts`**: flip Abbotsford's `isActive: false` → `true`.
3. **Hide from checkout pickup/return dropdowns** so it doesn't appear bookable. Either:
   - keep `is_active = true` and add a small `bookable = false` filter in checkout (new column or hardcoded skip-list), **or**
   - leave the row inactive and just toggle the hardcoded mirror — meaning `/abbotsford` SEO page + footer link work, but the DB-driven dropdowns stay clean.
4. Verify `/abbotsford`, footer/topnav, and the "Our Locations" section show the new branch.

**Files touched (Option A):** ~3 (1 migration + 1 constants file + maybe 1 checkout filter).

### If you pick B, additional work

- New availability fallback logic in `src/lib/availability.ts` and `supabase/functions/_shared/availability.ts` to treat Abbotsford as "borrows from Surrey + Langley pool."
- Ops queue filters need to decide where the booking shows up (Surrey or Langley) for the assigned unit's home branch.
- Estimated **5–8** additional file changes.

### Question for you

**Which option — A, B, or C?** (My recommendation is A: zero risk to your current ops, gives you the SEO/marketing presence in Abbotsford, and customers still book Surrey or Langley which is where the cars actually are.)
