// Google Business Profile short links per location.
// Used for "View on Google" CTAs, "Get Directions" replacements,
// and LocalBusiness JSON-LD `sameAs` for SEO entity linking.

export const GBP_LINKS = {
  surrey: "https://share.google/45blN8AMRUu16uMHx",
  langley: "https://share.google/OBD9OEXNaVT9pnCpV",
  abbotsford: "https://share.google/8G48SMcshTV2IFg98",
} as const;

// Keyed by the location `name` value stored in the DB.
export const GBP_LINKS_BY_LOCATION_NAME: Record<string, string> = {
  "Surrey Newton": GBP_LINKS.surrey,
  "Langley Centre": GBP_LINKS.langley,
  "Abbotsford Centre": GBP_LINKS.abbotsford,
};
