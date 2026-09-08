import { readFileSync } from "fs"
import { join } from "path"
import { cache } from "react"

import { LOCAL_ROUTE_BY_SLUG, contentHref } from "@/lib/content-href"
import { normalizeMediaUrl, isUsableImageUrl } from "@/lib/media-url"
import {
  CHAPTER_BRANCHES,
  COUNTRY_FLOW_ROLES,
  flowStepForRole,
  getChapterBranchForRole,
  getChapterRoleLabel,
  getFlowNeighbors,
  isChapterRole,
} from "@/lib/flow"
import {
  paragraphCaseHtmlParagraphs,
  titleCaseHtmlHeadings,
  toParagraphCase,
} from "@/lib/text-case"
import { getSupabaseCache, isSupabaseDataReady } from "@/lib/supabase/hydrate"

export type WpPage = {
  id: number
  title: string
  slug: string
  url: string
  excerpt: string
  content_html: string
  parent: number
  menu_order?: number
  date: string
  modified: string
  role: string
  featured_image: string | null
  images: string[]
  thumbnail_id?: number | null
}

export type WpMedia = {
  id: number
  title: string
  slug: string
  mime: string
  parent: number
  url: string
  file: string
  date: string
}

export type WpManifest = {
  site: string
  database: string
  page_count: number
  media_count: number
  role_counts: Record<string, number>
  wings_count: number
  hubs: string[]
}

const DATA_DIR = join(process.cwd(), "data", "wordpress")

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(DATA_DIR, name), "utf8")) as T
}

/**
 * Strip Unlimited Elements / Elementor "Creative Buttons" leftovers.
 * These plugins leave `skip render: ucaddon_creative_buttons` in excerpts
 * and heavy widget chrome in HTML when the front-end script does not run.
 */
