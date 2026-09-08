/** Organization flow — matches the attached G100 hierarchy chart */
export const FLOW_STEPS = [
  {
    id: "about",
    label: "About us",
    href: "/about",
    note: "Vision · Mission · Founder",
  },
  {
    id: "president",
    label: "Global president",
    href: "/president",
    note: "Elected by rotation · Advisory",
  },
  {
    id: "chair",
    label: "Global Chair",
    href: "/wings",
    note: "100 Wings / Sectors",
  },
  {
    id: "chapters",
    label: "Chapters",
    href: "/chapters",
    note: "Chair · Advisory · Denim · Members",
  },
  {
    id: "country-club",
    label: "Country Club",
    href: "/country-club",
    note: "100 countries · Join",
  },
  {
    id: "denim-club",
    label: "Denim Club",
    href: "/denim-club",
    note: "Partners · Dialogues",
  },
  {
    id: "meetings",
    label: "Meetings",
    href: "/meetings",
    note: "Gatherings archive",
  },
] as const

export type FlowStepId = (typeof FLOW_STEPS)[number]["id"]

/** Chapter matrix from the flowchart (View Chapters / Advisory / Denim Partner) */
export const CHAPTER_BRANCHES = [
  {
    id: "view-chapters",
    title: "View Chapters",
    roles: [
      { id: "country_chair", title: "Country Chair" },
      { id: "state_chair", title: "State Chair" },
      { id: "city_chair", title: "City Chair" },
    ],
  },
  {
    id: "advisory-council",
    title: "Advisory Council",
    roles: [
      { id: "country_advisory", title: "Country Advisory" },
      { id: "state_advisory", title: "State Advisory" },
      { id: "city_advisory", title: "City Advisory" },
    ],
  },
  {
    id: "denim-partner",
    title: "Denim Partner",
    roles: [
      { id: "country_denim", title: "Country Denim" },
      { id: "state_denim", title: "State Denim" },
      { id: "city_denim", title: "City Denim" },
    ],
  },
  {
    id: "members-col",
    title: "Members",
    roles: [{ id: "members", title: "Members" }],
  },
] as const

export type ChapterRoleId =
  (typeof CHAPTER_BRANCHES)[number]["roles"][number]["id"]

const CHAPTER_ROLE_SET = new Set<string>(
  CHAPTER_BRANCHES.flatMap((b) => b.roles.map((r) => r.id))
)

export function isChapterRole(role: string): role is ChapterRoleId {
  return CHAPTER_ROLE_SET.has(role)
}

export function getChapterBranchForRole(role: string) {
  return (
    CHAPTER_BRANCHES.find((branch) =>
      branch.roles.some((r) => r.id === role)
    ) ?? null
  )
}

export function getChapterRoleLabel(role: string): string | null {
  for (const branch of CHAPTER_BRANCHES) {
    const match = branch.roles.find((r) => r.id === role)
    if (match) return match.title
  }
  return null
}

/** Map a WP page role onto the top-level org flow stepper. */
export function flowStepForRole(role: string): FlowStepId | null {
  if (role === "wing" || role === "global_chair") return "chair"
  if (isChapterRole(role)) return "chapters"
  if (role === "meetings") return "meetings"
  if (role === "country_partner" || role === "country_club") return "country-club"
  if (role.includes("denim")) return "denim-club"
  if (role === "founder" || role === "about_us") return "about"
  if (role.includes("president")) return "president"
  return null
}

export function getFlowNeighbors(stepId: FlowStepId) {
  const index = FLOW_STEPS.findIndex((s) => s.id === stepId)
  if (index < 0) return { prev: null, next: null }
  return {
    prev: index > 0 ? FLOW_STEPS[index - 1] : null,
    next: index < FLOW_STEPS.length - 1 ? FLOW_STEPS[index + 1] : null,
  }
}

/** Preferred sibling roles when traversing the chapter matrix for one country. */
export const COUNTRY_FLOW_ROLES: ChapterRoleId[] = [
  "country_chair",
  "country_advisory",
  "country_denim",
  "members",
]
