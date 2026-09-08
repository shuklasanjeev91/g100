"use client"

import Image from "next/image"

import { ImageLightbox, useImageLightbox } from "@/components/image-lightbox"
import {
  isDisplayableImageUrl,
  isUsableImageUrl,
  normalizeMediaUrl,
} from "@/lib/media-url"
import { cn } from "@/lib/utils"

export function MediaImage({
  src,
  alt,
  className,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
  fit = "cover",
  onError,
  allowThumbs = false,
}: {
  src: string
  alt: string
  className?: string
  priority?: boolean
  sizes?: string
  /** cover crops to fill; contain shows the full image */
  fit?: "cover" | "contain"
  onError?: () => void
  /** Allow Elementor thumb URLs (Press cards). */
  allowThumbs?: boolean
}) {
  const normalized = normalizeMediaUrl(src)
  if (
    !normalized ||
    !isDisplayableImageUrl(normalized, { allowThumbs })
  ) {
    return null
  }

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <Image
        src={normalized}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        className={
          fit === "contain" ? "object-contain object-center" : "object-cover"
        }
        unoptimized={
          normalized.endsWith(".svg") ||
          normalized.includes("/elementor/thumbs/")
        }
        onError={onError}
      />
    </div>
  )
}

export function MediaGallery({
  images,
  title,
  limit = 60,
}: {
  images: string[]
  title: string
  limit?: number
}) {
  const items = images
    .map((src) => normalizeMediaUrl(src))
    .filter((src): src is string => Boolean(src) && isUsableImageUrl(src))
    .slice(0, limit)
    .map((src) => ({
      src,
      alt: `${title} media`,
      caption: title,
    }))

  const lightbox = useImageLightbox(items)

  if (!items.length) return null

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <button
            key={item.src}
            type="button"
            onClick={() => lightbox.openAt(index)}
            className="group block w-full overflow-hidden border border-border text-left transition-[border-color,box-shadow] hover:border-accent/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
            aria-label={`Open image ${index + 1} of ${items.length}`}
          >
            <MediaImage
              src={item.src}
              alt={item.alt}
              className="aspect-[4/3] bg-surface-inset transition-opacity group-hover:opacity-90"
              fit="contain"
            />
          </button>
        ))}
      </div>
      <ImageLightbox {...lightbox.lightboxProps} />
    </>
  )
}