export function cleanWpPlainText(value: string): string {
  if (!value) return ""
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/skip\s*render:\s*[\w.-]+/gi, " ")
    .replace(/\bskip\s*render:?\s*/gi, " ")
    .replace(/\bskip\s*[.…]+/gi, " ")
    .replace(/\bucaddon_[\w.-]+\b/gi, " ")
    .replace(/\buc_creative_buttons\b/gi, " ")
    .replace(/\/\*\s*widget:[\s\S]*?\*\//gi, " ")
    .replace(/\b(?:start|end)\s+Creative Button Hovers\b/gi, " ")
    .replace(/\s*Read more\s*\.?$/i, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .replace(/\s*[.…]\s*$/g, "")
    .trim()
}

function stripUcAddonWidgets(html: string): string {
  if (!html) return ""
  let out = html

  // Comment-delimited UC widget payloads
  out = out.replace(
    /<!--\s*start Creative Button Hovers\s*-->[\s\S]*?<!--\s*end Creative Button Hovers\s*-->/gi,
    ""
  )
  out = out.replace(/<!--\s*start Creative Button Hovers\s*-->[\s\S]*$/gi, "")

  // Nested Elementor UC widgets — peel from the inside out
  for (let i = 0; i < 10; i++) {
    const next = out.replace(
      /<div\b[^>]*(?:elementor-widget-ucaddon_[\w-]+|class="[^"]*uc_creative_buttons[^"]*"|data-widget_type="ucaddon_[^"]+")[^>]*>[\s\S]*?<\/div>/gi,
      ""
    )
    if (next === out) break
    out = next
  }

  out = out.replace(/<link\b[^>]*(?:uc_creative_buttons|ucaddon_)[^>]*>/gi, "")
  out = out.replace(/skip\s*render:\s*[\w.-]+/gi, "")
  out = out.replace(/\bucaddon_[\w.-]+\b/gi, "")
  return out
}

function sanitizeWpPage(page: WpPage): WpPage {
  return {
    ...page,
    excerpt: cleanWpPlainText(page.excerpt || ""),
    content_html: stripUcAddonWidgets(page.content_html || ""),
  }
}

export const getManifest = cache((): WpManifest => {
  if (isSupabaseDataReady()) {
    const remote = getSupabaseCache().manifest
    if (remote) return remote
  }
  return readJson("manifest.json")
})

export const getHubs = cache((): Record<string, WpPage> => {
  let hubs: Record<string, WpPage> = {}
  if (isSupabaseDataReady()) {
    const remote = getSupabaseCache().hubs
    if (Object.keys(remote).length) hubs = remote
  }
  if (!Object.keys(hubs).length) hubs = readJson("hubs.json")

  const cleaned: Record<string, WpPage> = {}
  for (const [key, page] of Object.entries(hubs)) {
    cleaned[key] = sanitizeWpPage(page)
  }
  return cleaned
})

export const getWings = cache((): WpPage[] => {
  let wings: WpPage[] = []
  if (isSupabaseDataReady()) {
    const remote = getSupabaseCache().wings
    if (remote.length) wings = remote
  }
  if (!wings.length) wings = readJson("wings.json")
  return wings.map(sanitizeWpPage)
})

export function pickCardImage(
  featured: string | null | undefined,
  images: string[] | undefined
): string | null {
  const candidates = [featured, ...(images ?? [])].filter(Boolean) as string[]
  for (const src of candidates) {
    if (!isUsableImageUrl(src)) continue
    const normalized = normalizeMediaUrl(src)
    if (normalized.toLowerCase().includes("logo")) continue
    return normalized
  }
  return isUsableImageUrl(featured) ? normalizeMediaUrl(featured) : null
}

/** Best card image for a page (featured, then gallery). */
export function resolvePageCardImage(page: {
  featured_image?: string | null
  images?: string[] | null
}): string | null {
  return pickCardImage(page.featured_image, page.images ?? undefined)
}

export const getPagesByRole = cache((): Record<
  string,
  Omit<
    WpPage,
    "content_html" | "images" | "excerpt" | "parent" | "date" | "modified"
  >[]
> => {
  type RoleRow = Omit<
    WpPage,
    "content_html" | "images" | "excerpt" | "parent" | "date" | "modified"
  >

  const { pages, byId } = getAllPagesMap()

  // Prefer deriving roles from the live page set (Supabase or local pages.json)
  if (pages.length) {
    const byRole: Record<string, RoleRow[]> = {}
    for (const page of pages) {
      const role = page.role || "other"
      byRole[role] ||= []
      byRole[role].push({
        id: page.id,
        title: page.title,
        slug: page.slug,
        url: page.url,
        featured_image: pickCardImage(page.featured_image, page.images),
        role: page.role,
        menu_order: page.menu_order,
        thumbnail_id: page.thumbnail_id,
      })
    }
    return byRole
  }

  const byRole = readJson<Record<string, RoleRow[]>>("pages-by-role.json")
  const enriched: typeof byRole = {}
  for (const [role, rows] of Object.entries(byRole)) {
    enriched[role] = rows.map((row) => {
      const full = byId.get(row.id)
      return {
        ...row,
        featured_image: pickCardImage(
          row.featured_image ?? full?.featured_image,
          full?.images
        ),
      }
    })
  }
  return enriched
})

export const getPagesIndex = cache(() => {
  if (isSupabaseDataReady()) {
    const pages = getSupabaseCache().pages
    if (pages.length) {
      return pages.map((page) => ({
        id: page.id,
        title: page.title,
        slug: page.slug,
        url: page.url,
        excerpt: cleanWpPlainText(page.excerpt),
        role: page.role,
        featured_image: pickCardImage(page.featured_image, page.images),
        date: page.date,
        modified: page.modified,
        parent: page.parent,
      }))
    }
  }
  return readJson<
    {
      id: number
      title: string
      slug: string
      url: string
      excerpt: string
      role: string
      featured_image: string | null
      date: string
      modified: string
      parent: number
    }[]
  >("pages-index.json").map((page) => ({
    ...page,
    excerpt: cleanWpPlainText(page.excerpt),
  }))
})

const getAllPagesMap = cache(() => {
  let pages: WpPage[] = []
  if (isSupabaseDataReady()) {
    const remote = getSupabaseCache().pages
    if (remote.length) pages = remote
  }
  if (!pages.length) pages = readJson<WpPage[]>("pages.json")

  pages = pages.map(sanitizeWpPage)
  const bySlug = new Map<string, WpPage>()
  const byId = new Map<number, WpPage>()
  for (const page of pages) {
    bySlug.set(page.slug, page)
    byId.set(page.id, page)
  }
  return { bySlug, byId, pages }
})

export function getPageBySlug(slug: string): WpPage | undefined {
  return getAllPagesMap().bySlug.get(slug)
}

export function getPageById(id: number): WpPage | undefined {
  return getAllPagesMap().byId.get(id)
}

export function getPagesForRole(role: string): WpPage[] {
  return getAllPagesMap().pages.filter((page) => page.role === role)
}

export function getHub(slug: string): WpPage | undefined {
  return getHubs()[slug]
}

export type RelatedFlowCard = {
  id: number
  title: string
  slug: string
  featured_image: string | null
  role: string
  href: string
}

export type RelatedFlowGroup = {
  id: string
  title: string
  description?: string
  browseHref?: string
  items: RelatedFlowCard[]
}

export type RelatedFlowContent = {
  wing: RelatedFlowCard | null
  branchTitle: string | null
  roleLabel: string | null
  groups: RelatedFlowGroup[]
  flowPrev: { label: string; href: string } | null
  flowNext: { label: string; href: string } | null
}

function wingMatchKey(slug: string) {
  return slug.replace(/-wing$/i, "").toLowerCase()
}

function matchesWing(slug: string, wingKey: string) {
  const key = wingMatchKey(wingKey)
  if (!key) return false
  const lower = slug.toLowerCase()
  return lower.includes(key)
}

/** Public helpers for wing-scoped directories. */
export function getWingMatchKey(slug: string) {
  return wingMatchKey(slug)
}

export function pageMatchesWing(pageSlug: string, wingSlugOrKey: string) {
  return matchesWing(pageSlug, wingSlugOrKey)
}

export function getWingByParam(wingParam: string | null | undefined): WpPage | undefined {
  if (!wingParam?.trim()) return undefined
  const raw = wingParam.trim().toLowerCase()
  const bySlug = getPageBySlug(raw)
  if (bySlug?.role === "wing") return bySlug
  const withWing = raw.endsWith("-wing") ? raw : `${raw}-wing`
  const byWingSlug = getPageBySlug(withWing)
  if (byWingSlug?.role === "wing") return byWingSlug
  return getWings().find(
    (wing) =>
      wing.slug === raw ||
      wing.slug === withWing ||
      wingMatchKey(wing.slug) === wingMatchKey(raw)
  )
}

export function filterPagesByWing<T extends { slug: string }>(
  pages: readonly T[],
  wingSlugOrKey: string | null | undefined
): T[] {
  if (!wingSlugOrKey) return [...pages]
  const key = wingMatchKey(wingSlugOrKey)
  if (!key) return [...pages]
  return pages.filter((page) => matchesWing(page.slug, key))
}

export function buildChaptersHref(options: {
  branch: string
  role?: string
  wing?: string | null
}) {
  const params = new URLSearchParams()
  params.set("branch", options.branch)
  if (options.role) params.set("role", options.role)
  if (options.wing) params.set("wing", options.wing)
  return `/chapters?${params.toString()}`
}

function pageToRelatedCard(page: {
  id: number
  title: string
  slug: string
  role?: string
  featured_image?: string | null
}): RelatedFlowCard {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    featured_image: page.featured_image ?? null,
    role: page.role ?? "",
    href: contentHref(page.slug),
  }
}

