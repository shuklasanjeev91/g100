"use client"

import { ImageLightbox, useImageLightbox } from "@/components/image-lightbox"
import { InfiniteScrollGrid } from "@/components/infinite-scroll-grid"
import { MediaImage } from "@/components/media-gallery"

export type MediaScrollItem = {
  id: number
  title: string
  slug: string
  url: string
}

export function MediaScroll({
  items,
  pageSize = 48,
  contained = false,
  resetKey,
  endLabel,
  className = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8",
  maxHeightClassName = "max-h-[min(72vh,52rem)]",
}: {
  items: MediaScrollItem[]
  pageSize?: number
  contained?: boolean
  resetKey?: string | number
  endLabel?: string
  className?: string
  maxHeightClassName?: string
}) {
  const lightboxItems = items.map((item) => ({
    src: item.url,
    alt: item.title || item.slug,
    caption: item.title || item.slug,
  }))
  const lightbox = useImageLightbox(lightboxItems)

  return (
    <>
      <InfiniteScrollGrid
        items={items}
        pageSize={pageSize}
        getKey={(item) => item.id}
        className={className}
        endLabel={endLabel ?? `All ${items.length} media items`}
        contained={contained}
        maxHeightClassName={maxHeightClassName}
        resetKey={resetKey}
        renderItem={(item, index) => (
          <button
            type="button"
            onClick={() => lightbox.openAt(index)}
            className="group w-full overflow-hidden border border-border/70 bg-card text-left transition-[border-color,box-shadow] hover:border-accent/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
            aria-label={`Open ${item.title || item.slug}`}
          >
            <MediaImage
              src={item.url}
              alt={item.title || item.slug}
              className="aspect-square bg-surface-inset transition-opacity group-hover:opacity-90"
              sizes="(max-width: 768px) 50vw, 12vw"
              fit="contain"
            />
          </button>
        )}
      />
      <ImageLightbox {...lightbox.lightboxProps} />
    </>
  )
}
