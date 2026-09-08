"use client"

import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { InfiniteScrollGrid } from "@/components/infinite-scroll-grid"
import { MediaImage } from "@/components/media-gallery"
import { SiteBrandLogo } from "@/components/site-brand-logo"
import type { AwardCategory, AwardMoment } from "@/lib/awards"
import { toParagraphCase, toTitleCase } from "@/lib/text-case"
import { cn } from "@/lib/utils"

function AwardCategoryCard({ item }: { item: AwardCategory }) {
  return (
    <article className="group flex flex-col overflow-hidden border border-border/80 bg-card transition-all duration-300 hover:border-accent/45 hover:shadow-[0_24px_48px_-32px_oklch(0.145_0.01_75/0.45)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-inset">
        {item.image ? (
          <MediaImage
            src={item.image}
            alt={item.title}
            className="absolute inset-0 size-full bg-transparent transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            fit="cover"
            allowThumbs
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <SiteBrandLogo size="md" className="opacity-60" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5 md:p-6">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-accent uppercase">
          Award category
        </p>
        <h3 className="font-heading text-lg font-semibold leading-snug md:text-xl">
          {toTitleCase(item.title)}
        </h3>
        <p className="line-clamp-5 text-sm leading-relaxed text-muted-foreground">
          {toParagraphCase(item.description)}
        </p>
      </div>
    </article>
  )
}

function AwardMomentCard({ item }: { item: AwardMoment }) {
  return (
    <Link
      href={item.href}
      className="group flex flex-col overflow-hidden border border-border/80 bg-card transition-all duration-300 hover:border-accent/45 hover:shadow-[0_24px_48px_-32px_oklch(0.145_0.01_75/0.45)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-inset">
        {item.image ? (
          <MediaImage
            src={item.image}
            alt={item.title}
            className="absolute inset-0 size-full bg-transparent transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            fit="cover"
            allowThumbs
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <SiteBrandLogo size="md" className="opacity-60" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5 md:p-6">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-accent uppercase">
          Award moment
        </p>
        <h3 className="font-heading text-lg font-semibold leading-snug transition-colors group-hover:text-accent md:text-xl">
          {toTitleCase(item.title)}
        </h3>
        {item.excerpt ? (
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {toParagraphCase(item.excerpt)}
          </p>
        ) : null}
        <span className="mt-auto inline-flex items-center gap-2 pt-1 text-[11px] font-semibold tracking-[0.14em] text-accent uppercase">
          View
          <ArrowRightIcon className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}

export function AwardsCategoryGrid({
  items,
  className,
}: {
  items: AwardCategory[]
  className?: string
}) {
  if (!items.length) return null
  return (
    <div
      className={cn(
        "grid gap-5 sm:grid-cols-2 xl:grid-cols-3",
        className
      )}
    >
      {items.map((item) => (
        <AwardCategoryCard key={item.id} item={item} />
      ))}
    </div>
  )
}

export function AwardsMomentsGrid({
  items,
  className,
}: {
  items: AwardMoment[]
  className?: string
}) {
  if (!items.length) return null
  return (
    <InfiniteScrollGrid
      items={items}
      pageSize={9}
      initialCount={9}
      getKey={(item) => item.id}
      className={cn("grid gap-5 sm:grid-cols-2 xl:grid-cols-3", className)}
      endLabel={`All ${items.length} award moments`}
      renderItem={(item) => <AwardMomentCard item={item} />}
    />
  )
}
