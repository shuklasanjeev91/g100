import Link from "next/link"

import {
  AwardsCategoryGrid,
  AwardsMomentsGrid,
} from "@/components/awards-grid"
import { MediaGallery, MediaImage } from "@/components/media-gallery"
import { PressGrid } from "@/components/press-grid"
import { SiteBrandLogo } from "@/components/site-brand-logo"
import { Container } from "@/components/page-shell"
import { RelatedFlowSection } from "@/components/related-flow"
import { Button } from "@/components/ui/button"
import {
  getAwardImagePool,
  getAwardMoments,
  getAwardsIntro,
  parseAwardCategories,
} from "@/lib/awards"
import { isUsableImageUrl, normalizeMediaUrl } from "@/lib/media-url"
import { parsePressItems } from "@/lib/press"
import {
  buildChaptersHref,
  contentHref,
  getPageBySlug,
  hrefForWpSlug,
  prepareWpHtml,
  type PrepareWpHtmlOptions,
  type WpPage,
} from "@/lib/wordpress"
import { toParagraphCase, toTitleCase } from "@/lib/text-case"
import { cn } from "@/lib/utils"

export { PageCard, type PageCardData } from "@/components/page-card"

function usableGallery(page: WpPage) {
  return (page.images ?? [])
    .map((src) => normalizeMediaUrl(src))
    .filter((src) => isUsableImageUrl(src) && src !== page.featured_image)
}

export function WpContent({
  html,
  className,
  prepareOptions,
}: {
  html: string
  className?: string
  prepareOptions?: PrepareWpHtmlOptions
}) {
  const cleaned = prepareWpHtml(html, prepareOptions)

  if (!cleaned) {
    return (
      <p className="text-sm text-muted-foreground">No content available.</p>
    )
  }

  return (
    <div
      className={cn("wp-content", className)}
      dangerouslySetInnerHTML={{ __html: cleaned }}
    />
  )
}

export function ContentArticle({
  page,
  showGallery = true,
  bare = false,
  stripImages = false,
  maxImages = 8,
  excludeImageUrls,
  className,
}: {
  page: WpPage
  showGallery?: boolean
  bare?: boolean
  /** Prefer structured galleries/grids over inline WP image dumps. */
  stripImages?: boolean
  maxImages?: number
  /** Skip these URLs in body markup (e.g. hero already shown above). */
  excludeImageUrls?: string[]
  className?: string
}) {
  const gallery = usableGallery(page)

  return (
    <article className={cn("w-full space-y-10", className)}>
      {!bare && page.featured_image && isUsableImageUrl(page.featured_image) ? (
        <div className="relative aspect-[21/8] w-full overflow-hidden md:aspect-[21/7]">
          <MediaImage
            src={page.featured_image}
            alt={page.title}
            className="absolute inset-0 size-full"
            priority
            sizes="100vw"
          />
        </div>
      ) : null}

      <WpContent
        html={page.content_html}
        prepareOptions={{
          stripImages,
          maxImages: stripImages ? 0 : maxImages,
          stripLeadingTitle: page.title,
          excludeImageUrls,
        }}
      />

      {showGallery && gallery.length > 0 ? (
        <div className="space-y-5">
          <h2 className="font-heading text-2xl font-medium md:text-3xl">
            Gallery
          </h2>
          <MediaGallery images={gallery} title={page.title} limit={24} />
        </div>
      ) : null}
    </article>
  )
}

type WingCta = { label: string; href: string; description?: string }

