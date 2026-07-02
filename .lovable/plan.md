
## What the uploaded files tell us

**Coverage (as of Jul 2, 2026)**
- Only **6 pages indexed**, 8 not indexed.
- Critical issues: 3 "Crawled – currently not indexed", 2 "Page with redirect", 1 "Blocked by robots.txt".
- Impressions grew from ~10/day in April to ~150–270/day by mid-May → Google is discovering more, but not indexing the new prerendered routes.

**Performance – only 16 URLs are getting impressions**
| Page | Clicks | Impr | Avg Pos |
|---|---|---|---|
| `/` (c2crental.ca) | 438 | 19,743 | 15.96 |
| `/` (www.c2crental.ca) | 150 | 6,187 | 2.18 |
| `/surrey` | 13 | 1,547 | 18.48 |
| `/search` | 11 | 1,771 | 4.27 |
| `/location/{uuid}` | 11 | 1,482 | 7.96 |
| `/locations` | 4 | 557 | 7.29 |
| `/about` | 3 | 528 | 4.68 |
| `/abbotsford` | 0 | 5 | 3.0 |
| `/langley` | 0 | 5 | 4.6 |
| Most blog posts | 0 | 1–92 | — |
| `/protection`, `/add-ons`, `/compare`, `/contact` | not appearing | — | — |

Two red flags:
1. **`c2crental.ca` vs `www.c2crental.ca` are competing** — same content ranking as two properties, splitting authority (pos 15.96 vs 2.18).
2. **`/search` and a raw `/location/{uuid}` page are ranking instead of the city landing pages** — thin/dynamic URLs are eating impressions that should go to `/surrey`, `/langley`, `/abbotsford`.

## Pages to request reindex in Google Search Console

Use "URL Inspection → Request Indexing" for each of these (10/day GSC quota — do the top block first):

**Priority 1 – newly prerendered, missing from index**
```
https://c2crental.ca/langley
https://c2crental.ca/abbotsford
https://c2crental.ca/protection
https://c2crental.ca/add-ons
https://c2crental.ca/compare
https://c2crental.ca/contact
https://c2crental.ca/locations
```

**Priority 2 – blog posts not indexed**
```
https://c2crental.ca/blog
https://c2crental.ca/blog/car-rental-surrey-guide
https://c2crental.ca/blog/daily-vs-weekly-car-rental-surrey-bc
https://c2crental.ca/blog/car-rental-tips-new-drivers-bc
https://c2crental.ca/blog/icbc-car-rental-insurance-bc
https://c2crental.ca/blog/best-road-trips-from-surrey-bc
https://c2crental.ca/blog/c2c-vs-turo-vs-enterprise-surrey
https://c2crental.ca/blog/affordable-car-rental-surrey-langley-abbotsford-bc
```

**Priority 3 – already ranking, reindex to pick up new Helmet metadata**
```
https://c2crental.ca/
https://c2crental.ca/surrey
https://c2crental.ca/about
```

## Fixes I'd ship in code alongside the reindex (build mode)

1. **Kill the www / apex duplication** — pick `c2crental.ca` as canonical (already is in `<SEO>`), then set a permanent 301 from `www.c2crental.ca → c2crental.ca` at the hosting layer, and remove `www.c2crental.ca` from GSC (or set it as the alternate). Right now Google is indexing both, which explains the split rankings.
2. **Noindex `/search`** — it's a dynamic result page; add `<meta name="robots" content="noindex,follow">` via `<SEO>` on `Search.tsx`. That reallocates ~1,700 impressions to city pages.
3. **Investigate `/location/{uuid}`** — one UUID page is out-ranking `/langley` and `/abbotsford`. Either 301 to the matching city page, or noindex the UUID variant and keep the slug pages canonical.
4. **Resolve the 3 "Crawled – not indexed" URLs + 2 redirect chains + 1 robots.txt block** — I need to pull the exact URLs from GSC via the Search Console API (they aren't in the export), then either fix content thinness, shorten the redirect, or unblock in `robots.txt`.
5. **Add internal links** from `/` and `/surrey` (highest-authority pages) to `/langley`, `/abbotsford`, `/protection`, `/add-ons`, `/compare`, and top blog posts — this is the fastest way to push indexing on the new prerendered routes.

## Semrush analysis I'd run

Point-in-time reads via the built-in tools (no connector needed for this pass):

| Check | Tool | Why |
|---|---|---|
| Overall snapshot for `c2crental.ca` | `domain_analysis` | Baseline: traffic, ranking keyword count, top organic terms |
| Historical trend | `seo_trend` | Confirm the "used to rank first, now not visible" claim with month-over-month data |
| Top pages driving traffic | `top_pages` | Compare against GSC top pages; find gaps |
| Competitor discovery + gap | `competitive_analysis` | Who ranks in Surrey/Langley/Abbotsford for the terms we're losing on |
| Head-to-head vs the strongest local competitor | `compare_domains` | Benchmark authority score & keyword overlap |
| SERP + KDI for the 6 near-miss keywords | `serp_analysis` on each: `car rental langley`, `car rental surrey`, `car rental near me`, `car rental`, `rent a car surrey`, `surrey car rental` | Decide which are winnable and what to rewrite the city pages toward |
| Backlink profile | `backlink_analysis` | Check whether authority dropped (likely reason for lost rankings) |

Database: `ca` (Canadian market — the site is 99.5% Canada traffic per GSC).

If, after the snapshot, you want ongoing tracking (daily rank monitoring for those 6 keywords, competitor movement alerts, or a bulk keyword-gap export), I'd wire up the Semrush connector and build a small SEO dashboard into `/admin`.

## Deliverable

Once you approve, in build mode I will:
1. Run the 7 Semrush queries above and summarize findings + a keyword-priority list.
2. Query the Search Console API to pull the exact URLs behind each Coverage issue.
3. Ship the code fixes in "Fixes I'd ship" (noindex `/search`, resolve `/location/{uuid}`, add internal links, verify robots.txt, tighten redirect chains).
4. Hand you the final "request indexing" checklist grouped by day so you don't blow past the GSC 10/day quota.

No changes made yet — waiting on your go-ahead.
