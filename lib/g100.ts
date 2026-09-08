import { readFileSync } from "fs"
import { join } from "path"
import { cache } from "react"

import { getSupabaseCache, isSupabaseDataReady } from "@/lib/supabase/hydrate"

export type G100PageRef = {
  id: number
  title: string
  slug: string
  url: string
  text?: string
  text_len?: number
}

export type G100Role = {
  id: string
  title: string
  count: number
  samples?: G100PageRef[]
}

export type G100Category = {
  id: string
  title: string
  roles: G100Role[]
}

export type G100Stats = {
  published_pages: number
  wings: number
  country_chair: number
  state_chair: number
  city_chair: number
  country_advisory: number
  state_advisory: number
  city_advisory: number
  country_denim: number
  state_denim: number
  city_denim: number
  members: number
  meetings: number
  country_partner: number
  unclassified_other: number
}

export type G100Hierarchy = {
  source: {
    database: string
    site: string
    blogname: string
    fetched_via: string
    published_pages: number
  }
  main_menu: { label: string; url: string }[]
  stats: G100Stats
  about: {
    page: G100PageRef
    vision: string
    mission: string
    founder: G100PageRef
  }
  leadership: {
    globalPresident: G100PageRef
    presidentsAdvisory: G100PageRef
    globalChair: G100PageRef
  }
  wings: G100PageRef[]
  categories: G100Category[]
  countryClub: {
    page: G100PageRef
    notes: { id: string; title: string; note: string }[]
  }
  denimClub: {
    page: G100PageRef
    dialogues: G100PageRef
    partners: { id: string; title: string; count: number }[]
  }
  meetings: {
    page: G100PageRef
    count: number
    note: string
  }
}

function pageRef(page: {
  id: number
  title: string
  slug: string
  url: string
  text?: string
  text_len?: number
}): G100PageRef {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    url: page.url,
    text: page.text,
    text_len: page.text_len,
  }
}

function parseHierarchy(raw: any): G100Hierarchy {
  const about = raw.flow.children[0]
  const president = raw.flow.children[1]
  const chair = raw.flow.children[2]
  const wingsNode = chair.children[0]
  const countryClub = raw.flow.children[3]
  const denimClub = raw.flow.children[4]
  const dialogues = raw.flow.children[5]
  const meetings = raw.flow.children[6]

  return {
    source: raw.source,
    main_menu: raw.main_menu,
    stats: raw.stats,
    about: {
      page: pageRef(about.page),
      vision: about.children[0].excerpt,
      mission: about.children[1].excerpt,
      founder: pageRef(about.children[2].page),
    },
    leadership: {
      globalPresident: pageRef(president.page),
      presidentsAdvisory: pageRef(president.children[1].page),
      globalChair: pageRef(chair.page),
    },
    wings: (wingsNode.items as G100PageRef[]).map((w) => pageRef(w)),
    categories: (wingsNode.categories as G100Category[]).map((category) => ({
      id: category.id,
      title: category.title,
      roles: category.roles.map((role) => ({
        id: role.id,
        title: role.title,
        count: role.count,
        samples: role.samples?.map((s) => pageRef(s)),
      })),
    })),
    countryClub: {
      page: pageRef(countryClub.page),
      notes: (countryClub.children as { id: string; title: string; note?: string }[]).map(
        (c) => ({
          id: c.id,
          title: c.title,
          note: c.note ?? "",
        })
      ),
    },
    denimClub: {
      page: pageRef(denimClub.page),
      dialogues: pageRef(dialogues.page),
      partners: (
        denimClub.partners as { id: string; title: string; count: number }[]
      ).map((p) => ({
        id: p.id,
        title: p.title,
        count: p.count,
      })),
    },
    meetings: {
      page: pageRef(meetings.page),
      count: meetings.count ?? 0,
      note: meetings.note ?? "No sub-page",
    },
  }
}

function readLocalHierarchy(): unknown {
  return JSON.parse(
    readFileSync(join(process.cwd(), "data", "g100-hierarchy.json"), "utf8")
  )
}

export const getG100Hierarchy = cache((): G100Hierarchy => {
  let raw: unknown | null = null
  if (isSupabaseDataReady()) {
    raw = getSupabaseCache().hierarchy
  }
  if (!raw) raw = readLocalHierarchy()
  return parseHierarchy(raw)
})

export type RoleKey = string

/** Legacy helper — prefer lib/wordpress getPagesByRole when possible. */
export function getPagesByRole(role: RoleKey): G100PageRef[] {
  try {
    const pagesByRoleJson = JSON.parse(
      readFileSync(
        join(process.cwd(), "data", "g100-pages-by-role.json"),
        "utf8"
      )
    ) as Record<string, G100PageRef[]>
    return pagesByRoleJson[role] ?? []
  } catch {
    return []
  }
}

export const g100Nav = [
  { href: "/", label: "Overview" },
  { href: "/about", label: "About us" },
  { href: "/president", label: "Global president" },
  { href: "/wings", label: "Global Chair" },
  { href: "/chapters", label: "Chapters" },
  { href: "/country-club", label: "Country Club" },
  { href: "/denim-club", label: "Denim Club" },
  { href: "/meetings", label: "Meetings" },
] as const