function slugFromHref(raw: string): string {
  return raw
    .replace(/https?:\/\/(?:www\.)?g100\.in\//i, "/")
    .replace(/\/+$/, "")
    .split("/")
    .filter(Boolean)
    .pop() || ""
}

function localContentHref(raw: string): string {
  const cleaned = raw
    .replace(/https?:\/\/(?:www\.)?g100\.in\//i, "/")
    .replace(/\/+$/, "")
  const slug = slugFromHref(raw)
  if (!slug) return "/"
  if (/^country-chairs-/i.test(slug) || /country-chairs/i.test(cleaned)) {
    return `/chapters?branch=view-chapters`
  }
  // Country/state/city advisory indexes → chapter browser.
  // Keep wing-level "global-advisory-councils-*" pages as content routes.
  if (/^(country|state|city)-advisory-councils?/i.test(slug)) {
    return `/chapters?branch=advisory-council`
  }
  if (/^stefan-blachfellner$/i.test(slug)) return `/denim-club`
  return hrefForWpSlug(slug)
}

function wingSectorLabel(title: string) {
  return toTitleCase(title.replace(/\s+Wing$/i, "").trim())
}

function findWingAdvisoryHref(wingSlug: string, html: string): string {
  const fromHtml = [
    ...html.matchAll(/href=["']([^"']*global-advis\w*[^"']*)["']/gi),
  ]
    .map((m) => m[1])
    .find((href) => href && !href.includes("uploads"))
  if (fromHtml) return localContentHref(fromHtml)

  const candidates = [
    `global-advisory-council-${wingSlug}`,
    `global-advisory-councils-${wingSlug}`,
    `global-advisories-council-${wingSlug}`,
    `global-advisories-councils-${wingSlug}`,
  ]
  for (const slug of candidates) {
    if (getPageBySlug(slug)) return contentHref(slug)
  }
  return buildChaptersHref({
    branch: "advisory-council",
    role: "country_advisory",
    wing: wingSlug,
  })
}

function isUselessWingText(text: string, page: WpPage, chairName: string | null) {
  const key = personKey(text)
  if (!key || key.length < 12) return true
  if (chairName && key === personKey(chairName)) return true
  if (key === personKey(page.title)) return true
  if (key === personKey(wingSectorLabel(page.title))) return true
  if (/^(tba|view chapters|advisory|denim|global advisory)/i.test(text.trim())) {
    return true
  }
  return false
}

function parseWingProfile(page: WpPage): {
  chairName: string | null
  chairHref: string | null
  portrait: string | null
  sector: string
  ctas: WingCta[]
  bioHtml: string
  bioText: string
} {
  let html = page.content_html || ""
  const sector = wingSectorLabel(page.title)
  const wingKey = personKey(page.title)
  const sectorKey = personKey(sector)

  let chairName: string | null = null
  let chairHref: string | null = null

  const headingRe = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi
  let headingMatch: RegExpExecArray | null
  while ((headingMatch = headingRe.exec(html))) {
    const inner = headingMatch[2]
    const link = inner.match(
      /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i
    )
    const text = decodeHtmlEntities(
      (link?.[2] || inner).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    )
    if (!text || text.length > 90) continue
    const key = personKey(text)
    if (!key || key === wingKey || key === sectorKey) continue
    if (/advisory|council|chapter|denim|partner|tba/i.test(text)) continue
    chairName = text
    chairHref = link?.[1] ? localContentHref(link[1]) : null
    break
  }

  const lightbox = html.match(
    /<a\b[^>]*href=["']([^"']+\.(?:jpe?g|png|webp))["'][^>]*>\s*<img\b/i
  )
  const portrait =
    (lightbox?.[1] && isUsableImageUrl(lightbox[1])
      ? normalizeMediaUrl(lightbox[1])
      : null) ||
    usableGallery(page)[0] ||
    (isUsableImageUrl(page.featured_image)
      ? normalizeMediaUrl(page.featured_image)
      : null)

  const ctas: WingCta[] = []
  const ctaRe =
    /<a\b[^>]*href=["']([^"']*)["'][^>]*>\s*(?:<span\b[^>]*>\s*)?([^<]{2,70})\s*(?:<\/span>\s*)?<\/a>/gi
  let match: RegExpExecArray | null
  while ((match = ctaRe.exec(html))) {
    const hrefRaw = (match[1] || "").trim()
    const label = decodeHtmlEntities(match[2].replace(/\s+/g, " ").trim())
    if (!label || /^tba$/i.test(label)) continue
    if (!hrefRaw || hrefRaw === "#" || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(hrefRaw)) {
      continue
    }
    if (/uploads\//i.test(hrefRaw)) continue

    let href = localContentHref(hrefRaw)
    let description: string | undefined
    if (/view chapters|country chairs?/i.test(label)) {
      href = buildChaptersHref({
        branch: "view-chapters",
        role: "country_chair",
        wing: page.slug,
      })
      description = "This wing’s chairs"
    } else if (/advisory/i.test(label)) {
      const slug = slugFromHref(hrefRaw)
      href = getPageBySlug(slug)
        ? contentHref(slug)
        : findWingAdvisoryHref(page.slug, html)
      description = "This wing’s advisory"
    } else if (/denim/i.test(label)) {
      href = buildChaptersHref({
        branch: "denim-partner",
        role: "country_denim",
        wing: page.slug,
      })
      description = "This wing’s Denim partners"
    } else {
      continue
    }

    if (!ctas.some((c) => c.label.toLowerCase() === label.toLowerCase())) {
      ctas.push({ label: toTitleCase(label), href, description })
    }
  }

  const defaults: WingCta[] = [
    {
      label: "View Chapters",
      href: buildChaptersHref({
        branch: "view-chapters",
        role: "country_chair",
        wing: page.slug,
      }),
      description: "This wing’s chairs",
    },
    {
      label: "Advisory Council",
      href: findWingAdvisoryHref(page.slug, html),
      description: "This wing’s advisory",
    },
    {
      label: "Denim Partner",
      href: buildChaptersHref({
        branch: "denim-partner",
        role: "country_denim",
        wing: page.slug,
      }),
      description: "This wing’s Denim partners",
    },
  ]
  for (const item of defaults) {
    const exists = ctas.some(
      (c) =>
        personKey(c.label) === personKey(item.label) ||
        (/chapter/i.test(c.label) && /chapter/i.test(item.label)) ||
        (/advisory/i.test(c.label) && /advisory/i.test(item.label)) ||
        (/denim/i.test(c.label) && /denim/i.test(item.label))
    )
    if (!exists) ctas.push(item)
  }

  let bodyHtml = html
  if (chairName) {
    bodyHtml = bodyHtml.replace(
      new RegExp(
        `<h[1-6]\\b[^>]*>[\\s\\S]*?${chairName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?</h[1-6]>`,
        "gi"
      ),
      ""
    )
  }
  bodyHtml = bodyHtml.replace(
    new RegExp(
      `<h[1-6]\\b[^>]*>[\\s\\S]*?${page.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?</h[1-6]>`,
      "gi"
    ),
    ""
  )
  bodyHtml = bodyHtml.replace(
    new RegExp(
      `<h[1-6]\\b[^>]*>[\\s\\S]*?${sector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?</h[1-6]>`,
      "gi"
    ),
    ""
  )
  bodyHtml = bodyHtml.replace(
    /<a\b[^>]*>\s*(?:<span\b[^>]*>\s*)?(?:View Chapters|Advisory Councils?|Global Advisory Council|Denim Partner|TBA)\s*(?:<\/span>\s*)?<\/a>/gi,
    ""
  )
  bodyHtml = bodyHtml.replace(
    /<div\b[^>]*(?:uc_creative_buttons|ucaddon_creative_buttons)[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi,
    ""
  )
  bodyHtml = bodyHtml.replace(/skip\s*render:\s*[\w.-]+/gi, "")
  bodyHtml = bodyHtml.replace(/<a\b[^>]*>\s*<img\b[^>]*>\s*<\/a>/gi, "")

  const bioHtml = prepareWpHtml(bodyHtml, {
    stripImages: true,
    stripLeadingTitle: page.title,
  })
  const bioText = bioHtml
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return {
    chairName,
    chairHref,
    portrait,
    sector,
    ctas,
    bioHtml: isUselessWingText(bioText, page, chairName) ? "" : bioHtml,
    bioText: isUselessWingText(bioText, page, chairName) ? "" : bioText,
  }
}

function WingPageLayout({ page }: { page: WpPage }) {
  const { chairName, chairHref, portrait, sector, ctas, bioHtml, bioText } =
    parseWingProfile(page)
  const gallery = usableGallery(page).filter((src) => src !== portrait)

  return (
    <div className="w-full">
      <Container className="pt-16 pb-8 md:pt-20 md:pb-10">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
          Global Chair · Wing
        </p>
        <h1 className="mt-3 max-w-4xl font-heading text-4xl font-semibold tracking-tight md:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
          {sector}
        </h1>
        <div className="mt-5 h-px w-20 bg-accent" />
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          Sector leadership within G100 — explore the Global Chair, chapters,
          advisory council, and Denim partners for this wing.
        </p>
      </Container>

      <Container className="pb-16 md:pb-24">
        <div className="overflow-hidden border border-border/80 bg-card">
          <div className="grid lg:grid-cols-[minmax(0,22rem)_1fr]">
            <div className="relative min-h-[22rem] bg-surface-inset lg:min-h-full">
              {portrait ? (
                <MediaImage
                  src={portrait}
                  alt={chairName || sector}
                  className="absolute inset-0 size-full bg-transparent"
                  priority
                  sizes="(max-width: 1024px) 100vw, 22rem"
                  fit="cover"
                />
              ) : (
                <div className="flex size-full min-h-[22rem] items-center justify-center">
                  <SiteBrandLogo size="lg" className="opacity-60" />
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between gap-8 p-6 md:p-8 lg:p-10">
              <div className="space-y-4">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">
                  Global Chair
                </p>
                {chairName ? (
                  chairHref ? (
                    <Link
                      href={chairHref}
                      className="block font-heading text-3xl font-semibold tracking-tight transition-colors hover:text-accent md:text-4xl"
                    >
                      {toTitleCase(chairName)}
                    </Link>
                  ) : (
                    <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
                      {toTitleCase(chairName)}
                    </h2>
                  )
                ) : (
                  <h2 className="font-heading text-3xl font-semibold tracking-tight text-muted-foreground md:text-4xl">
                    Chair profile forthcoming
                  </h2>
                )}
                <p className="text-sm text-muted-foreground md:text-base">
                  Leading the {sector} Wing across G100&apos;s global network.
                </p>
              </div>

              {bioText ? (
                <div
                  className="wp-content max-w-2xl text-[15px] leading-relaxed md:text-base"
                  dangerouslySetInnerHTML={{ __html: bioHtml }}
                />
              ) : null}

              <div className="grid gap-3 sm:grid-cols-3">
                {ctas.map((cta) => (
                  <Link
                    key={cta.label}
                    href={cta.href}
                    className="group relative flex min-h-[5.25rem] flex-col justify-between gap-3 border border-border/90 bg-background p-4 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-accent/55 hover:shadow-[0_18px_40px_-28px_oklch(0.145_0.01_75/0.45)]"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-[2px] bg-transparent transition-colors group-hover:bg-accent"
                    />
                    <span className="font-heading text-lg font-semibold tracking-tight">
                      {cta.label}
                    </span>
                    <span className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                      {cta.description || "Open directory"}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {gallery.length > 0 ? (
          <div className="mt-14 space-y-5">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
                Gallery
              </p>
              <h2 className="mt-2 font-heading text-2xl font-semibold md:text-3xl">
                Wing media
              </h2>
            </div>
            <MediaGallery images={gallery} title={page.title} limit={12} />
          </div>
        ) : null}
      </Container>

      <RelatedFlowSection page={page} />
    </div>
  )
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
}

function personKey(name: string) {
  return decodeHtmlEntities(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function imageStem(src: string) {
  return src
    .split("/")
    .pop()!
    .toLowerCase()
    .replace(/-\d+x\d+(?=\.(jpe?g|png|webp|gif))/i, "")
    .replace(/-scaled(?=\.(jpe?g|png|webp|gif))/i, "")
    .replace(/\.(jpe?g|png|webp|gif).*$/i, "")
    .replace(/[^a-z0-9]+/g, "")
}

function scoreNameToImage(name: string, src: string) {
  const stem = imageStem(src)
  if (!stem) return 0
  const tokens = personKey(name)
    .split(" ")
    .filter(
      (t) =>
        t.length > 2 &&
        !["the", "and", "dr", "he", "mrs", "ms", "miss", "prof"].includes(t)
    )
  if (!tokens.length) return 0
  let score = 0
  for (const token of tokens) {
    if (stem.includes(token)) score += token.length >= 5 ? 3 : 2
  }
  return score
}

type DirectoryChair = {
  name: string
  image: string | null
  bio: string
  moreHref: string | null
  ctas: WingCta[]
}

/** Parse Global Chairs hub HTML into structured profile cards. */
function parseChairDirectory(page: WpPage): DirectoryChair[] {
  let html = page.content_html || ""
  html = html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<\/?link-hover>/gi, "")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "")

  const nameRe =
    /<p[^>]*>\s*<b[^>]*>([^<]{2,90})<\/b>\s*(?:&nbsp;|\s)*<\/p>/gi
  const matches = [...html.matchAll(nameRe)]
  if (matches.length < 3) return []

  const portraits: string[] = []
  const seen = new Set<string>()
  for (const raw of page.images ?? []) {
    if (!isUsableImageUrl(raw)) continue
    const src = normalizeMediaUrl(raw)
    if (/logo|g100-jpeg|front-group|uc_creative|\/thumbs\//i.test(src)) {
      continue
    }
    const key = src
      .toLowerCase()
      .replace(/-\d+x\d+(\.\w+)$/i, "$1")
      .replace(/-scaled(\.\w+)$/i, "$1")
    if (seen.has(key)) continue
    seen.add(key)
    portraits.push(src)
  }

  const usedImages = new Set<string>()
  const chairs: DirectoryChair[] = []

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const name = decodeHtmlEntities(match[1]).replace(/\s+/g, " ").trim()
    if (!name || name.length > 80) continue

    const start = (match.index ?? 0) + match[0].length
    const end = matches[i + 1]?.index ?? html.length
    const chunk = html.slice(start, end)

    const paragraphs = [...chunk.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((p) =>
        decodeHtmlEntities(p[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
      )
      .filter((text) => text && text.toLowerCase() !== name.toLowerCase())

    const bio = paragraphs.slice(0, 3).join("\n\n")

    const moreMatch = chunk.match(
      /<a\b[^>]*href=["']([^"']+)["'][^>]*>\s*View More\s*</i
    )
    const moreHref = moreMatch?.[1]
      ? localContentHref(moreMatch[1])
      : null
    const moreSlug = slugFromHref(moreMatch?.[1] || "")
    const wingFromMore =
      (moreHref?.startsWith("/") &&
      !moreHref.startsWith("/chapters") &&
      !moreHref.startsWith("/denim") &&
      !moreHref.startsWith("/wings") &&
      !moreHref.startsWith("/search") &&
      getPageBySlug(moreHref.replace(/^\//, ""))?.role === "wing"
        ? moreHref.replace(/^\//, "")
        : null) ||
      (getPageBySlug(moreSlug)?.role === "wing" ? moreSlug : null)

    const ctas: WingCta[] = []
    const ctaRe =
      /<a\b[^>]*href=["']([^"']+)["'][^>]*>\s*(View Chapters|Global Advisory Councils|Advisory Councils|Denim Club Partner|Denim Partner)\s*<\/a>/gi
    let ctaMatch: RegExpExecArray | null
    while ((ctaMatch = ctaRe.exec(chunk))) {
      const rawLabel = ctaMatch[2]
      const label =
        rawLabel === "Advisory Councils"
          ? "Global Advisory Councils"
          : rawLabel === "Denim Partner"
            ? "Denim Club Partner"
            : rawLabel
      const targetSlug = slugFromHref(ctaMatch[1])
      const chairsHub = targetSlug.match(/^country-chairs-(.+)$/i)?.[1]
      const linkedWing =
        wingFromMore ||
        (getPageBySlug(targetSlug)?.role === "wing" ? targetSlug : null) ||
        (chairsHub
          ? chairsHub.endsWith("-wing")
            ? chairsHub
            : `${chairsHub}-wing`
          : null)

      let href = localContentHref(ctaMatch[1])
      if (/view chapters/i.test(label) && linkedWing) {
        href = buildChaptersHref({
          branch: "view-chapters",
          role: "country_chair",
          wing: linkedWing,
        })
      } else if (/advisory/i.test(label)) {
        href = getPageBySlug(targetSlug)
          ? contentHref(targetSlug)
          : linkedWing
            ? buildChaptersHref({
                branch: "advisory-council",
                role: "country_advisory",
                wing: linkedWing,
              })
            : href
      } else if (/denim/i.test(label)) {
        href = linkedWing
          ? buildChaptersHref({
              branch: "denim-partner",
              role: "country_denim",
              wing: linkedWing,
            })
          : "/denim-club"
      }
      if (!ctas.some((c) => c.label === label)) ctas.push({ label, href })
    }

    let best: { src: string; score: number } | null = null
    for (const src of portraits) {
      if (usedImages.has(src)) continue
      const score = scoreNameToImage(name, src)
      if (score < 2) continue
      if (!best || score > best.score) best = { src, score }
    }
    if (best) usedImages.add(best.src)

    chairs.push({
      name,
      image: best?.src ?? null,
      bio,
      moreHref,
      ctas,
    })
  }

  return chairs
}

function PortraitGalleryLayout({ page }: { page: WpPage }) {
  const gallery = usableGallery(page)
  const featured =
    page.featured_image && isUsableImageUrl(page.featured_image)
      ? normalizeMediaUrl(page.featured_image)
      : null
  const images = [
    ...(featured && !gallery.includes(featured) ? [featured] : []),
    ...gallery,
  ].filter((src, i, arr) => arr.indexOf(src) === i)

  const eyebrow = /advisory/i.test(page.title)
    ? "Advisory Council"
    : /chair/i.test(page.title)
      ? "Chairs"
      : toTitleCase(page.role.replaceAll("_", " "))

  return (
    <div className="w-full">
      <Container className="pt-20 pb-10">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-accent">
          {eyebrow}
        </p>
        <h1 className="mt-3 w-full max-w-none font-heading text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
          {toTitleCase(page.title)}
        </h1>
        <div className="mt-5 h-px w-20 bg-accent" />
        {page.excerpt ? (
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {toParagraphCase(page.excerpt)}
          </p>
        ) : null}
      </Container>

      <Container className="pb-16 md:pb-24">
        {images.length ? (
          <MediaGallery images={images} title={page.title} limit={48} />
        ) : (
          <ContentArticle page={page} bare showGallery={false} stripImages />
        )}
      </Container>

      <RelatedFlowSection page={page} />
    </div>
  )
}

function ChairDirectoryLayout({ page }: { page: WpPage }) {
  const chairs = parseChairDirectory(page)
  const heroImage =
    page.featured_image && isUsableImageUrl(page.featured_image)
      ? normalizeMediaUrl(page.featured_image)
      : null

  if (!chairs.length) {
    const gallery = usableGallery(page)
    const inlineImageCount = (page.content_html.match(/<img\b/gi) || []).length
    if (gallery.length >= 4 || inlineImageCount >= 6) {
      return <PortraitGalleryLayout page={page} />
    }
    return (
      <div className="w-full">
        <Container className="py-14 md:py-20">
          <ContentArticle page={page} bare showGallery stripImages={false} maxImages={24} />
        </Container>
        <RelatedFlowSection page={page} />
      </div>
    )
  }

  return (
    <div className="w-full">
      {heroImage ? (
        <div className="relative h-[42vh] min-h-72 w-full overflow-hidden md:h-[52vh]">
          <MediaImage
            src={heroImage}
            alt={page.title}
            className="absolute inset-0 size-full"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/15" />
          <Container className="absolute inset-x-0 bottom-0 pb-10 md:pb-14">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-accent">
              Global Chairs
            </p>
            <h1 className="mt-3 w-full max-w-none font-heading text-3xl font-semibold tracking-tight md:text-5xl lg:text-6xl lg:leading-[1.05]">
              {toTitleCase(page.title)}
            </h1>
            <div className="mt-5 h-px w-20 bg-accent" />
          </Container>
        </div>
      ) : (
        <Container className="pt-20 pb-10">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-accent">
            Global Chairs
          </p>
          <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
            {toTitleCase(page.title)}
          </h1>
          <div className="mt-5 h-px w-20 bg-accent" />
        </Container>
      )}

      <Container className="py-12 md:py-16">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
            {chairs.length} featured Global Chairs leading sector wings across
            the G100 network.
          </p>
          <Button variant="outline" asChild>
            <Link href="/wings">Browse all wings →</Link>
          </Button>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
          {chairs.map((chair) => (
            <article
              key={chair.name}
              className="flex flex-col overflow-hidden border border-border/80 bg-card"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-inset">
                {chair.image ? (
                  <MediaImage
                    src={chair.image}
                    alt={toTitleCase(chair.name)}
                    className="absolute inset-0 size-full bg-transparent"
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    fit="contain"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <SiteBrandLogo size="lg" className="opacity-60" />
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-4 p-5 md:p-6">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.16em] text-accent uppercase">
                    Global Chair
                  </p>
                  <h2 className="mt-1.5 font-heading text-2xl font-semibold leading-snug">
                    {chair.moreHref ? (
                      <Link
                        href={chair.moreHref}
                        className="link-accent"
                      >
                        {toTitleCase(chair.name)}
                      </Link>
                    ) : (
                      toTitleCase(chair.name)
                    )}
                  </h2>
                </div>

                {chair.bio ? (
                  <p className="line-clamp-5 text-sm leading-relaxed text-muted-foreground md:text-[15px]">
                    {toParagraphCase(chair.bio)}
                  </p>
                ) : null}

                <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-4">
                  {chair.ctas.map((cta) => (
                    <Button
                      key={cta.label}
                      size="sm"
                      variant={
                        cta.label === "View Chapters" ? "default" : "outline"
                      }
                      asChild
                    >
                      <Link href={cta.href}>{cta.label}</Link>
                    </Button>
                  ))}
                  {chair.moreHref &&
                  !chair.ctas.some((c) => c.href === chair.moreHref) ? (
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={chair.moreHref}>View more →</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </Container>

      <RelatedFlowSection page={page} />
    </div>
  )
}

function PressPageLayout({ page }: { page: WpPage }) {
  const items = parsePressItems(page)
  const heroImage =
    page.featured_image && isUsableImageUrl(page.featured_image)
      ? normalizeMediaUrl(page.featured_image)
      : items.find((item) => isUsableImageUrl(item.image))?.image ||
        items[0]?.image ||
        null

  return (
    <div className="w-full">
      {heroImage ? (
        <div className="relative h-[40vh] min-h-72 w-full overflow-hidden md:h-[48vh]">
          <MediaImage
            src={heroImage}
            alt={page.title}
            className="absolute inset-0 size-full"
            priority
            sizes="100vw"
            allowThumbs
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/15" />
          <Container className="absolute inset-x-0 bottom-0 pb-10 md:pb-14">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-accent">
              Media
            </p>
            <h1 className="mt-3 w-full max-w-none font-heading text-3xl font-semibold tracking-tight md:text-5xl lg:text-6xl lg:leading-[1.05]">
              {toTitleCase(page.title)}
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-muted-foreground md:text-base">
              {items.length} stories featuring G100 leaders, meetings, and
              global impact.
            </p>
            <div className="mt-5 h-px w-20 bg-accent" />
          </Container>
        </div>
      ) : (
        <Container className="pt-20 pb-10">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-accent">
            Media
          </p>
          <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
            {toTitleCase(page.title)}
          </h1>
          <div className="mt-5 h-px w-20 bg-accent" />
        </Container>
      )}

      <Container className="py-12 md:py-16">
        {items.length > 0 ? (
          <PressGrid items={items} />
        ) : (
          <ContentArticle
            page={page}
            bare
            showGallery
            stripImages={false}
            maxImages={48}
          />
        )}
      </Container>

      <RelatedFlowSection page={page} />
    </div>
  )
}

function AwardsPageLayout({ page }: { page: WpPage }) {
  const imagePool = getAwardImagePool()
  const categories = parseAwardCategories(page, imagePool)
  const moments = getAwardMoments()
  const intro = getAwardsIntro(page)
  const heroImage =
    imagePool.find((src) => isUsableImageUrl(src)) ||
    imagePool[0] ||
    null

  return (
    <div className="w-full">
      {heroImage ? (
        <div className="relative h-[40vh] min-h-72 w-full overflow-hidden md:h-[48vh]">
          <MediaImage
            src={heroImage}
            alt={page.title}
            className="absolute inset-0 size-full"
            priority
            sizes="100vw"
            allowThumbs
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/15" />
          <Container className="absolute inset-x-0 bottom-0 pb-10 md:pb-14">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-accent">
              Recognition
            </p>
            <h1 className="mt-3 w-full max-w-none font-heading text-3xl font-semibold tracking-tight md:text-5xl lg:text-6xl lg:leading-[1.05]">
              {toTitleCase(page.title)}
            </h1>
            {intro[0] ? (
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
                {toParagraphCase(intro[0])}
              </p>
            ) : null}
            <div className="mt-5 h-px w-20 bg-accent" />
          </Container>
        </div>
      ) : (
        <Container className="pt-20 pb-10">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-accent">
            Recognition
          </p>
          <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
            {toTitleCase(page.title)}
          </h1>
          <div className="mt-5 h-px w-20 bg-accent" />
        </Container>
      )}

      <Container className="space-y-14 py-12 md:space-y-16 md:py-16">
        {intro[1] ? (
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {toParagraphCase(intro[1])}
          </p>
        ) : null}

        {categories.length > 0 ? (
          <section className="space-y-6">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
                Categories
              </p>
              <h2 className="mt-2 font-heading text-2xl font-semibold md:text-3xl">
                G100 Award categories
              </h2>
            </div>
            <AwardsCategoryGrid items={categories} />
          </section>
        ) : (
          <ContentArticle
            page={page}
            bare
            showGallery={false}
            stripImages
          />
        )}

        {moments.length > 0 ? (
          <section className="space-y-6">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
                Gallery
              </p>
              <h2 className="mt-2 font-heading text-2xl font-semibold md:text-3xl">
                Award moments
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                Related ceremonies and conferences featuring G100 awards.
              </p>
            </div>
            <AwardsMomentsGrid items={moments} />
          </section>
        ) : null}
      </Container>

      <RelatedFlowSection page={page} />
    </div>
  )
}

/** Full-width article layout used by content pages */
export function ContentPageLayout({ page }: { page: WpPage }) {
  if (page.role === "wing") {
    return <WingPageLayout page={page} />
  }

  if (page.slug === "press") {
    return <PressPageLayout page={page} />
  }

  if (page.slug === "awards") {
    return <AwardsPageLayout page={page} />
  }

  if (page.role === "global_chair" || page.slug === "g100-global-chairs-and-chapters") {
    return <ChairDirectoryLayout page={page} />
  }

  const gallery = usableGallery(page)
  const heroImage =
    page.featured_image && isUsableImageUrl(page.featured_image)
      ? page.featured_image
      : gallery[0] || null

  const inlineImageCount = (page.content_html.match(/<img\b/gi) || []).length
  const isPortraitDirectory =
    inlineImageCount >= 6 && page.slug !== "press"
  const isAdvisoryGallery =
    /^global-advisory-councils-/i.test(page.slug) ||
    (inlineImageCount >= 6 && /advisory/i.test(page.title))

  if (isAdvisoryGallery && parseChairDirectory(page).length === 0) {
    return <PortraitGalleryLayout page={page} />
  }

  if (isPortraitDirectory) {
    return <ChairDirectoryLayout page={page} />
  }

  return (
    <div className="w-full">
      {heroImage ? (
        <div className="relative h-[48vh] min-h-80 w-full overflow-hidden md:h-[58vh]">
          <MediaImage
            src={heroImage}
            alt={page.title}
            className="absolute inset-0 size-full"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/10" />
          <Container className="absolute inset-x-0 bottom-0 pb-12 md:pb-16">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-accent">
              {toTitleCase(page.role.replaceAll("_", " "))}
            </p>
            <h1 className="mt-3 w-full max-w-none font-heading text-3xl font-semibold tracking-tight md:text-5xl lg:text-6xl lg:leading-[1.05]">
              {toTitleCase(page.title)}
            </h1>
            <div className="mt-5 h-px w-20 bg-accent" />
          </Container>
        </div>
      ) : (
        <Container className="pt-20 pb-10">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-accent">
            {toTitleCase(page.role.replaceAll("_", " "))}
          </p>
          <h1 className="mt-3 w-full max-w-none font-heading text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
            {toTitleCase(page.title)}
          </h1>
          <div className="mt-5 h-px w-20 bg-accent" />
        </Container>
      )}

      <Container className="py-14 md:py-20">
        <div className="w-full max-w-none">
          <ContentArticle
            page={page}
            bare
            showGallery={gallery.length > 8}
            stripImages={false}
            maxImages={16}
            excludeImageUrls={heroImage ? [heroImage] : undefined}
          />
        </div>
      </Container>

      <RelatedFlowSection page={page} />
    </div>
  )
}
