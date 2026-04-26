# Fix Homepage SEO Issues

The audit flagged 3 errors and 2 warnings on the homepage (`/`). Most stem from the crawler reading the static `index.html` (where the `<title>` and the JS-rendered `<h1>` don't agree) and from a brand-only H1 with too few internal links.

## What gets fixed

| Audit finding | Root cause | Fix |
|---|---|---|
| Add an H1 to this page | H1 is just "C2C Rental" — too generic, and the audit may not see JS-rendered content | Make the H1 keyword-rich and ensure the same text exists in `index.html` as a fallback that React replaces |
| Use good headings on the page | Only 1 H2 (`Browse Our Fleet`); other sections use H2 inconsistently and there's no clear H1 → H2 → H3 flow | Standardize section headings (`Why Choose`, `Browse Fleet`, `Locations`, `Delivery`, `Cleaning`) as H2, ensure card titles stay H3 |
| Page has very few internal links | Hero only links to 3 city pages; rest of the page links are JS-rendered and the crawler likely under-counts | Add a small "Popular pages" / quick-links row in the hero or above the footer (Browse Cars, Surrey, Langley, Abbotsford, Locations, About, Blog, Contact, Daily vs Weekly guide, ICBC guide) |
| Review and improve the page title | Current title is 79 chars — over Google's ~60-char limit and gets truncated | Shorten to ~55 chars, lead with the primary keyword |
| Title doesn't match content | Static `<title>` says "Affordable Car Rental…", JS title says "No Hidden Fees", H1 says only "C2C Rental" — three different signals | Align all three: same wording in `index.html`, the React `useEffect` title, and the H1 eyebrow/heading |

## Specific changes

### 1. `index.html`
- Update `<title>` to: `Car Rental Surrey, Langley & Abbotsford BC | C2C Rental` (~55 chars).
- Update the matching `og:title` and `twitter:title` to the same string.
- Add a noscript fallback `<h1>` inside `<body>` so crawlers without JS see a heading that matches the title.

### 2. `src/pages/Index.tsx`
- Change the JS-injected `document.title` to the same shorter string used in `index.html`.
- Update the H1 from `C2C Rental` to `Car Rental in Surrey, Langley & Abbotsford BC` (keeps the "C2C Rental" brand as the eyebrow above it).
- Keep the visual treatment (same font sizes, accent underline) — only the text changes.

### 3. New "Quick links" strip on the homepage
- Add a small section (between `WhyChooseSection` and `CleaningBanner`) with 8–10 internal links: Browse Cars, Surrey, Langley, Abbotsford, All Locations, About, Contact, Blog, Daily vs Weekly guide, ICBC Insurance guide.
- Styled as compact text links in 2 rows so it doesn't disrupt the design.
- This directly resolves the "few internal links" finding.

### 4. Heading hierarchy audit
- Verify `WhyChooseSection`, `CleaningBanner`, `DeliveryBanner`, `LocationsSection`, and the fleet section all use `<h2>` for their section title and `<h3>` for child cards. The current `SectionHeader` already emits `<h2>`, so the only fix is making sure each banner/section follows the same pattern (quick check + small edits where needed).

## Out of scope
- No changes to other pages (Surrey, Langley, Abbotsford, blog) — the audit was for `/` only. If you want, I can run the same pass on those pages next.
- No changes to JSON-LD schemas (they're already comprehensive).

## Technical notes
- The new H1 text is the only on-page text change visible to users; everything else is meta/structural.
- The `noscript` H1 in `index.html` will be hidden visually (or simply replaced by React on hydration) so it doesn't double-render for normal users.
