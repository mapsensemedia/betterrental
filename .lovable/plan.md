# SEO Diagnosis — c2crental.ca

## What the data actually shows (Semrush, CA)

- **Authority Score: 7/100**, 30 referring domains, 89 backlinks. Several are spammy PBN anchors ("high quality dofollow backlinks DA 50 PA 40 …") pointing at your domain — likely negative SEO or a bad past link-building campaign.
- **Keyword trend is UP, not down**: 0 → 19 → 31 → 47 → 118 keywords over the last 4 months. The site is *gaining* Google visibility, not losing it. What you're likely experiencing is that you rank **positions 10–14 (page 2)** for your money terms instead of #1:
  - `car rental surrey` (4,400/mo) — **#14**
  - `car hire surrey bc` (1,900/mo) — **#12**
  - `car rental companies in surrey bc` (1,900/mo) — **#11**
  - `surrey car rental` — #10, `car rental in surrey` — #10
- **Traffic concentration risk**: 72% of estimated traffic goes to `/`. `/surrey`, `/langley`, `/abbotsford` rank in the 28–60s — they are not competing for their own city terms.

## Root causes (ranked by impact)

### 1. No per-route metadata — every page ships the homepage `<head>` (HIGH)

The app is a pure client-side Vite SPA. `react-helmet-async` is **not installed**. `/surrey`, `/langley`, `/abbotsford`, `/blog/*`, `/compare` all serve the exact same `<title>`, `<meta description>`, canonical, og:*, and JSON-LD from `index.html`. Googlebot renders JS but treats duplicate titles/canonicals as one page — this is why your city and blog pages don't rank for their own terms.

### 2. No pre-rendering / SSR (MEDIUM)

Googlebot executes JS but with delay and budget limits; Bing, LinkedIn, Facebook, X previews don't run JS at all. Body content only appears after hydration — social previews and secondary crawlers see the `<noscript>` fallback only. Options (pick one):

- `**vite-plugin-prerender` / `react-snap**` — cheapest fix. Prerenders each route to static HTML at build time. Works for the ~15 public routes here.
- **Migrate to the Lovable TanStack SSR stack** — more work, but real SSR and per-request metadata. Overkill unless we add lots of dynamic pages.
- Recommend prerender for now.

### 3. `robots.txt` blocks pages that should be indexable (MEDIUM)

Currently disallowed but publicly useful:

- `/compare` — a comparison landing page we just built and added to the sitemap. Contradicts the sitemap.
- `/protection`, `/add-ons` — marketing/informational; blocking them wastes crawl equity.
Keep the transactional ones blocked (`/checkout`, `/booking/`, `/dashboard/`, `/auth/`, `/admin/`, etc.).

### 4. City pages compete with `/` for the same anchor (MEDIUM)

Both `/` and `/surrey` rank for `car rental surrey` — Google sees them as duplicates because their `<head>` is identical and their internal anchor text overlaps. Fix flows from #1: give each city page a unique title/description/canonical + unique H1 and body copy focused on that city.

### 5. Toxic backlink profile (MEDIUM)

Two PBN-style anchors and multiple `bisprofit.com` / `8coint.com` / `toplikevideo.com` links exist. These likely came from a black-hat "rank first page fast" service. Recommend disavowing via GSC once GSC is connected.

### 6. Google Search Console not connected (MEDIUM)

No coverage/impressions data, no ability to submit sitemap, no disavow. Flagged by Lovable's own scanner.

### 7. Minor content / schema issues (LOW)

- `LocalBusiness` openingHours 00:00–23:59 every day — Google may flag as untrustworthy. Use real hours.
- LCP flagged slow by Lighthouse — hero image needs `fetchpriority="high"`, explicit width/height, no `loading="lazy"`.
- Blog listings all live on one page; individual posts lack `Article` JSON-LD (they'd need per-route head first).
- `og:image` at `/c2c-og-image.png` — verify the file exists at that path in `public/`.

## Prioritized fix plan

### Phase 1 — Unblock rankings (biggest lift, ~1 build)

1. Install `react-helmet-async`, add `HelmetProvider` in `src/main.tsx`.
2. Remove `<link rel="canonical">` from `index.html` (keep sitewide og:* as fallback).
3. Add `<Helmet>` with unique **title, description, canonical, og:title, og:url, og:description, Article/LocalBusiness JSON-LD** to:
  - `/surrey`, `/langley`, `/abbotsford`
  - all `/blog/*` posts (Article + BreadcrumbList schema)
  - `/compare`, `/about`, `/contact`, `/locations`
4. Edit `public/robots.txt` — remove `Disallow: /compare`, `/protection`, `/add-ons`.

### Phase 2 — Make crawlers see real HTML

5. Add `vite-plugin-prerender` (or `react-snap`) to prerender the public routes listed in `sitemap.xml` at build time. Verify with `curl -A "facebookexternalhit"` that each URL returns full HTML.

### Phase 3 — Content strengthening

6. Rewrite `/surrey`, `/langley`, `/abbotsford` H1 + intro so each targets its own city keyword (currently near-identical copy weakens each). Add a location-specific FAQ block (FAQPage schema).
7. Fix `LocalBusiness` openingHours to real hours.
8. Fix homepage LCP (hero image `fetchpriority="high"`, dimensions, no lazy).

### Phase 4 — Off-page cleanup

9. Connect Google Search Console (Lovable connector), verify domain, submit `/sitemap.xml`.
10. Once GSC has data, export the toxic backlink list and submit a disavow file.
11. Start real link-building: local business directories (BBB, YellowPages CA, BC Chamber), guest posts on BC travel/relocation blogs — reference the new `/blog/c2c-vs-turo-vs-enterprise-surrey` post.

## Technical detail (for the dev)

- Files touched in Phase 1: `package.json`, `src/main.tsx`, `index.html`, `public/robots.txt`, `src/pages/Surrey.tsx`, `Langley.tsx`, `Abbotsford.tsx`, `Compare.tsx`, `About.tsx`, `Contact.tsx`, `Locations.tsx`, all `src/pages/blog/*.tsx`.
- Files touched in Phase 2: `vite.config.ts`, `package.json`. Prerender reads route list from `sitemap.xml`.
- Prerendering is compatible with all existing client-side data fetching — hydration takes over after the static HTML is served.
- Nothing in Phase 1–2 changes any business logic, admin panel, or Supabase code.

## What I'd like to confirm before building

- Approve **Phase 1 + Phase 2 in one pass** (recommended), or start with Phase 1 only and validate rankings before adding prerendering?
- OK to remove `Disallow: /compare`, `/protection`, `/add-ons` from `robots.txt`?
- Do you want me to also queue the GSC connector prompt now, or after code changes ship?