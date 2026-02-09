

# SEO Overhaul: Improve Search Visibility and Remove Lovable Branding

## Problem
The site currently shows up in Google with a thin title ("C2C Rental") and description ("C2C car rental"), uses Lovable-branded OG images, and has no local SEO signals. This makes it nearly invisible for searches like "car rental near Surrey" or "car rental Vancouver."

## Changes

### 1. Rewrite `index.html` Meta Tags
- **Title**: "C2C Rental | Affordable Car Rental in Surrey, Langley & Abbotsford BC"
- **Description**: "Rent quality vehicles at affordable rates in Surrey, Langley, and Abbotsford, BC. Flexible pickup, transparent pricing, and 24/7 support. Book online today."
- **Remove** all Lovable references: `meta author`, `twitter:site @Lovable`, the TODO comment
- **Replace OG image** URL from lovable.dev to `/c2c-og-image.png` (use existing logo or a new branded image)
- Add `og:url`, `og:site_name`, and `og:locale` tags
- Add geo meta tags for the primary service area

### 2. Add Structured Data (JSON-LD)
Add a `LocalBusiness` + `AutoRental` schema script in `index.html` with:
- Business name, description, URL
- All 3 locations (Surrey, Langley, Abbotsford) as sub-locations
- Service area covering the Lower Mainland
- Price range indicator

This enables Google rich snippets (address, hours, rating stars in future).

### 3. Create `public/sitemap.xml`
A static sitemap listing all public customer-facing routes:
- `/` , `/search`, `/locations`, `/about`, `/contact`
- `/location/{surrey-id}`, `/location/{langley-id}`, `/location/{abbotsford-id}`

### 4. Update `public/robots.txt`
- Add `Sitemap: https://c4r.ca/sitemap.xml` directive
- Keep all Allow rules

### 5. Create OG Image
- Copy the existing `public/c2c-logo.png` as the fallback OG image, or create a simple branded card
- Update all `og:image` and `twitter:image` references to point to the project domain (`https://c4r.ca/c2c-og-image.png`)

### 6. Add Page-Level SEO for Key Pages
Update the `<title>` dynamically on key pages using `document.title` in useEffect:
- **Search page**: "Browse Cars | C2C Rental - Surrey, Langley, Abbotsford"
- **Locations page**: "Our Locations | C2C Rental"
- **Individual location pages**: "Car Rental in {City} | C2C Rental"

---

## Technical Details

### Files to modify:
| File | Change |
|------|--------|
| `index.html` | Rewrite all meta tags, add JSON-LD structured data, remove Lovable references |
| `public/robots.txt` | Add Sitemap directive |
| `public/sitemap.xml` | New file with all public routes |
| `src/pages/Search.tsx` | Add `document.title` for page-specific SEO |
| `src/pages/Locations.tsx` | Add `document.title` |
| `src/pages/LocationDetail.tsx` | Add dynamic `document.title` with city name |

### JSON-LD Schema (added to index.html):
```text
{
  "@context": "https://schema.org",
  "@type": "AutoRental",
  "name": "C2C Rental",
  "url": "https://c4r.ca",
  "description": "Affordable car rental...",
  "areaServed": ["Surrey", "Langley", "Abbotsford", "Vancouver"],
  "location": [
    { "@type": "Place", "name": "Surrey Centre", "address": "6734 King George Blvd..." },
    { "@type": "Place", "name": "Langley Centre", "address": "5933 200 St..." },
    { "@type": "Place", "name": "Abbotsford Centre", "address": "32835 South Fraser Way..." }
  ]
}
```

### What this achieves:
- Google shows a richer, branded snippet with proper title and description
- No Lovable branding anywhere in search results or social previews
- Local SEO signals help rank for "car rental near Surrey/Langley/Abbotsford"
- Structured data enables future rich results (ratings, pricing, locations)
- Sitemap ensures all pages are indexed

