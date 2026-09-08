export type SisterPlatform = {
  id: "g100" | "all" | "wef" | "wicci" | "sheconomy"
  name: string
  shortName: string
  focus: string
  body: string
  href: string
  logo: string
  /** How the mark should sit in a card frame */
  fit: "contain" | "cover"
}

/**
 * Sister platforms in the G100 family — logos mirrored from each brand site.
 * Sources: g100.in · aall.in · wef.org.in · wicci.in · sheconomy.in
 */
export const SISTER_PLATFORMS: readonly SisterPlatform[] = [
  {
    id: "g100",
    name: "G100",
    shortName: "G100",
    focus: "Gender equality beyond borders",
    body: "A global platform for joint action across 100 wings and sectors.",
    href: "https://www.g100.in",
    logo: "/brand/platforms/g100.png",
    fit: "contain",
  },
  {
    id: "all",
    name: "ALL",
    shortName: "ALL",
    focus: "Sisters beyond borders",
    body: "All Ladies League — She-for-She support and Shakti Bandhan.",
    href: "https://aall.in",
    logo: "/brand/platforms/all.png",
    fit: "contain",
  },
  {
    id: "wef",
    name: "WEF",
    shortName: "WEF",
    focus: "Business beyond borders",
    body: "Women Economic Forum — visibility, voice, recognition, and networking.",
    href: "https://www.wef.org.in",
    logo: "/brand/platforms/wef.jpg",
    fit: "contain",
  },
  {
    id: "wicci",
    name: "WICCI",
    shortName: "WICCI",
    focus: "Policies beyond borders",
    body: "Women’s Indian Chamber of Commerce & Industry — advocacy and action.",
    href: "https://www.wicci.in",
    logo: "/brand/platforms/wicci.png",
    fit: "contain",
  },
  {
    id: "sheconomy",
    name: "SHEconomy",
    shortName: "SHE",
    focus: "Commerce beyond borders",
    body: "An e-commerce platform promoting women-owned businesses.",
    href: "https://www.sheconomy.in",
    logo: "/brand/platforms/sheconomy.png",
    fit: "contain",
  },
] as const
