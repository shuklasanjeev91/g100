import {
  isDisplayableImageUrl,
  normalizeMediaUrl,
  preferFullImage,
} from "@/lib/media-url"
import type { WpPage } from "@/lib/wordpress"

export type PressItem = {
  id: string
  title: string
  href: string
  image: string
  source: string
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

function cleanTitle(raw: string) {
  return decodeEntities(raw)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function sourceFromHref(href: string) {
  try {
    return new URL(href).hostname.replace(/^www\./, "")
  } catch {
    return "Press"
  }
}

function isExternalArticle(href: string) {
  if (!/^https?:\/\//i.test(href)) return false
  if (/\/wp-content\/uploads\//i.test(href)) return false
  if (/data-elementor-open-lightbox/i.test(href)) return false
  return true
}

/** Parse Press page HTML into article cards (image + title + external link). */
export function parsePressItems(page: WpPage): PressItem[] {
  const html = page.content_html || ""
  const gallery = page.images ?? []
  const re =
    /<a\b[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>\s*<img\b([^>]*)>\s*<\/a>/gi

  const items: PressItem[] = []
  const seen = new Set<string>()
  let match: RegExpExecArray | null

  while ((match = re.exec(html))) {
    const href = match[1].trim().replace(/\s+/g, "")
    if (!isExternalArticle(href)) continue

    const imgTag = match[2]
    const src = imgTag.match(/src=["']([^"']+)["']/i)?.[1]
    if (!src || !isDisplayableImageUrl(src, { allowThumbs: true })) continue
    if (/logo/i.test(src)) continue

    const after = html.slice(match.index + match[0].length, match.index + match[0].length + 1200)

    let title = ""
    // Prefer a title link that points at the same article
    const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const sameHrefTitle = new RegExp(
      `<a\\b[^>]*href=["']\\s*${escaped}\\s*["'][^>]*>([\\s\\S]*?)<\\/a>`,
      "i"
    ).exec(after)
    if (sameHrefTitle) {
      title = cleanTitle(sameHrefTitle[1])
    }

    if (!title || title.length < 8) {
      const nearby = after.match(
        /<p[^>]*>\s*<a\b[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/p>/i
      )
      if (nearby && isExternalArticle(nearby[1])) {
        // Only use if hrefs share the same host (avoids stealing next card's title)
        try {
          if (new URL(nearby[1]).hostname === new URL(href).hostname) {
            title = cleanTitle(nearby[2])
          }
        } catch {
          /* ignore */
        }
      }
    }

    if (!title || title.length < 8) {
      title = cleanTitle(
        imgTag.match(/title=["']([^"']+)["']/i)?.[1] ||
          imgTag.match(/alt=["']([^"']+)["']/i)?.[1] ||
          ""
      )
    }

    if (!title || title.length < 6) continue
    if (/^(press|screenshot|img|\d+)(\s|$)/i.test(title)) continue

    const key = href.replace(/\/+$/, "").toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const image = preferFullImage(src, gallery)

    items.push({
      id: `press-${items.length + 1}`,
      title,
      href,
      image,
      source: sourceFromHref(href),
    })
  }

  return items
}
