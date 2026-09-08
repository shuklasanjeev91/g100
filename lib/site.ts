export const SITE = {
  name: "G100",
  tagline: "Group of 100 Global Women Leaders",
  url: "https://www.g100.in",
  vision:
    "To create an equal, progressive & inclusive environment for women worldwide.",
  mission:
    "To provide the thought leadership on what needs to be done for inclusivity, safety, economic & social empowerment of women globally, addressing gender gaps and achieving gender parity within this decade.",
  whyHeadline: "Because we are not waiting a hundred years for gender parity.",
  whyBody:
    "With collaboration and co-creation, we join forces globally and at the grassroots—defining, designing, and determining a new future with equity, equal opportunity, inclusion, and economic empowerment of women, supported by men champions.",
  denimWhy:
    "Why Denim? It is symbolic of our common ground—the solid dialogue between genders and the strength of solidarity we aspire for.",
  /** Official brand mark mirrored from https://www.g100.in */
  logo: "/brand/g100-logo.png",
  logoRemote:
    "https://www.g100.in/wp-content/uploads/2023/11/g100-new-logo-1.png",
  icon: "/brand/g100-icon-192.jpg",
  iconRemote:
    "https://www.g100.in/wp-content/uploads/2021/08/cropped-G100-og-tage-image-192x192.jpg",
  heroImage:
    "https://www.g100.in/wp-content/uploads/2026/01/front-Group.jpg",
  denimImage:
    "https://www.g100.in/wp-content/uploads/2025/08/Denim-Clud-G100.jpeg",
} as const

export type NavItem = {
  label: string
  href: string
  children?: { label: string; href: string; description?: string }[]
}

/**
 * Primary nav mirrors g100.in:
 * About Us · Global President · Global Chairs · Country Club · Denim Club · Meetings
 */
export const primaryNav: NavItem[] = [
  {
    label: "About Us",
    href: "/about",
    children: [
      {
        label: "Vision & Mission",
        href: "/about#vision",
        description: "Equal, progressive & inclusive world",
      },
      {
        label: "Founder",
        href: "/about#founder",
        description: "Dr. Harbeen Arora Rai",
      },
      {
        label: "Contact Us",
        href: "/contact",
        description: "Reach the G100 Secretariat",
      },
    ],
  },
  {
    label: "Global President",
    href: "/president",
    children: [
      {
        label: "Global President",
        href: "/president",
        description: "Elected by rotation among Global Chairs",
      },
      {
        label: "Presidents Advisory",
        href: "/president#advisory",
        description: "Council supporting the Global President",
      },
    ],
  },
  {
    label: "Global Chairs",
    href: "/wings",
    children: [
      {
        label: "100 Wings / Sectors",
        href: "/wings",
        description: "Global Chairs leading every sector",
      },
      {
        label: "View Chapters",
        href: "/chapters?branch=view-chapters",
        description: "Country · State · City chairs",
      },
      {
        label: "Advisory Councils",
        href: "/chapters?branch=advisory-council",
        description: "Country · State · City advisory",
      },
    ],
  },
  {
    label: "Country Club",
    href: "/country-club",
    children: [
      {
        label: "Country Clubs",
        href: "/country-club",
        description: "National clubs in 100 countries",
      },
      {
        label: "Join Country Club",
        href: "/country-club/join",
        description: "Apply to join a national club",
      },
    ],
  },
  {
    label: "Denim Club",
    href: "/denim-club",
    children: [
      {
        label: "Denim Partners",
        href: "/denim-club",
        description: "He-for-She champions worldwide",
      },
      {
        label: "Denim Dialogues",
        href: "/denim-club/dialogues",
        description: "Conversations for balanced leadership",
      },
    ],
  },
  { label: "Meetings", href: "/meetings" },
]

/** Bottom tab bar — native mobile app chrome (< lg) */
export const mobileTabNav = [
  { label: "Home", href: "/" },
  { label: "Chairs", href: "/wings" },
  { label: "Chapters", href: "/chapters" },
  { label: "Meetings", href: "/meetings" },
  { label: "Join", href: "/country-club/join" },
] as const

export const exploreNav = [
  { label: "Chapters & roles", href: "/chapters" },
  { label: "Wings / sectors", href: "/wings" },
  { label: "Media library", href: "/media" },
  { label: "Join Country Club", href: "/country-club/join" },
  { label: "Contact us", href: "/contact" },
  { label: "Search", href: "/search" },
] as const

export const footerColumns = [
  {
    title: "Explore",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Global President", href: "/president" },
      { label: "Global Chairs", href: "/wings" },
      { label: "Chapters", href: "/chapters" },
    ],
  },
  {
    title: "Clubs",
    links: [
      { label: "Country Club", href: "/country-club" },
      { label: "Join Country Club", href: "/country-club/join" },
      { label: "Denim Club", href: "/denim-club" },
      { label: "Denim Dialogues", href: "/denim-club/dialogues" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Meetings", href: "/meetings" },
      { label: "Press", href: "/press" },
      { label: "Media library", href: "/media" },
      { label: "Useful Links", href: "/useful-links" },
    ],
  },
  {
    title: "Engage",
    links: [
      { label: "Contact Us", href: "/contact" },
      { label: "Code of Conduct", href: "/code-of-conduct" },
      { label: "Zero Tolerance", href: "/zero-tolerance-policy" },
      { label: "Awards", href: "/awards" },
    ],
  },
] as const
