import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  /** Path relative to site root, e.g. "/surrey". */
  path: string;
  type?: "website" | "article";
  image?: string;
  /** Extra JSON-LD blocks to inject on this page. */
  jsonLd?: object | object[];
  noindex?: boolean;
}

const SITE = "https://c2crental.ca";
const DEFAULT_IMAGE = "https://c2crental.ca/c2c-og-image.png";

/**
 * Per-route SEO tags. Renders through react-helmet-async so titles,
 * descriptions, canonicals, og:*, and JSON-LD differ per page for
 * Googlebot. Static crawlers (Bing, Facebook, LinkedIn) still see
 * index.html — a follow-up prerender step is required for those.
 */
export function SEO({
  title,
  description,
  path,
  type = "website",
  image = DEFAULT_IMAGE,
  jsonLd,
  noindex,
}: SEOProps) {
  const url = `${SITE}${path.startsWith("/") ? path : `/${path}`}`;
  const blocks = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  // Signal prerender / Puppeteer that Helmet has flushed head tags.
  // Delay so react-helmet-async's async head mutation completes first.
  useEffect(() => {
    const t = window.setTimeout(() => {
      document.dispatchEvent(new Event("seo-ready"));
    }, 800);
    return () => window.clearTimeout(t);
  }, [title, description, url]);



  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={image} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {blocks.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
}
