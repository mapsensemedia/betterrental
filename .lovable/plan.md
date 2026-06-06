## Goal

Replace the two text-heavy sections on `/abbotsford` — **Simple Booking Process** and **Insurance, Deposits & Requirements** — with visually rich card layouts that mix on-brand imagery and icon tiles. Same information, far less reading weight.

## Scope

In scope:
- `src/pages/Abbotsford.tsx` — rewrite only the two sections shown in the screenshot.
- Generate 2 new hero images for these sections and 1 small supporting image (saved to `src/assets/`).

Out of scope:
- Hero, search card, fleet grid, FAQ, CTA — unchanged.
- No changes to `/surrey`, `/langley`, or `/`.

## New design

### 1. Simple Booking Process — "Visual timeline + illustration"

Two-column layout (stacks on mobile):

- **Left column (image)**: generated image, ~4:5 portrait. Subject: a customer's hand receiving keys at a clean modern rental counter, soft natural light, neutral palette with subtle green accent (`#197149` — C2C brand). Rounded `rounded-2xl`, soft shadow.
- **Right column (steps)**: 5 numbered steps rendered as compact horizontal "pill" cards instead of the current stacked list. Each card: small numbered circle (existing primary token), bold one-line label (3–5 words), supporting half-line of detail. Connected by a thin vertical accent line on the left of each row. Italic "Extensions, changes…" line moves below as a quiet caption.

Step labels (condensed from current copy):
1. **Pick dates & vehicle** — Online or by phone
2. **Share driver details** — Licence, age, additional drivers
3. **Review your quote** — Insurance, deposit, mileage
4. **Confirm & sign** — Digital agreement to your inbox
5. **Pick up in Abbotsford** — Walk-around & drive away

### 2. Insurance, Deposits & Requirements — "Icon tile grid + photo strip"

Replace the two-column bullet list with a **6-tile icon grid** (3 cols desktop, 2 cols tablet, 1 col mobile). Each tile: card with light-tinted background, icon at top (lucide), short title, one-line description. Six tiles:

| Icon | Title | Description |
|------|-------|-------------|
| `IdCard` | Valid driver's licence | BC or accepted international, held 2+ years |
| `CalendarCheck` | Age 21+ | 25+ for premium vehicles |
| `CreditCard` | Credit card deposit | Held at pickup, released on return |
| `ShieldCheck` | ICBC coverage included | Plus optional damage waiver at checkout |
| `Snowflake` | Winter tires Nov–Mar | Standard on AWD/4WD vehicles |
| `Globe2` | Cross-border ready | US trips need advance approval & extra docs |

Below the grid, a slim **photo strip banner** (full-width, ~3:1) with a subtle gradient overlay and a short reassurance line: *"Our team will walk you through exact requirements before you confirm — no surprises."* with a small "Talk to us → /contact" link. Image: generated photo of a friendly C2C staff member handing over a clipboard / agreement at the counter, warm and trustworthy.

## Image generation

Use the agent `generate_image` tool, `standard` quality (no text in images), saved to `src/assets/`:

1. `src/assets/abbotsford-keys-handover.jpg` — close-up of a hand receiving car keys at a modern, minimal rental counter; warm natural light; neutral palette with a hint of forest green; shallow depth of field; photographic, editorial style. (Booking Process section)
2. `src/assets/abbotsford-counter-handshake.jpg` — friendly C2C-style agent across a counter handing a clipboard to a customer; warm bright daylight; clean modern interior; soft green accent. (Requirements section banner)

Both imported as ES6 image imports — no asset CDN externalization.

## Technical detail

- Edit only the two `<section>` blocks for "Simple Booking Process" and "Insurance, Deposits & Requirements" inside `src/pages/Abbotsford.tsx`.
- Use existing design tokens (`bg-card`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `text-primary-foreground`, `border-border`, `text-accent`). No hardcoded colors except the existing `#197149` brand accent already used in the hero.
- All new icons sourced from `lucide-react` (already used on the page).
- New constants for steps/tiles live at the top of the file alongside existing arrays.
- Responsive: tiles `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`; booking image stacks on top on mobile.
- Accessibility: each image has descriptive `alt`; tile titles use `<h3>` so heading order stays h1 → h2 → h3.

## Verification

After implementation, view `/abbotsford` in preview and confirm:
1. Booking Process section shows image + 5 visual step cards, no bare bullet list.
2. Requirements section shows 6 icon tiles + photo banner, no bullet list.
3. Hero, search widget, fleet, FAQ, CTA unchanged.
4. Mobile layout stacks cleanly (single column).