function detectWingForPage(page: WpPage): WpPage | null {
  const wings = getWings()
  const slug = page.slug.toLowerCase()
  const ranked = [...wings].sort(
    (a, b) => wingMatchKey(b.slug).length - wingMatchKey(a.slug).length
  )

  for (const wing of ranked) {
    const key = wingMatchKey(wing.slug)
    if (key.length < 8) continue
    if (slug === wing.slug || slug.includes(key)) return wing
  }

  const titleLower = page.title.toLowerCase()
  for (const wing of ranked) {
    const label = wing.title.replace(/\s+Wing$/i, "").toLowerCase()
    if (label.length > 6 && titleLower.includes(label)) return wing
  }

  return null
}

const COUNTRY_ROLE_MARKERS = [
  "country-advisory-councils",
  "country-advisory-council",
  "country-denim-partner",
  "country-members",
  "country-member",
  "country-chairs",
  "country-chair",
  "state-advisory-councils",
  "state-advisory-council",
  "state-denim-partner",
  "state-chairs",
  "state-chair",
  "city-advisory-councils",
  "city-advisory-council",
  "city-denim-partner",
  "city-chairs",
  "city-chair",
] as const

function extractCountryToken(slug: string, wingKey: string): string | null {
  let rest = slug.toLowerCase()
  const key = wingMatchKey(wingKey)
  rest = rest
    .replace(new RegExp(`-?${key}(?:-wing)?$`), "")
    .replace(/-wing$/, "")
    .replace(/-+$/, "")

  for (const marker of COUNTRY_ROLE_MARKERS) {
    const idx = rest.indexOf(marker)
    if (idx <= 0) continue
    const country = rest.slice(0, idx).replace(/-+$/, "")
    if (country && country.length >= 2) return country
  }

  const head = rest.split("-").filter(Boolean)[0]
  return head && head.length >= 2 ? head : null
}

function matchesCountry(slug: string, country: string) {
  return slug.toLowerCase().startsWith(`${country.toLowerCase()}-`)
}

/**
 * Related content for a profile/content page, driven by the G100 org flow
 * (wing → chapter matrix → next flow step).
 */
