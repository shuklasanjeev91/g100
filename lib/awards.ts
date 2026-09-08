import { cache } from "react"

import {
  isDisplayableImageUrl,
  isUsableImageUrl,
  normalizeMediaUrl,
  preferFullImage,
} from "@/lib/media-url"
import { SITE } from "@/lib/site"
import { getPageBySlug, getPagesIndex, contentHref, type WpPage } from "@/lib/wordpress"

export type AwardCategory = {
  id: string
  title: string
  description: string
  image: string | null
}

export type AwardMoment = {
  id: number
  title: string
  slug: string
  href: string
  image: string | null
  excerpt: string
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
}

function cleanText(raw: string) {
  return decodeEntities(raw)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function introFromAwardsHtml(html: string) {
  const headings = [...html.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi)]
    .map((m) => cleanText(m[1]))
    .filter((t) => t.length > 40)
  return headings.slice(0, 2)
}

/** Parse award category blocks from the Awards page HTML. */
export function parseAwardCategories(
  page: WpPage,
  imagePool: string[]
): AwardCategory[] {
  const html = page.content_html || ""
  const blocks: { title: string; description: string }[] = []

  // <p><strong>Title:</strong></p>Description… or <strong>Title:</strong> Description
  const strongRe =
    /<(?:p[^>]*>\s*)?strong[^>]*>([\s\S]*?)<\/strong>\s*:?\s*(?:<\/p>)?\s*([\s\S]*?)(?=(?:<(?:p[^>]*>\s*)?strong)|$)/gi

  let match: RegExpExecArray | null
  while ((match = strongRe.exec(html))) {
    const title = cleanText(match[1]).replace(/:+$/, "").trim()
    const description = cleanText(match[2])
    if (!title || title.length < 8) continue
    if (!/award|women|leader|iconic|young|legendary|exceptional|organisation|organization/i.test(title)) {
      continue
    }
    if (description.length < 40) continue
    blocks.push({ title, description })
  }

  return blocks.map((block, index) => ({
    id: `award-cat-${index + 1}`,
    title: block.title,
    description: block.description,
    image: imagePool[index % Math.max(imagePool.length, 1)] || null,
  }))
}

function collectImagesFromPage(page: WpPage | undefined): string[] {
  if (!page) return []
  const out: string[] = []
  const seen = new Set<string>()
  const push = (raw: string | null | undefined) => {
    if (!raw) return
    const src = preferFullImage(raw, page.images)
    if (!isDisplayableImageUrl(src, { allowThumbs: true })) return
    if (/logo|favicon|chapter-logo/i.test(src)) return
    const key = src.toLowerCase().replace(/-\d+x\d+(?=\.\w+$)/i, "")
    if (seen.has(key)) return
    seen.add(key)
    out.push(normalizeMediaUrl(src))
  }

  push(page.featured_image)
  for (const img of page.images ?? []) push(img)
  return out
}

/** Images from award-related event pages + brand fallbacks. */
export const getAwardImagePool = cache((): string[] => {
  const relatedSlugs = [
    "academic-leadership-awards-women-leadership-conference",
    "bangladesh-meetings-dhaka-21-24-november-2022-along-with-iwes-and-wicci-bangladesh-awards",
    "bangladesh-meetings",
  ]

  const pool: string[] = []
  const seen = new Set<string>()
  for (const slug of relatedSlugs) {
    for (const src of collectImagesFromPage(getPageBySlug(slug))) {
      const key = src.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      pool.push(src)
    }
  }

  for (const fallback of [SITE.heroImage, SITE.denimImage]) {
    const src = normalizeMediaUrl(fallback)
    if (!src || seen.has(src.toLowerCase())) continue
    if (isUsableImageUrl(src)) {
      seen.add(src.toLowerCase())
      pool.push(src)
    }
  }

  return pool
})

/** Content pages that document award ceremonies / related events. */
export const getAwardMoments = cache((): AwardMoment[] => {
  const index = getPagesIndex()
  const moments: AwardMoment[] = []

  for (const row of index) {
    if (row.slug === "awards") continue
    const hay = `${row.title} ${row.slug}`.toLowerCase()
    if (!/\baward/.test(hay)) continue

    const full = getPageBySlug(row.slug)
    const image =
      collectImagesFromPage(full)[0] ||
      (row.featured_image && isUsableImageUrl(row.featured_image)
        ? normalizeMediaUrl(row.featured_image)
        : null)

    moments.push({
      id: row.id,
      title: row.title,
      slug: row.slug,
      href: contentHref(row.slug),
      image,
      excerpt: cleanText(row.excerpt || full?.excerpt || "").slice(0, 160),
    })
  }

  return moments.sort((a, b) => b.id - a.id)
})

export function getAwardsIntro(page: WpPage): string[] {
  return introFromAwardsHtml(page.content_html || "")
}
