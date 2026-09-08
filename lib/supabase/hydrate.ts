import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { SiteForm } from "@/lib/form-fields"
import { isUsableImageUrl } from "@/lib/media-url"
import type { WpManifest, WpMedia, WpPage } from "@/lib/wordpress"

type CacheShape = {
  pages: WpPage[]
  media: WpMedia[]
  hubs: Record<string, WpPage>
  wings: WpPage[]
  forms: SiteForm[]
  hierarchy: unknown | null
  manifest: WpManifest | null
  storageByUrl: Record<string, string>
  ready: boolean
}

const g = globalThis as typeof globalThis & {
  __g100SupabaseCache?: CacheShape
}

function emptyCache(): CacheShape {
  return {
    pages: [],
    media: [],
    hubs: {},
    wings: [],
    forms: [],
    hierarchy: null,
    manifest: null,
    storageByUrl: {},
    ready: false,
  }
}

export function getSupabaseCache(): CacheShape {
  if (!g.__g100SupabaseCache) g.__g100SupabaseCache = emptyCache()
  return g.__g100SupabaseCache
}

export function isSupabaseDataReady() {
  return getSupabaseCache().ready
}

type PageRow = {
  id: number
  title: string
  slug: string
  url: string | null
  excerpt: string | null
  content_html: string | null
  parent: number | null
  menu_order: number | null
  date: string | null
  modified: string | null
  role: string | null
  featured_image: string | null
  images: string[] | null
}

type MediaRow = {
  id: number
  title: string | null
  slug: string | null
  mime: string | null
  parent: number | null
  url: string
  file: string | null
  date: string | null
  storage_url: string | null
}

type FormRow = {
  id: number
  slug: string
  title: string
  kind: string
  fields: SiteForm["fields"]
}

async function fetchAllPages(supabase: SupabaseClient): Promise<WpPage[]> {
  const pageSize = 500
  let from = 0
  const all: WpPage[] = []
  for (;;) {
    const { data, error } = await supabase
      .from("pages")
      .select(
        "id,title,slug,url,excerpt,content_html,parent,menu_order,date,modified,role,featured_image,images"
      )
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw error
    const rows = (data || []) as PageRow[]
    if (!rows.length) break
    all.push(
      ...rows.map((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        url: row.url ?? "",
        excerpt: row.excerpt ?? "",
        content_html: row.content_html ?? "",
        parent: row.parent ?? 0,
        menu_order: row.menu_order ?? 0,
        date: row.date ?? "",
        modified: row.modified ?? "",
        role: row.role ?? "other",
        featured_image:
          row.featured_image ??
          row.images?.find((src) => isUsableImageUrl(src)) ??
          null,
        images: row.images ?? [],
      }))
    )
    if (rows.length < pageSize) break
    from += pageSize
  }
  return all
}

async function fetchAllMedia(supabase: SupabaseClient): Promise<WpMedia[]> {
  const pageSize = 1000
  let from = 0
  const all: WpMedia[] = []
  for (;;) {
    const { data, error } = await supabase
      .from("media")
      .select("id,title,slug,mime,parent,url,file,date,storage_url")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw error
    const rows = (data || []) as MediaRow[]
    if (!rows.length) break
    for (const row of rows) {
      all.push({
        id: row.id,
        title: row.title ?? "",
        slug: row.slug ?? "",
        mime: row.mime ?? "",
        parent: row.parent ?? 0,
        url: row.storage_url || row.url,
        file: row.file ?? "",
        date: row.date ?? "",
      })
    }
    if (rows.length < pageSize) break
    from += pageSize
  }
  return all
}

/** Load Supabase content into a process-wide cache for fast SSR reads. */
export async function hydrateSupabaseCache() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return false

  const cache = getSupabaseCache()
  if (cache.ready && cache.pages.length) return true

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const [pages, media, hubsRows, wingsRows, manifestRows, formsRows, hierarchyRows] =
    await Promise.all([
      fetchAllPages(supabase),
      fetchAllMedia(supabase),
      supabase.from("hubs").select("key,page_id,title,slug"),
      supabase.from("wings").select("page_id,sort_order").order("sort_order"),
      supabase.from("site_manifest").select("*").eq("id", 1).maybeSingle(),
      supabase.from("forms").select("id,slug,title,kind,fields").order("id"),
      supabase.from("site_content").select("payload").eq("key", "hierarchy").maybeSingle(),
    ])

  if (hubsRows.error) throw hubsRows.error
  if (wingsRows.error) throw wingsRows.error
  if (formsRows.error) throw formsRows.error
  if (hierarchyRows.error) throw hierarchyRows.error

  const byId = new Map(pages.map((p) => [p.id, p]))
  const hubs: Record<string, WpPage> = {}
  for (const hub of hubsRows.data || []) {
    const page = hub.page_id ? byId.get(hub.page_id) : undefined
    if (page) hubs[hub.key] = page
  }

  const wings = (wingsRows.data || [])
    .map((w) => byId.get(w.page_id))
    .filter(Boolean) as WpPage[]

  const forms: SiteForm[] = ((formsRows.data || []) as FormRow[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    kind: row.kind as SiteForm["kind"],
    fields: row.fields || [],
  }))

  const storageByUrl: Record<string, string> = {}
  for (const item of media) {
    if (item.url.includes("supabase.co")) {
      storageByUrl[item.url] = item.url
    }
  }

  const m = manifestRows.data
  cache.pages = pages
  cache.media = media
  cache.hubs = hubs
  cache.wings = wings
  cache.forms = forms
  cache.hierarchy = hierarchyRows.data?.payload ?? null
  cache.storageByUrl = storageByUrl
  cache.manifest = m
    ? {
        site: m.site || "https://www.g100.in",
        database: m.database_name || "supabase",
        page_count: m.page_count || pages.length,
        media_count: m.media_count || media.length,
        role_counts: (m.role_counts as Record<string, number>) || {},
        wings_count: m.wings_count || wings.length,
        hubs: m.hubs || Object.keys(hubs),
      }
    : null
  cache.ready = true
  console.log(
    `[g100] Supabase cache ready: ${pages.length} pages, ${media.length} media, ${wings.length} wings, ${forms.length} forms`
  )
  return true
}