export function getRelatedFlowContent(page: WpPage): RelatedFlowContent {
  const wing = page.role === "wing" ? page : detectWingForPage(page)
  const wingKey = wing ? wingMatchKey(wing.slug) : null
  const country =
    wingKey && isChapterRole(page.role)
      ? extractCountryToken(page.slug, wingKey)
      : null

  const branch = getChapterBranchForRole(page.role)
  const roleLabel = getChapterRoleLabel(page.role)
  const stepId = flowStepForRole(page.role)
  const neighbors = stepId ? getFlowNeighbors(stepId) : { prev: null, next: null }

  const groups: RelatedFlowGroup[] = []
  const usedIds = new Set<number>([page.id])

  const index = getPagesIndex()
  const { byId } = getAllPagesMap()

  const enrichCard = (row: {
    id: number
    title: string
    slug: string
    role?: string
    featured_image?: string | null
  }): RelatedFlowCard => {
    const full = byId.get(row.id)
    return pageToRelatedCard({
      ...row,
      role: row.role ?? full?.role,
      featured_image: pickCardImage(
        row.featured_image ?? full?.featured_image,
        full?.images
      ),
    })
  }

  const take = (
    candidates: typeof index,
    limit: number
  ): RelatedFlowCard[] => {
    const out: RelatedFlowCard[] = []
    for (const row of candidates) {
      if (usedIds.has(row.id)) continue
      usedIds.add(row.id)
      out.push(enrichCard(row))
      if (out.length >= limit) break
    }
    return out
  }

  if (wing && wing.id !== page.id) {
    usedIds.add(wing.id)
  }

  if (wingKey && country && isChapterRole(page.role)) {
    const sameCountry: RelatedFlowCard[] = []

    // Wing-level country chairs hub (shared across countries)
    if (page.role !== "country_chair") {
      const chairHub = index.find(
        (row) =>
          row.role === "country_chair" &&
          matchesWing(row.slug, wingKey) &&
          !/^[a-z]{2,}-country-chair/i.test(row.slug)
      )
      if (chairHub && !usedIds.has(chairHub.id)) {
        usedIds.add(chairHub.id)
        sameCountry.push(enrichCard(chairHub))
      }
    }

    for (const roleId of COUNTRY_FLOW_ROLES) {
      if (roleId === page.role) continue
      const hit = index.find(
        (row) =>
          row.role === roleId &&
          matchesWing(row.slug, wingKey) &&
          matchesCountry(row.slug, country)
      )
      if (hit && !usedIds.has(hit.id)) {
        usedIds.add(hit.id)
        sameCountry.push(enrichCard(hit))
      }
    }
    if (sameCountry.length) {
      const label = country.replace(/-/g, " ")
      groups.push({
        id: "same-country-flow",
        title: `${label} · chapter flow`,
        description: "Chair, advisory, Denim, and members for this wing.",
        browseHref: `/chapters?branch=${branch?.id ?? "advisory-council"}`,
        items: sameCountry,
      })
    }
  }

  if (wingKey && isChapterRole(page.role)) {
    const siblings = take(
      index.filter(
        (row) =>
          row.role === page.role &&
          matchesWing(row.slug, wingKey) &&
          row.id !== page.id
      ),
      6
    )
    if (siblings.length) {
      groups.push({
        id: "same-role-wing",
        title: `${roleLabel ?? "Peers"} · same wing`,
        description: "Other countries in this role for the wing.",
        browseHref: branch
          ? buildChaptersHref({
              branch: branch.id,
              role: page.role,
              wing: wing?.slug,
            })
          : "/chapters",
        items: siblings,
      })
    }
  }

  if (wing && page.role === "wing") {
    for (const branchItem of CHAPTER_BRANCHES) {
      const roleId = branchItem.roles[0]?.id
      if (!roleId) continue
      const items = take(
        index.filter(
          (row) =>
            row.role === roleId &&
            matchesWing(row.slug, wingMatchKey(wing.slug))
        ),
        4
      )
      if (!items.length) continue
      groups.push({
        id: `wing-${branchItem.id}`,
        title: branchItem.title,
        description: branchItem.roles.map((r) => r.title).join(" · "),
        browseHref: buildChaptersHref({
          branch: branchItem.id,
          role: roleId,
          wing: wing.slug,
        }),
        items,
      })
    }
  }

  if (wingKey && !groups.length) {
    const nearby = take(
      index.filter(
        (row) =>
          row.id !== page.id &&
          (row.role === "wing" || isChapterRole(row.role)) &&
          matchesWing(row.slug, wingKey)
      ),
      8
    )
    if (nearby.length) {
      groups.push({
        id: "wing-network",
        title: "In this wing",
        browseHref: wing ? contentHref(wing.slug) : "/wings",
        items: nearby,
      })
    }
  }

  return {
    wing:
      wing && wing.id !== page.id
        ? enrichCard({ ...wing, role: wing.role })
        : null,
    branchTitle: branch?.title ?? null,
    roleLabel,
    groups,
    flowPrev: neighbors.prev
      ? { label: neighbors.prev.label, href: neighbors.prev.href }
      : null,
    flowNext: neighbors.next
      ? { label: neighbors.next.label, href: neighbors.next.href }
      : null,
  }
}

export { normalizeMediaUrl } from "@/lib/media-url"

export type GlobalChairProfile = {
  id: number
  name: string
  wing: string
  slug: string
  image: string | null
  href: string
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
}

