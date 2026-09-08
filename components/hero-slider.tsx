"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useEffectEvent, useRef, useState } from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PauseIcon,
  PlayIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Container } from "@/components/page-shell"
import { SiteBrandLogo } from "@/components/site-brand-logo"
import { normalizeMediaUrl } from "@/lib/media-url"
import { SITE } from "@/lib/site"
import { toTitleCase } from "@/lib/text-case"
import { cn } from "@/lib/utils"

export type HeroChairSlide = {
  id: number
  name: string
  wing: string
  image: string
  href: string
}

const INTERVAL_MS = 5500

export function HeroSlider({
  chairs,
  className,
}: {
  chairs: readonly HeroChairSlide[]
  className?: string
}) {
  const items = chairs.filter((c) => Boolean(c.image))
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [progressKey, setProgressKey] = useState(0)
  const touchX = useRef<number | null>(null)

  const go = useEffectEvent((next: number) => {
    if (!items.length) return
    const len = items.length
    setIndex(((next % len) + len) % len)
    setProgressKey((k) => k + 1)
  })

  useEffect(() => {
    if (!playing || items.length < 2) return
    const id = window.setInterval(() => go(index + 1), INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [playing, items.length, index])

  if (!items.length) return null

  const active = items[index]
  const visible = new Set(
    [index - 1, index, index + 1].map((i) => {
      const len = items.length
      return ((i % len) + len) % len
    })
  )

  return (
    <section
      className={cn(
        "relative isolate min-h-[100svh] w-full overflow-hidden bg-primary text-primary-foreground",
        className
      )}
      aria-roledescription="carousel"
      aria-label="G100 Global Chairs"
      onTouchStart={(e) => {
        touchX.current = e.changedTouches[0]?.clientX ?? null
      }}
      onTouchEnd={(e) => {
        const start = touchX.current
        const end = e.changedTouches[0]?.clientX
        touchX.current = null
        if (start == null || end == null) return
        const delta = end - start
        if (Math.abs(delta) < 48) return
        go(delta < 0 ? index + 1 : index - 1)
      }}
    >
      {items.map((chair, i) => {
        if (!visible.has(i)) return null
        const src = normalizeMediaUrl(chair.image)
        return (
          <div
            key={chair.id}
            className={cn(
              "absolute inset-0 transition-[opacity,transform] duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
              i === index
                ? "scale-100 opacity-100"
                : "scale-[1.04] opacity-0"
            )}
            aria-hidden={i !== index}
          >
            <Image
              src={src}
              alt=""
              fill
              priority={i === 0 || i === index}
              sizes="100vw"
              className={cn(
                "object-cover object-[center_18%]",
                i === index && "animate-g100-ken"
              )}
            />
          </div>
        )
      })}

      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-primary via-primary/78 to-primary/25 md:via-primary/68 md:to-transparent"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-primary from-[12%] via-primary/55 via-[45%] to-transparent"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-primary/80 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[min(42%,28rem)] bg-[radial-gradient(ellipse_at_0%_60%,oklch(0.72_0.11_80/0.14),transparent_70%)]"
      />

      <Container className="relative flex min-h-[100svh] flex-col justify-end pb-14 pt-28 md:pb-16 md:pt-32">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-20">
          <div className="w-full max-w-none lg:max-w-[min(100%,48rem)]">
            <div className="animate-g100-rise flex items-center gap-4">
              <SiteBrandLogo
                size="lg"
                priority
                className="size-14 drop-shadow-sm md:size-16"
              />
              <div>
                <p className="font-heading text-3xl font-semibold tracking-tight text-accent sm:text-4xl md:text-[2.75rem] md:leading-none">
                  {SITE.name}
                </p>
                <p className="mt-1.5 text-[11px] font-medium tracking-[0.2em] text-primary-foreground/60 uppercase">
                  {SITE.tagline}
                </p>
              </div>
            </div>

            <div className="animate-g100-rise-delay mt-10 flex items-center gap-3">
              <span className="h-px w-8 bg-accent/80" />
              <p className="text-[11px] font-semibold tracking-[0.2em] text-accent">
                Global Chair
              </p>
            </div>

            <h1
              key={`name-${active.id}`}
              className="animate-g100-rise mt-4 font-heading text-4xl font-semibold tracking-tight text-primary-foreground sm:text-5xl md:text-6xl lg:text-[4.5rem] lg:leading-[1.02]"
            >
              {toTitleCase(active.name)}
            </h1>

            <div className="animate-g100-line mt-5 h-px w-28 bg-accent" />

            <p
              key={`wing-${active.id}`}
              className="animate-g100-rise-delay mt-5 max-w-2xl text-base leading-relaxed text-primary-foreground/80 sm:text-lg md:text-xl"
            >
              {toTitleCase(active.wing)}
            </p>

            <div className="animate-g100-rise-delay-2 mt-9 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-3">
              <Button
                size="lg"
                variant="brand"
                className="h-12 w-full shadow-[0_12px_32px_-16px_oklch(0.72_0.11_80/0.65)] lg:w-auto"
                asChild
              >
                <Link href={active.href}>View Profile</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-full border-primary-foreground/35 bg-primary-foreground/5 text-primary-foreground backdrop-blur-sm hover:border-accent/50 hover:bg-primary-foreground/10 hover:text-primary-foreground lg:w-auto"
                asChild
              >
                <Link href="/wings">All Global Chairs</Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-start gap-5 lg:items-end">
            <p className="font-heading text-6xl font-medium tracking-tight text-primary-foreground/20 tabular-nums md:text-7xl">
              {String(index + 1).padStart(2, "0")}
              <span className="text-3xl text-primary-foreground/30">
                {" "}
                / {String(items.length).padStart(2, "0")}
              </span>
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous chair"
                className="inline-flex size-11 items-center justify-center rounded-full border border-primary-foreground/20 bg-primary/40 text-primary-foreground backdrop-blur-md transition-all hover:border-accent/55 hover:bg-primary/60 lg:rounded-none"
                onClick={() => go(index - 1)}
              >
                <ChevronLeftIcon className="size-5" />
              </button>
              <button
                type="button"
                aria-label={playing ? "Pause slideshow" : "Play slideshow"}
                className="inline-flex size-11 items-center justify-center rounded-full border border-accent/45 bg-accent/20 text-accent backdrop-blur-md transition-all hover:bg-accent/30 lg:rounded-none"
                onClick={() => setPlaying((p) => !p)}
              >
                {playing ? (
                  <PauseIcon className="size-4" />
                ) : (
                  <PlayIcon className="size-4" />
                )}
              </button>
              <button
                type="button"
                aria-label="Next chair"
                className="inline-flex size-11 items-center justify-center rounded-full border border-primary-foreground/20 bg-primary/40 text-primary-foreground backdrop-blur-md transition-all hover:border-accent/55 hover:bg-primary/60 lg:rounded-none"
                onClick={() => go(index + 1)}
              >
                <ChevronRightIcon className="size-5" />
              </button>
            </div>

            {items.length > 1 && items.length <= 12 ? (
              <div
                className="hidden items-center gap-1.5 lg:flex"
                role="tablist"
                aria-label="Select chair slide"
              >
                {items.map((chair, i) => (
                  <button
                    key={chair.id}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={`Show ${chair.name}`}
                    className={cn(
                      "h-1.5 transition-all duration-300",
                      i === index
                        ? "w-7 bg-accent"
                        : "w-1.5 bg-primary-foreground/30 hover:bg-primary-foreground/55"
                    )}
                    onClick={() => go(i)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-10 h-px w-full overflow-hidden bg-primary-foreground/15">
          <div
            key={progressKey}
            className={cn(
              "h-full origin-left bg-accent",
              playing ? "animate-g100-progress" : "w-0"
            )}
            style={{ animationDuration: `${INTERVAL_MS}ms` }}
          />
        </div>

        <div className="animate-g100-fade mt-8 flex items-center gap-3 text-[10px] font-semibold tracking-[0.22em] text-primary-foreground/45 uppercase">
          <span className="relative flex h-8 w-px overflow-hidden bg-primary-foreground/20">
            <span className="absolute inset-x-0 top-0 h-3 animate-g100-scroll-cue bg-accent" />
          </span>
          Scroll
        </div>
      </Container>

      <span className="sr-only" aria-live="polite">
        {active.name}, Global Chair, {active.wing}. Slide {index + 1} of{" "}
        {items.length}.
      </span>
    </section>
  )
}
