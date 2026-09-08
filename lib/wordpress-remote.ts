/**
 * Live fallback fetch from g100.in WordPress REST API
 * when a page is missing from the local/Supabase cache.
 */
import { isUsableImageUrl, normalizeMediaUrl } from "@/lib/media-url"
import type { WpPage } from "@/lib/wordpress"

const SITE = "https://www.g100.in"
const API = `${SITE}/wp-json/wp/v2`

function decodeEntities(value = "") {
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
}

function extractImageUrls(html = "") {
  const urls: string[] = []
  const re =
    /(?:src|href)=["']([^"']+\.(?:jpe?g|png|gif|webp|svg)(?:\?[^"']*)?)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    let u = m[1]
    if (u.startsWith("//")) u = `https:${u}`
    u = normalizeMediaUrl(u)
    if (u) urls.push(u)
  }
  return [...new Set(urls)]
}

function classify(title: string, slug: string): string {
  const t = title
  const tl = t.toLowerCase()
  const sl = slug.toLowerCase()
  const exact: Record<string, string> = {
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
  if (/\bmeetings?\b|\bmeet & greet\b|\bmeet-greet\b/i.test(tl)) return "meetings"
  if (/\bcountry chairs?\b/i.test(t)) return "country_chair"
  if (/\bstate chairs?\b/i.test(t)) return "state_chair"
  if (/\bcity chairs?\b/i.test(t)) return "city_chair"
  if (/\bWing\s*$/i.test(t)) return "wing"
  return "other"
}

type WpRestPage = {
  id: number
  date?: string
  modified?: string
  slug: string
  link?: string
  title?: { rendered?: string }
  content?: { rendered?: string }
  excerpt?: { rendered?: string }
  parent?: number
  menu_order?: number
  featured_media?: number
  featured_image_src?: string | null
}

export async function fetchPageFromG100(
  slug: string
): Promise<WpPage | null> {
  try {
    const url = `${API}/pages?slug=${encodeURIComponent(slug)}&_fields=id,date,modified,slug,link,title,content,excerpt,parent,menu_order,featured_media,featured_image_src`
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return null
    const rows = (await res.json()) as WpRestPage[]
    const p = rows[0]
    if (!p) return null

    const title = decodeEntities(p.title?.rendered || "")
    const content = p.content?.rendered || ""
    const excerpt = decodeEntities(
      (p.excerpt?.rendered || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    const images = extractImageUrls(content)
    let featured = p.featured_image_src
      ? normalizeMediaUrl(p.featured_image_src)
      : null
    if (!featured) {
      featured =
        images.find((u) => isUsableImageUrl(u) && !u.toLowerCase().includes("logo")) ||
        null
    }
    if (featured && !images.includes(featured)) images.unshift(featured)

    return {
      id: p.id,
      title,
      slug: p.slug,
      url: p.link || `${SITE}/${p.slug}/`,
      excerpt,
      content_html: content,
      parent: p.parent || 0,
      menu_order: p.menu_order || 0,
      date: p.date || "",
      modified: p.modified || "",
      role: classify(title, p.slug),
      featured_image: featured,
      images: images.slice(0, 40),
      thumbnail_id: p.featured_media || null,
    }
  } catch {
    return null
  }
}
