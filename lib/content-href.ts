/** Client-safe URL helpers (no Node/fs). */

export const LOCAL_ROUTE_BY_SLUG: Record<string, string> = {
  "about-us": "/about",
  "about-founder": "/about#founder",
  "global-president": "/president",
  "presidents-advisory-council": "/president#advisory",
  "country-clubs": "/country-club",
  "country-club-lists": "/chapters?branch=view-chapters&role=country_chair",
  "denim-club-partners": "/denim-club",
  "the-denim-club-dialogues": "/denim-club/dialogues",
  meetings: "/meetings",
  "join-country-clubs": "/country-club/join",
  "contact-us": "/contact",
  sectors: "/wings",
  "g100-global-chairs-and-chapters": "/wings",
  home: "/",
}

/** Canonical public URL for a WP page slug (no `/content/` prefix). */
export function contentHref(slug: string): string {
  const clean = slug.replace(/\/+$/, "").split("/").filter(Boolean).pop() || ""
  if (!clean) return "/"
  if (LOCAL_ROUTE_BY_SLUG[clean]) return LOCAL_ROUTE_BY_SLUG[clean]
  if (clean === "awards") return "/awards"
  if (clean === "press") return "/press"
  return `/${clean}`
}
