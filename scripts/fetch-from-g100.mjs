#!/usr/bin/env node
/**
 * Fetch live content from https://www.g100.in WordPress REST API
 * and rebuild local data/wordpress JSON used by the Next.js app.
 *
 * Usage:
 *   node scripts/fetch-from-g100.mjs
 *   node scripts/fetch-from-g100.mjs --pages-only
 *   node scripts/fetch-from-g100.mjs --media --media-limit=2000
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, "..", "data", "wordpress")
const SITE = "https://www.g100.in"
const API = `${SITE}/wp-json/wp/v2`

const args = new Set(process.argv.slice(2))
const pagesOnly = args.has("--pages-only")
const fetchMedia = args.has("--media")
const mediaLimitArg = [...args].find((a) => a.startsWith("--media-limit="))
const mediaLimit = mediaLimitArg
  ? Number(mediaLimitArg.split("=")[1]) || 2000
  : 3000

mkdirSync(OUT, { recursive: true })

function decodeEntities(value = "") {
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCharCode(parseInt(n, 16))
    )
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
}

function classify(title, slug) {
  const t = title || ""
  const tl = t.toLowerCase()
  const sl = (slug || "").toLowerCase()

  const exact = {
    "about-us": "about_us",
    "about-founder": "founder",
    "global-president": "global_president",
    "presidents-advisory-council": "presidents_advisory",
    "g100-global-chairs-and-chapters": "global_chair",
    "country-clubs": "country_club",
    "denim-club-partners": "denim_club",
    "the-denim-club-dialogues": "denim_dialogues",
    meetings: "meetings_hub",
    home: "home",
  }
  if (exact[sl]) return exact[sl]

  if (/\bmeetings?\b|\bmeet & greet\b|\bmeet-greet\b/i.test(tl)) {
    return "meetings"
  }

  const patterns = [
    ["country_chair", /\bcountry chairs?\b/i],
    ["state_chair", /\bstate chairs?\b/i],
    ["city_chair", /\bcity chairs?\b/i],
    ["country_denim", /\bcountry denim partners?\b/i],
    ["state_denim", /\bstate denim partners?\b/i],
    ["city_denim", /\bcity denim partners?\b/i],
    [
      "country_advisory",
      /\bcountry advisories?\b|\bcountry advisory councils?\b/i,
    ],
    ["state_advisory", /\bstate advisories?\b|\bstate advisory councils?\b/i],
    ["city_advisory", /\bcity advisories?\b|\bcity advisory councils?\b/i],
    ["members", /\bmembers?\b/i],
    ["global_partner", /\bglobal partners?\b/i],
    ["country_partner", /\bcountry partners?\b/i],
    ["state_partner", /\bstate partners?\b/i],
    ["city_partner", /\bcity partners?\b/i],
  ]
  for (const [key, pat] of patterns) {
    if (pat.test(t)) return key
  }

  if (
    /\bWing\s*$/i.test(t) &&
    !/\b(Chair|Denim|Advisor|Advisory|Member|Partner|Region|Launch|Event|Meet)\b/i.test(
      t
    )
  ) {
    return "wing"
  }
  return "other"
}

function extractImageUrls(html = "") {
  const urls = []
  const re1 =
    /(?:src|href)=["']([^"']+\.(?:jpg|jpeg|png|gif|webp|svg)(?:\?[^"']*)?)/gi
  const re2 =
    /(?:src|href)=["'](https?:\/\/[^"']+\/wp-content\/uploads\/[^"']+)/gi
  for (const re of [re1, re2]) {
    let m
    while ((m = re.exec(html))) urls.push(m[1])
  }
  const seen = new Set()
  const out = []
  for (let u of urls) {
    if (u.startsWith("//")) u = `https:${u}`
    u = u.replace(/^http:\/\/(www\.)?g100\.in\//i, "https://www.g100.in/")
    u = u.replace(
      /^https?:\/\/localhost(?::\d+)?\/G100\/wp-content\//i,
      "https://www.g100.in/wp-content/"
    )
    if (!seen.has(u)) {
      seen.add(u)
      out.push(u)
    }
  }
  return out
}

async function fetchJson(url, attempt = 1) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "G100-NextSync/1.0",
    },
  })
  if (!res.ok) {
    if (attempt < 4 && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, attempt * 1200))
      return fetchJson(url, attempt + 1)
    }
    throw new Error(`HTTP ${res.status} for ${url}`)
  }
  return {
    data: await res.json(),
    total: Number(res.headers.get("X-WP-Total") || 0),
    totalPages: Number(res.headers.get("X-WP-TotalPages") || 0),
  }
}

async function fetchAllPages() {
  const perPage = 100
  const first = await fetchJson(
    `${API}/pages?per_page=${perPage}&page=1&orderby=id&order=asc&status=publish&_fields=id,date,modified,slug,link,title,content,excerpt,parent,menu_order,featured_media,featured_image_src`
  )
  const totalPages = first.totalPages || 1
  const all = [...first.data]
  console.log(`pages: ${all.length}/${first.total} (page 1/${totalPages})`)

  for (let page = 2; page <= totalPages; page++) {
    const { data } = await fetchJson(
      `${API}/pages?per_page=${perPage}&page=${page}&orderby=id&order=asc&status=publish&_fields=id,date,modified,slug,link,title,content,excerpt,parent,menu_order,featured_media,featured_image_src`
    )
    all.push(...data)
    if (page % 5 === 0 || page === totalPages) {
      console.log(`pages: ${all.length}/${first.total} (page ${page}/${totalPages})`)
    }
    // be polite to the origin
    await new Promise((r) => setTimeout(r, 80))
  }
  return { pages: all, total: first.total }
}

async function fetchMediaBatch(limit) {
  const perPage = 100
  const first = await fetchJson(
    `${API}/media?per_page=${perPage}&page=1&orderby=id&order=asc&_fields=id,date,slug,title,source_url,mime_type,media_details,post`
  )
  const maxPages = Math.min(
    first.totalPages || 1,
    Math.ceil(limit / perPage)
  )
  const all = [...first.data]
  console.log(`media: ${all.length} (fetching up to ${limit})`)

  for (let page = 2; page <= maxPages; page++) {
    const { data } = await fetchJson(
      `${API}/media?per_page=${perPage}&page=${page}&orderby=id&order=asc&_fields=id,date,slug,title,source_url,mime_type,media_details,post`
    )
    all.push(...data)
    if (all.length >= limit) break
    if (page % 5 === 0 || page === maxPages) {
      console.log(`media: ${all.length}`)
    }
    await new Promise((r) => setTimeout(r, 60))
  }
  return all.slice(0, limit)
}

function mapPage(p) {
  const title = decodeEntities(p.title?.rendered || "")
  const slug = p.slug || ""
  const content = p.content?.rendered || ""
  const excerpt = decodeEntities(
    (p.excerpt?.rendered || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  )
  const role = classify(title, slug)
  const images = extractImageUrls(content)
  let featured =
    (typeof p.featured_image_src === "string" && p.featured_image_src) ||
    null
  if (featured) {
    featured = featured
      .replace(/^http:\/\/(www\.)?g100\.in\//i, "https://www.g100.in/")
      .replace(
        /^https?:\/\/localhost(?::\d+)?\/G100\/wp-content\//i,
        "https://www.g100.in/wp-content/"
      )
  }
  if (!featured) {
    featured =
      images.find(
        (u) =>
          /\.(jpe?g|png|webp)(\?|$)/i.test(u) &&
          !u.includes("uc_creative") &&
          !u.includes("/thumbs/") &&
          !u.toLowerCase().includes("logo")
      ) || null
  }
  if (featured && !images.includes(featured)) images.unshift(featured)

  return {
    id: p.id,
    title,
    slug,
    url: p.link || `${SITE}/${slug}/`,
    excerpt,
    content_html: content,
    parent: p.parent || 0,
    menu_order: p.menu_order || 0,
    date: p.date || "",
    modified: p.modified || "",
    role,
    featured_image: featured,
    images: images.slice(0, 40),
    thumbnail_id: p.featured_media || null,
  }
}

function writeJson(name, data, pretty = false) {
  const path = join(OUT, name)
  writeFileSync(path, JSON.stringify(data, pretty ? null : undefined, pretty ? 2 : 0))
  console.log(`wrote ${name}`)
}

async function main() {
  console.log(`Fetching from ${SITE} …`)
  const { pages: rawPages, total } = await fetchAllPages()
  const pagesOut = rawPages.map(mapPage)

  const byRole = {}
  for (const item of pagesOut) {
    byRole[item.role] ||= []
    byRole[item.role].push({
      id: item.id,
      title: item.title,
      slug: item.slug,
      url: item.url,
      featured_image: item.featured_image,
    })
  }

  writeJson("pages.json", pagesOut)
  writeJson("pages-by-role.json", byRole)

  const hubSlugs = new Set([
    "about-us",
    "about-founder",
    "global-president",
    "presidents-advisory-council",
    "g100-global-chairs-and-chapters",
    "country-clubs",
    "denim-club-partners",
    "the-denim-club-dialogues",
    "meetings",
    "home",
  ])
  const hubs = {}
  for (const p of pagesOut) {
    if (hubSlugs.has(p.slug)) hubs[p.slug] = p
  }
  writeJson("hubs.json", hubs, true)

  const wings = pagesOut
    .filter(
      (p) =>
        p.role === "wing" &&
        /\bWing\s*$/i.test(p.title) &&
        !/\b(Advisories?|Chairs?|Region|Cameroon|Myanmar|Zambia|USA |UK |Global Advisories)\b/i.test(
          p.title
        )
    )
    .sort((a, b) => a.title.localeCompare(b.title))
  writeJson("wings.json", wings)

  const pagesIndex = pagesOut.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    url: p.url,
    excerpt: p.excerpt,
    role: p.role,
    featured_image: p.featured_image,
    date: p.date,
    modified: p.modified,
    parent: p.parent,
  }))
  writeJson("pages-index.json", pagesIndex)

  const slugToId = {}
  for (const p of pagesOut) slugToId[p.slug] = p.id
  writeJson("slug-to-id.json", slugToId, true)

  let mediaCount = 0
  if (fetchMedia && !pagesOnly) {
    const mediaRaw = await fetchMediaBatch(mediaLimit)
    const media = mediaRaw.map((m) => {
      const file =
        m.media_details?.file ||
        (m.source_url || "").split("/wp-content/uploads/")[1] ||
        ""
      return {
        id: m.id,
        title: decodeEntities(m.title?.rendered || ""),
        slug: m.slug || "",
        mime: m.mime_type || "",
        parent: m.post || 0,
        url: (m.source_url || "").replace(
          /^http:\/\/(www\.)?g100\.in\//i,
          "https://www.g100.in/"
        ),
        file,
        date: m.date || "",
      }
    })
    // Merge with existing media so we don't wipe the full library when limited
    let merged = media
    const existingPath = join(OUT, "media.json")
    if (existsSync(existingPath)) {
      try {
        const existing = JSON.parse(readFileSync(existingPath, "utf8"))
        const byId = new Map(existing.map((m) => [m.id, m]))
        for (const m of media) byId.set(m.id, m)
        merged = [...byId.values()].sort((a, b) => a.id - b.id)
      } catch {
        /* ignore */
      }
    }
    writeJson("media.json", merged)
    mediaCount = merged.length
  } else if (existsSync(join(OUT, "media.json"))) {
    try {
      mediaCount = JSON.parse(readFileSync(join(OUT, "media.json"), "utf8")).length
    } catch {
      mediaCount = 0
    }
  }

  const roleCounts = {}
  for (const [role, rows] of Object.entries(byRole)) {
    roleCounts[role] = rows.length
  }

  const manifest = {
    site: SITE,
    database: "wp-rest-api",
    page_count: pagesOut.length,
    media_count: mediaCount,
    role_counts: roleCounts,
    wings_count: wings.length,
    hubs: Object.keys(hubs),
    fetched_at: new Date().toISOString(),
    source_total_pages: total,
  }
  writeJson("manifest.json", manifest, true)

  // Keep g100 hierarchy / forms untouched unless missing
  console.log(
    `\nDone. ${pagesOut.length} pages, ${wings.length} wings, ${Object.keys(hubs).length} hubs, ${mediaCount} media.`
  )
  console.log("Restart `npm run dev` (or rebuild) to load the refreshed data.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