/** Derive Global Chair portrait cards from wing pages. */
export const getGlobalChairProfiles = cache((): GlobalChairProfile[] => {
  const profiles: GlobalChairProfile[] = []

  for (const wing of getWings()) {
    const html = wing.content_html || ""
    const images = (wing.images ?? []).filter(
      (src) =>
        Boolean(src) &&
        !src.includes("uc_creative") &&
        !src.endsWith(".css") &&
        !src.includes("/thumbs/")
    )

    const names: string[] = []
    const headingRe = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi
    let match: RegExpExecArray | null
    while ((match = headingRe.exec(html))) {
      const raw = decodeEntities(
        match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      )
      if (!raw || raw.length > 90) continue
      const lower = raw.toLowerCase()
      if (lower.includes("wing")) continue
      if (wing.title.toLowerCase().includes(lower)) continue
      names.push(raw)
    }

    const name = names[0]
    if (!name) continue

    profiles.push({
      id: wing.id,
      name,
      wing: wing.title.replace(/\s+Wing$/i, "").trim(),
      slug: wing.slug,
      image: normalizeMediaUrl(images[0] ?? wing.featured_image ?? null) || null,
      href: contentHref(wing.slug),
    })
  }

  return profiles
})

export type GlobalPresidentTerm = {
  year: string
  name: string
  slug: string
  href: string
  image: string | null
  wing?: string | null
  excerpt?: string | null
}

const PRESIDENT_YEAR_HEADING_RE =
  /<h([1-6])\b[^>]*>\s*(20\d{2})\s*<\/h\1>/gi

const KNOWN_PRESIDENT_TERMS: { year: string; slug: string }[] = [
  { year: "2026", slug: "datin-hartini-binti-osman" },
  { year: "2025", slug: "bodil-valero" },
]

