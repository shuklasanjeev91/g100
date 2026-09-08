"use client"

import { useState } from "react"
import Link from "next/link"

import { MediaImage } from "@/components/media-gallery"
import { SiteBrandLogo } from "@/components/site-brand-logo"
import { isUsableImageUrl, normalizeMediaUrl } from "@/lib/media-url"
import { toTitleCase } from "@/lib/text-case"
import { contentHref } from "@/lib/content-href"

export type PageCardData = {
  id: number
  title: string
  slug: string
  url?: string
  featured_image?: string | null
  /** Gallery fallback when featured_image is missing (common in Supabase sync) */
  images?: string[] | null
}

function resolveImage(page: PageCardData): string | null {
  const candidates = [
    page.featured_image,
    ...(page.images ?? []),
  ].filter(Boolean) as string[]
  for (const src of candidates) {
    if (!isUsableImageUrl(src)) continue
    const normalized = normalizeMediaUrl(src)
    if (normalized.toLowerCase().includes("logo")) continue
    return normalized
  }
  return null
}

export function PageCard({
  page,
  href,
}: {
  page: PageCardData
  href?: string
}) {
  const link = href ?? contentHref(page.slug)
  const resolved = resolveImage(page)
  const [failed, setFailed] = useState(false)
  const image = failed ? null : resolved

  return (
    <Link
      href={link}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground transition-all duration-500 hover:border-accent/40 hover:shadow-[0_24px_48px_-32px_oklch(0.145_0.01_75/0.45)] lg:rounded-none"
    >
      <div className="relative overflow-hidden bg-surface-inset">
        {image ? (
          <MediaImage
            src={image}
            alt={toTitleCase(page.title)}
            className="aspect-[16/10] bg-transparent"
            sizes="(max-width: 768px) 100vw, 25vw"
            fit="cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex aspect-[16/10] items-center justify-center bg-secondary">
            <SiteBrandLogo size="md" className="opacity-70" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between gap-4 p-5 md:p-6">
        <p className="line-clamp-3 font-heading text-xl font-semibold leading-snug transition-colors duration-300 group-hover:text-accent md:text-[1.35rem]">
          {toTitleCase(page.title)}
        </p>
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">
          View
          <span
            aria-hidden
            className="transition-transform duration-300 group-hover:translate-x-1"
          >
            →
          </span>
        </span>
      </div>
    </Link>
  )
}
