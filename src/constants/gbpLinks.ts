// Google Business Profile short links per location.
// Used for "View on Google" CTAs, "Get Directions" replacements,
// and LocalBusiness JSON-LD `sameAs` for SEO entity linking.

export const GBP_LINKS = {
  surrey: "https://share.google/45blN8AMRUu16uMHx",
  langley: "https://share.google/OBD9OEXNaVT9pnCpV",
  abbotsford: "https://share.google/8G48SMcshTV2IFg98",
  // No Google Business Profile yet for the 200th Street branch — point at the
  // exact map coordinates so directions still resolve correctly.
  langley200: "https://www.google.com/maps/search/?api=1&query=49.11014733,-122.66884669",
} as const;

// Keyed by the location `name` value stored in the DB.
export const GBP_LINKS_BY_LOCATION_NAME: Record<string, string> = {
  "Surrey Newton": GBP_LINKS.surrey,
  "Langley Centre": GBP_LINKS.langley,
  "Abbotsford Centre": GBP_LINKS.abbotsford,
  "Langley 200th Street": GBP_LINKS.langley200,
};