function pickPresidentImage(
  candidates: Array<string | null | undefined>
): string | null {
  const usable: string[] = []
  for (const src of candidates) {
    if (!isUsableImageUrl(src)) continue
    const normalized = normalizeMediaUrl(src)
    if (normalized.toLowerCase().includes("logo")) continue
    usable.push(normalized)
  }
  if (!usable.length) return null

  // Prefer fuller originals over thumbnail crops (-300x, -768x)
  const scored = usable.map((src) => {
    const lower = src.toLowerCase()
    let score = 0
    if (/-scaled\./i.test(lower)) score += 4
    if (/-\d{3,4}x\d{3,4}\./i.test(lower)) score -= 3
    if (/-1024x/i.test(lower)) score += 2
    if (!/-\d+x\d+\./i.test(lower)) score += 5
    return { src, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.src ?? null
}

function buildPresidentTerm(
  year: string,
  slug: string,
  nameHint?: string | null,
  imageHint?: string | null
): GlobalPresidentTerm | null {
  const cleanSlug = slug.replace(/\/+$/, "").split("/").pop() || ""
  if (!cleanSlug || !year) return null
  const page = getPageBySlug(cleanSlug)
  const name =
    decodeEntities((nameHint || "").trim()) ||
    page?.title ||
    cleanSlug.replace(/-/g, " ")
  const image = pickPresidentImage([
    imageHint,
    page?.featured_image,
    ...(page?.images ?? []),
  ])
  return {
    year,
    name,
    slug: cleanSlug,
    href: contentHref(cleanSlug),
    image,
    wing: page?.role || null,
    excerpt: page?.excerpt || null,
  }
}

function parsePresidentTermsFromHtml(html: string): GlobalPresidentTerm[] {
  const yearMatches = [...html.matchAll(PRESIDENT_YEAR_HEADING_RE)]
  const terms: GlobalPresidentTerm[] = []

  for (let i = 0; i < yearMatches.length; i++) {
    const year = yearMatches[i][2]
    const start = yearMatches[i].index ?? 0
    const end =
      i + 1 < yearMatches.length
        ? (yearMatches[i + 1].index ?? html.length)
        : html.length
    const chunk = html.slice(start, end)

    const imageMatch = chunk.match(
      /<a\b[^>]*href=["']([^"']*g100\.in\/([^"'/?#]+)\/?)["'][^>]*>\s*<img\b[^>]*src=["']([^"']+)["']/i
    )
    const nameMatch =
      chunk.match(
        /<a\b[^>]*href=["']([^"']*g100\.in\/([^"'/?#]+)\/?)["'][^>]*>\s*<span>([^<]+)<\/span>/i
      ) ||
      chunk.match(
        /<a\b[^>]*href=["']([^"']*(?:g100\.in\/)?\/?([^"'/?#]+)\/?)["'][^>]*>\s*([^<]{3,120})\s*<\/a>/i
      )

    const slug = decodeEntities(
      (nameMatch?.[2] || imageMatch?.[2] || "").trim()
    )
    const term = buildPresidentTerm(
      year,
      slug,
      nameMatch?.[3],
      imageMatch?.[3]
    )
    if (term) terms.push(term)
  }

  return terms
}

/** Yearly Global President roster with portraits (HTML parse + known fallbacks). */
export const getGlobalPresidentTerms = cache((): GlobalPresidentTerm[] => {
  const hub = getHub("global-president")
  const parsed = hub?.content_html
    ? parsePresidentTermsFromHtml(hub.content_html)
    : []

  const byYear = new Map<string, GlobalPresidentTerm>()
  for (const term of parsed) byYear.set(term.year, term)

  for (const known of KNOWN_PRESIDENT_TERMS) {
    if (byYear.has(known.year)) continue
    const term = buildPresidentTerm(known.year, known.slug)
    if (term) byYear.set(term.year, term)
  }

  // Prefer known order when both exist; otherwise sort newest first
  const knownOrder = KNOWN_PRESIDENT_TERMS.map((t) => t.year)
  const rest = [...byYear.keys()]
    .filter((year) => !knownOrder.includes(year))
    .sort((a, b) => Number(b) - Number(a))
  const orderedYears = [...knownOrder.filter((y) => byYear.has(y)), ...rest]

  return orderedYears
    .map((year) => byYear.get(year))
    .filter((term): term is GlobalPresidentTerm => Boolean(term))
})

/** Intro HTML for Global President with the year roster removed (shown as cards). */
export function getGlobalPresidentIntroHtml(): string {
  const hub = getHub("global-president")
  if (!hub?.content_html) return ""
  const html = hub.content_html
  const yearRe = new RegExp(PRESIDENT_YEAR_HEADING_RE.source, "i")
  const match = yearRe.exec(html)
  if (!match || match.index == null) {
    return html.replace(
      /<h[1-6]\b[^>]*>\s*20\d{2}\s*<\/h[1-6]>[\s\S]*$/i,
      ""
    )
  }
  return html.slice(0, match.index)
}

export const getMediaLibrary = cache((): WpMedia[] => {
  if (isSupabaseDataReady()) {
    const media = getSupabaseCache().media
    if (media.length) return media
  }
  const items = readJson<WpMedia[]>("media.json")
  return items.map((item) => ({
    ...item,
    url: normalizeMediaUrl(item.url),
  }))
})

export function getMediaImages(): WpMedia[] {
  return getMediaLibrary().filter((item) => item.mime.startsWith("image/"))
}

export function searchPages(query: string, limit = 40) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
  if (!terms.length) return []

  const { byId } = getAllPagesMap()

  return getPagesIndex()
    .map((item) => {
      const title = item.title.toLowerCase()
      const excerpt = (item.excerpt || "").toLowerCase()
      const slug = item.slug.toLowerCase()
      const role = (item.role || "").toLowerCase()
      let score = 0
      for (const term of terms) {
        if (title === term) score += 100
        else if (title.startsWith(term)) score += 60
        else if (title.includes(term)) score += 40
        if (slug.includes(term)) score += 20
        if (excerpt.includes(term)) score += 10
        if (role.includes(term)) score += 8
      }
      return { item, score }
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => {
      const full = byId.get(row.item.id)
      return {
        ...row.item,
        featured_image: pickCardImage(
          row.item.featured_image ?? full?.featured_image,
          full?.images
        ),
      }
    })
}

export function searchMedia(query: string, limit = 24) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
  if (!terms.length) return []

  return getMediaImages()
    .map((item) => {
      const title = (item.title || "").toLowerCase()
      const slug = (item.slug || "").toLowerCase()
      const file = (item.file || "").toLowerCase()
      let score = 0
      for (const term of terms) {
        if (title.includes(term)) score += 40
        if (slug.includes(term)) score += 20
        if (file.includes(term)) score += 10
      }
      return { item, score }
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.item)
}

export { contentHref }

const RESERVED_ROOT_SEGMENTS = new Set([
  "about",
  "president",
  "wings",
  "chapters",
  "country-club",
  "denim-club",
  "meetings",
  "join",
  "contact",
  "search",
  "media",
  "admin",
  "content",
  "api",
  "awards",
  "press",
  "_next",
  "brand",
  "favicon.ico",
])

/** Valid WP-style slug we are willing to map into /[slug]. */
function isLocalizableSlug(slug: string): boolean {
  if (!slug || slug.length < 3) return false
  if (RESERVED_ROOT_SEGMENTS.has(slug.toLowerCase())) return false
  if (slug.startsWith("_")) return false
  if (/\.(?:js|css|map|json|png|jpe?g|webp|svg|gif|pdf|ico)$/i.test(slug)) {
    return false
  }
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)
}

/** Local href for a WordPress slug (hub map, known page, or search fallback). */
export function hrefForWpSlug(slug: string): string {
  const clean = slug.replace(/\/+$/, "").split("/").filter(Boolean).pop() || ""
  if (!clean) return "/"
  if (LOCAL_ROUTE_BY_SLUG[clean]) return LOCAL_ROUTE_BY_SLUG[clean]
  if (clean === "awards" || clean === "press") return contentHref(clean)
  if (!isLocalizableSlug(clean)) return `/search?q=${encodeURIComponent(clean)}`
  if (getPageBySlug(clean)) return contentHref(clean)
  return `/search?q=${encodeURIComponent(clean.replace(/-/g, " "))}`
}

/** Rewrite absolute g100.in page links to local routes. */
export function localizeWpHtml(html: string): string {
  if (!html) return html
  return html
    .replace(
      /https?:\/\/(?:www\.)?g100\.in\/(?:index\.php\/)?([^"'?\s#]+)/gi,
      (full, path: string) => {
        const cleaned = path.replace(/\/+$/, "")
        if (!cleaned || cleaned.startsWith("wp-content/")) return full
        if (cleaned.startsWith("wp-admin") || cleaned.startsWith("wp-json")) {
          return full
        }
        const slug = cleaned.split("/").filter(Boolean).pop() || ""
        if (!isLocalizableSlug(slug) && !LOCAL_ROUTE_BY_SLUG[slug]) return full
        return hrefForWpSlug(slug)
      }
    )
    .replace(
      /href="\/(?!about(?:\/|#|$)|president(?:\/|#|$)|wings(?:\/|#|$)|chapters(?:\/|#|$)|country-club(?:\/|#|$)|denim-club(?:\/|#|$)|meetings(?:\/|#|$)|join(?:\/|#|$)|contact(?:\/|#|$)|search(?:\/|#|$)|media(?:\/|#|$)|admin(?:\/|#|$)|awards(?:\/|#|$)|press(?:\/|#|$)|api\/|_next\/|brand\/)([^"#?]+)"/gi,
      (match, path: string) => {
        const slug = path.replace(/\/+$/, "").split("/").filter(Boolean).pop()
        if (!slug) return match
        if (!isLocalizableSlug(slug) && !LOCAL_ROUTE_BY_SLUG[slug]) return match
        return `href="${hrefForWpSlug(slug)}"`
      }
    )
}

export type PrepareWpHtmlOptions = {
  /** Drop all images (use when the page already has a gallery/grid). */
  stripImages?: boolean
  /** Keep at most N images in the markup (after dedupe). */
  maxImages?: number
  /** Remove the first heading when it repeats the page title. */
  stripLeadingTitle?: string
  /** Drop matching image URLs (and size variants) from the body. */
  excludeImageUrls?: string[]
}

/**
 * Clean WordPress HTML for modern layout: emoji SVGs, builder junk,
 * empty nodes, Word paste styles, and duplicate media.
 */
export function prepareWpHtml(
  html: string,
  options: PrepareWpHtmlOptions = {}
): string {
  if (!html?.trim()) return ""

  let out = localizeWpHtml(html)

  // Legacy local upload hosts → live CDN
  out = out.replace(
    /https?:\/\/localhost(?::\d+)?\/G100\/wp-content\//gi,
    "https://www.g100.in/wp-content/"
  )
  out = out.replace(
    /https?:\/\/127\.0\.0\.1(?::\d+)?\/G100\/wp-content\//gi,
    "https://www.g100.in/wp-content/"
  )
  out = out.replace(/http:\/\/(?:www\.)?g100\.in\//gi, "https://www.g100.in/")

  // WordPress emoji CDN images + raw pointing-hand glyphs
  out = out.replace(
    /<img[^>]*src=["'][^"']*s\.w\.org\/images\/core\/emoji[^"']*["'][^>]*>/gi,
    ""
  )
  out = out.replace(/[\u{1F446}-\u{1F450}\u{1F449}]/gu, "")

  // Ultimate Addons / Unlimited Elements / builder leftovers
  out = stripUcAddonWidgets(out)
  out = out.replace(/skip\s*render:\s*[\w.-]+/gi, "")
  out = out.replace(/<button\b[^>]*>\s*<\/button>/gi, "")
  out = out.replace(/<!--[\s\S]*?-->/g, "")
  out = out.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
  out = out.replace(/<link\b[^>]*>/gi, "")

  // Empty headings / paragraphs / spans
  out = out.replace(/<(h[1-6]|p|div|span)\b[^>]*>\s*(?:&nbsp;|\u00a0|\s)*<\/\1>/gi, "")

  // Strip Word/inline layout styles that fight the design system
  out = out.replace(/\sstyle=(["'])[\s\S]*?\1/gi, "")
  out = out.replace(/\s(?:face|size|color|align|width|height|border)=(["'])[\s\S]*?\1/gi, "")

  if (options.stripLeadingTitle) {
    const escaped = options.stripLeadingTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    out = out.replace(
      new RegExp(`<h[1-6]\\b[^>]*>\\s*${escaped}\\s*</h[1-6]>`, "i"),
      ""
    )
  }

  // Always drop an empty or boilerplate first H1
  out = out.replace(/^\s*<h1\b[^>]*>\s*<\/h1>/i, "")

  if (options.stripImages) {
    out = out.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, "")
    out = out.replace(/<img\b[^>]*>/gi, "")
    out = out.replace(/<a\b[^>]*>\s*<\/a>/gi, "")
  } else {
    // Drop unusable imgs; dedupe; optionally cap count
    const seen = new Set<string>()
    let kept = 0
    const max = options.maxImages ?? 12
    const excluded = new Set(
      (options.excludeImageUrls ?? [])
        .map((src) =>
          normalizeMediaUrl(src)
            .toLowerCase()
            .replace(/-\d+x\d+(\.\w+)$/i, "$1")
        )
        .filter(Boolean)
    )
    out = out.replace(/<img\b[^>]*>/gi, (tag) => {
      const src = tag.match(/src=["']([^"']+)["']/i)?.[1]
      if (!src || !isUsableImageUrl(src)) return ""
      const normalized = normalizeMediaUrl(src)
      const key = normalized
        .toLowerCase()
        .replace(/-\d+x\d+(\.\w+)$/i, "$1")
      if (excluded.has(key)) return ""
      if (seen.has(key)) return ""
      if (kept >= max) return ""
      seen.add(key)
      kept += 1
      return tag.replace(src, normalized)
    })
    // Lightbox wrappers left empty after img removal
    out = out.replace(/<a\b[^>]*>\s*<\/a>/gi, "")
  }

  // Space glued text before anchors: "please<a" → "please <a"
  out = out.replace(/([A-Za-z0-9.,;:!?])(<a\b)/gi, "$1 $2")

  // Trim whitespace inside anchors
  out = out.replace(
    /(<a\b[^>]*>)\s+([\s\S]*?)\s*(<\/a>)/gi,
    (_, open: string, text: string, close: string) =>
      `${open}${text.replace(/\s+/g, " ").trim()}${close}`
  )

  // Group consecutive text-only CTA anchors (never wrap image links)
  out = out.replace(
    /((?:<a\b[^>]*>[^<]*<\/a>\s*){2,})/gi,
    (block) => {
      const links = (block.match(/<a\b[^>]*>[^<]*<\/a>/gi) ?? []).filter(
        (link) => !/<img\b/i.test(link) && /<a\b[^>]*>\s*[^<\s][^<]*<\/a>/i.test(link)
      )
      if (links.length < 2) return block
      return `<nav class="wp-link-row">${links
        .map((link) =>
          link.replace(
            /(>)([^<]+?)([.!?]?)<\/a>/i,
            (_m, gt: string, text: string) => `${gt}${text.trim()}</a>`
          )
        )
        .join("")}</nav>`
    }
  )

  // Drop dangling "please" / lead-ins left before a link row
  out = out.replace(/\bplease\s*(?=<nav class="wp-link-row">)/gi, "")
  out = out.replace(
    /To join a wing in your country,\s*(?=<nav class="wp-link-row">)/gi,
    ""
  )

  // Local routes should not open in a new tab
  out = out.replace(
    /(<a\b[^>]*href="\/[^"]*"[^>]*)\s+target="_blank"/gi,
    "$1"
  )
  // Collapse leftover empty wrappers after removals
  for (let i = 0; i < 3; i++) {
    out = out.replace(
      /<(p|div|span|a|figure)\b[^>]*>\s*(?:&nbsp;|\u00a0|\s)*<\/\1>/gi,
      ""
    )
  }

  // App-wide casing: headings → title case, paragraphs → paragraph/sentence case
  out = titleCaseHtmlHeadings(out)
  out = paragraphCaseHtmlParagraphs(out)

  return out.trim()
}

/** Plain-text excerpt from HTML for intros when full markup is too noisy. */
export function htmlToPlainText(html: string, maxLength = 420): string {
  const text = cleanWpPlainText(
    prepareWpHtml(html, { stripImages: true })
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(p|div|h[1-6]|li)>/gi, " ")
  )

  const cased = toParagraphCase(text)
  if (cased.length <= maxLength) return cased
  return `${cased.slice(0, maxLength - 1).trimEnd()}…`
}

export const FLOW_HUBS = [
  { key: "about-us", label: "About us", href: "/about" },
  { key: "global-president", label: "Global president", href: "/president" },
  { key: "g100-global-chairs-and-chapters", label: "Global Chair", href: "/wings" },
  { key: "country-clubs", label: "Country Club", href: "/country-club" },
  { key: "denim-club-partners", label: "Denim Club", href: "/denim-club" },
  { key: "the-denim-club-dialogues", label: "Denim Dialogues", href: "/denim-club/dialogues" },
  { key: "meetings", label: "Meetings", href: "/meetings" },
] as const
