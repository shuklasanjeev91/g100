"use client"

import { ExternalLinkIcon } from "lucide-react"

import { InfiniteScrollGrid } from "@/components/infinite-scroll-grid"
import { MediaImage } from "@/components/media-gallery"
import { SiteBrandLogo } from "@/components/site-brand-logo"
import type { PressItem } from "@/lib/press"
import { toTitleCase } from "@/lib/text-case"
import { cn } from "@/lib/utils"

function PressCard({ item }: { item: PressItem }) {
  return (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
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
          {item.source}
        </p>
        <h3 className="font-heading text-lg font-semibold leading-snug transition-colors group-hover:text-accent md:text-xl">
          {toTitleCase(item.title)}
        </h3>
        <span className="mt-auto inline-flex items-center gap-2 pt-1 text-[11px] font-semibold tracking-[0.14em] text-accent uppercase">
          Read article
          <ExternalLinkIcon className="size-3.5 opacity-80 transition-transform duration-300 group-hover:translate-x-0.5" />
        </span>
      </div>
    </a>
  )
}

export function PressGrid({
  items,
  className,
}: {
  items: PressItem[]
  className?: string
}) {
  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No press coverage listed yet.
      </p>
    )
  }

  return (
    <InfiniteScrollGrid
      items={items}
      pageSize={12}
      initialCount={12}
      getKey={(item) => item.id}
      className={cn(
        "grid gap-5 sm:grid-cols-2 xl:grid-cols-3",
        className
      )}
      endLabel={`All ${items.length} press stories`}
      renderItem={(item) => <PressCard item={item} />}
    />
  )
}
