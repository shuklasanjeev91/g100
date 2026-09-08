import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"

import { SiteBrandLogo } from "@/components/site-brand-logo"
import { Button } from "@/components/ui/button"
import { normalizeMediaUrl } from "@/lib/media-url"
import { SITE } from "@/lib/site"
import { toParagraphCase, toTitleCase } from "@/lib/text-case"
import { cn } from "@/lib/utils"

export function Container({
  children,
  className,
  size = "wide",
}: {
  children: ReactNode
  className?: string
  size?: "wide" | "narrow" | "full"
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-none px-4 text-left sm:px-6 lg:px-8 lg:text-justify xl:px-10 2xl:px-12",
        size === "narrow" && "max-w-[72rem]",
        className
      )}
    >
      {children}
    </div>
  )
}

export function Section({
  children,
  className,
  id,
  tone = "default",
}: {
  children: ReactNode
  className?: string
  id?: string
  tone?: "default" | "muted" | "ink" | "band"
}) {
  return (
    <section
      id={id}
      className={cn(
        "w-full",
        tone === "default" && "bg-transparent",
        tone === "muted" && "bg-muted/60",
        tone === "ink" && "bg-primary text-primary-foreground",
        tone === "band" && "border-y border-border/80 bg-secondary/50",
        className
      )}
    >
      {children}
    </section>
  )
}

type Cta = {
  label: string
  href: string
  variant?: "default" | "brand" | "outline" | "ghost"
}

function isUsableHeroImage(src?: string | null) {
  if (!src) return false
  const lower = src.toLowerCase()
  return !(
    lower.includes("logo") ||
    lower.includes("favicon") ||
    lower.endsWith(".svg")
  )
}

export function PageHero({
  eyebrow,
  title,
  description,
  image,
  actions,
  children,
  compact = false,
}: {
  eyebrow?: string
  title: string
  description?: string
  image?: string | null
  actions?: Cta[]
  children?: ReactNode
  compact?: boolean
}) {
  const heroImage = isUsableHeroImage(image) ? normalizeMediaUrl(image) : null

  return (
    <section
      className={cn(
        "relative isolate w-full overflow-hidden bg-primary text-primary-foreground",
        compact
          ? "min-h-[36vh] lg:min-h-[42vh]"
          : "min-h-[44vh] sm:min-h-[52vh] lg:min-h-[64vh]"
      )}
    >
      {heroImage ? (
        <Image
          src={heroImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="animate-g100-ken object-cover opacity-40"
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_10%,oklch(0.72_0.11_80/0.32),transparent_50%),radial-gradient(ellipse_at_90%_90%,oklch(0.28_0.02_75/0.55),transparent_55%)]"
        />
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.06]"
      >
        <SiteBrandLogo
          size="xl"
          className="!size-[min(70vw,28rem)] !max-h-[28rem] !max-w-[28rem]"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-primary/40" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/60 to-transparent" />
      <Container
        className={cn(
          "relative flex flex-col justify-end",
          compact
            ? "pb-10 pt-16 lg:pb-14 lg:pt-24"
            : "pb-12 pt-16 sm:pb-14 lg:pb-24 lg:pt-28"
        )}
      >
        {eyebrow ? (
          <p className="animate-g100-rise text-[11px] font-semibold tracking-[0.18em] text-accent">
            {toTitleCase(eyebrow)}
          </p>
        ) : null}
        <h1 className="animate-g100-rise-delay mt-2 w-full max-w-none font-heading text-[1.85rem] font-semibold tracking-tight sm:mt-3 sm:text-5xl md:text-6xl lg:text-[4.25rem] lg:leading-[1.05]">
          {toTitleCase(title)}
        </h1>
        <div className="animate-g100-line mt-4 h-px w-16 bg-accent lg:mt-5 lg:w-24" />
        {description ? (
          <p className="animate-g100-rise-delay-2 mt-4 w-full max-w-4xl text-[0.95rem] leading-relaxed text-primary-foreground/78 sm:mt-5 sm:text-lg md:text-xl">
            {toParagraphCase(description)}
          </p>
        ) : null}
        {actions?.length ? (
          <div className="animate-g100-rise-delay-2 mt-6 flex w-full flex-col gap-2.5 sm:mt-8 sm:w-auto sm:flex-row sm:flex-wrap lg:gap-3">
            {actions.map((action, index) => {
              const variant =
                action.variant === "outline"
                  ? "outline"
                  : action.variant === "ghost"
                    ? "ghost"
                    : action.variant === "default"
                      ? "default"
                      : index === 0
                        ? "brand"
                        : "outline"
              return (
                <Button
                  key={action.href + action.label}
                  size="lg"
                  variant={variant}
                  className={cn(
                    "h-12 w-full lg:h-11 lg:w-auto",
                    variant === "outline" &&
                      "border-primary-foreground/35 bg-transparent text-primary-foreground hover:border-primary-foreground/55 hover:bg-primary-foreground/10 hover:text-primary-foreground",
                    variant === "ghost" &&
                      "text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  )}
                  asChild
                >
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              )
            })}
          </div>
        ) : null}
        {children}
      </Container>
    </section>
  )
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-4 lg:mb-14 lg:flex-row lg:items-end lg:justify-between lg:gap-6",
        className
      )}
    >
      <div className="w-full max-w-none space-y-3 lg:space-y-4">
        {eyebrow ? (
          <p className="text-[11px] font-semibold tracking-[0.18em] text-accent">
            {toTitleCase(eyebrow)}
          </p>
        ) : null}
        <h2 className="font-heading text-[1.65rem] font-semibold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl lg:leading-[1.12]">
          {toTitleCase(title)}
        </h2>
        {description ? (
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg">
            {toParagraphCase(description)}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function ContentGrid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4 2xl:grid-cols-5",
        className
      )}
    >
      {children}
    </div>
  )
}

export function PageBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex w-full flex-1 flex-col", className)}>{children}</div>
  )
}

export function FormSplit({
  brand,
  children,
  className,
}: {
  brand: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid overflow-hidden border border-border bg-card lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]",
        className
      )}
    >
      <aside className="relative isolate bg-primary p-8 text-primary-foreground sm:p-10 lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_10%,oklch(0.72_0.11_80/0.22),transparent_52%)]"
        />
        <div className="relative h-full">{brand}</div>
      </aside>
      <div className="bg-card p-8 sm:p-10 lg:p-12">{children}</div>
    </div>
  )
}
