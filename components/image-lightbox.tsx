"use client"

import Image from "next/image"
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
} from "react"
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { Button } from "@/components/ui/button"
import { normalizeMediaUrl } from "@/lib/media-url"
import { cn } from "@/lib/utils"

export type LightboxItem = {
  src: string
  alt: string
  caption?: string
}

type ImageLightboxProps = {
  items: LightboxItem[]
  index: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onIndexChange: (index: number) => void
}

export function ImageLightbox({
  items,
  index,
  open,
  onOpenChange,
  onIndexChange,
}: ImageLightboxProps) {
  const titleId = useId()
  const descriptionId = useId()
  const safeIndex = items.length
    ? ((index % items.length) + items.length) % items.length
    : 0
  const current = items[safeIndex]
  const hasMultiple = items.length > 1

  const goPrev = useCallback(() => {
    if (!hasMultiple) return
    onIndexChange((safeIndex - 1 + items.length) % items.length)
  }, [hasMultiple, items.length, onIndexChange, safeIndex])

  const goNext = useCallback(() => {
    if (!hasMultiple) return
    onIndexChange((safeIndex + 1) % items.length)
  }, [hasMultiple, items.length, onIndexChange, safeIndex])

  const touchStartX = useRef<number | null>(null)

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!open) return
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      goPrev()
    } else if (event.key === "ArrowRight") {
      event.preventDefault()
      goNext()
    }
  })

  useEffect(() => {
    if (!open) return
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open])

  if (!current) return null

  const src = normalizeMediaUrl(current.src) || current.src

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/88 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
        <DialogPrimitive.Content
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className={cn(
            "fixed inset-0 z-50 flex flex-col outline-none",
            "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          )}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onTouchStart={(event) => {
            touchStartX.current = event.changedTouches[0]?.clientX ?? null
          }}
          onTouchEnd={(event) => {
            const start = touchStartX.current
            touchStartX.current = null
            if (start == null || !hasMultiple) return
            const end = event.changedTouches[0]?.clientX
            if (end == null) return
            const delta = end - start
            if (Math.abs(delta) < 56) return
            if (delta > 0) goPrev()
            else goNext()
          }}
        >
          <DialogPrimitive.Title id={titleId} className="sr-only">
            {current.caption || current.alt || "Image preview"}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description id={descriptionId} className="sr-only">
            {hasMultiple
              ? `Image ${safeIndex + 1} of ${items.length}. Use arrow keys to navigate.`
              : "Press Escape to close."}
          </DialogPrimitive.Description>

          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 p-3 sm:p-4">
            <p className="pointer-events-auto rounded-md bg-black/45 px-3 py-1.5 text-xs font-medium tracking-wide text-white/85 tabular-nums backdrop-blur-sm">
              {hasMultiple ? `${safeIndex + 1} / ${items.length}` : "Preview"}
            </p>
            <DialogPrimitive.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="pointer-events-auto size-10 rounded-full border border-white/15 bg-black/45 text-white hover:bg-black/65 hover:text-white"
                aria-label="Close lightbox"
              >
                <XIcon className="size-5" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 py-16 sm:px-16 sm:py-20">
            {hasMultiple ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 z-10 size-11 rounded-full border border-white/15 bg-black/45 text-white hover:bg-black/65 hover:text-white sm:left-4"
                  onClick={goPrev}
                  aria-label="Previous image"
                >
                  <ChevronLeftIcon className="size-6" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 z-10 size-11 rounded-full border border-white/15 bg-black/45 text-white hover:bg-black/65 hover:text-white sm:right-4"
                  onClick={goNext}
                  aria-label="Next image"
                >
                  <ChevronRightIcon className="size-6" />
                </Button>
              </>
            ) : null}

            <div className="relative h-full w-full max-h-[min(82vh,56rem)] max-w-[min(96vw,72rem)]">
              <Image
                key={src}
                src={src}
                alt={current.alt}
                fill
                sizes="100vw"
                priority
                className="object-contain"
                unoptimized={
                  src.endsWith(".svg") || src.includes("/elementor/thumbs/")
                }
              />
            </div>
          </div>

          {(current.caption || hasMultiple) && (
            <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 to-transparent px-4 pt-10 pb-5 sm:px-6">
              <p className="mx-auto max-w-3xl truncate text-center text-sm text-white/90">
                {current.caption || current.alt}
              </p>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/** Controlled open helpers for gallery grids. */
export function useImageLightbox(items: LightboxItem[]) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)

  const openAt = useCallback(
    (nextIndex: number) => {
      if (!items.length) return
      setIndex(Math.max(0, Math.min(nextIndex, items.length - 1)))
      setOpen(true)
    },
    [items.length]
  )

  return {
    open,
    index,
    openAt,
    onOpenChange: setOpen,
    onIndexChange: setIndex,
    lightboxProps: {
      items,
      index,
      open,
      onOpenChange: setOpen,
      onIndexChange: setIndex,
    } satisfies ImageLightboxProps,
  }
}
