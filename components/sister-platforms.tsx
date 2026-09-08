import Image from "next/image"
import Link from "next/link"

import {
  SISTER_PLATFORMS,
  type SisterPlatform,
} from "@/lib/platforms"
import { toParagraphCase, toTitleCase } from "@/lib/text-case"
import { cn } from "@/lib/utils"

function needsDarkPlate(id: SisterPlatform["id"]) {
  return id === "all" || id === "wicci" || id === "g100"
}

export function PlatformLogo({
  platform,
  className,
  size = "md",
}: {
  platform: SisterPlatform | SisterPlatform["id"]
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  const item =
    typeof platform === "string"
      ? SISTER_PLATFORMS.find((p) => p.id === platform)
      : platform
  if (!item) return null

  const box =
    size === "sm"
      ? "h-10 w-28"
      : size === "lg"
        ? "h-16 w-44"
        : "h-12 w-36"

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden",
        box,
        needsDarkPlate(item.id) ? "bg-black" : "bg-transparent",
        className
      )}
    >
      <Image
        src={item.logo}
        alt={`${item.name} logo`}
        fill
        sizes={size === "lg" ? "176px" : size === "sm" ? "112px" : "144px"}
        className={cn(
          "object-contain object-center p-1.5",
          item.id === "sheconomy" && "p-0.5",
          item.id === "wef" && "p-0.5"
        )}
      />
    </span>
  )
}

export function SisterPlatformsGrid({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
        className
      )}
    >
      {SISTER_PLATFORMS.map((platform) => (
        <Link
          key={platform.id}
          href={platform.href}
          target="_blank"
          rel="noreferrer"
          className="group flex flex-col border border-border bg-background p-5 transition-colors hover:border-accent/50 hover:bg-secondary/40 md:p-6"
        >
          <div
            className={cn(
              "flex h-[4.5rem] items-center justify-center border border-border/70 px-3",
              needsDarkPlate(platform.id) ? "bg-black" : "bg-muted/50"
            )}
          >
            <PlatformLogo
              platform={platform}
              size="md"
              className="h-12 w-full max-w-[10rem] bg-transparent"
            />
          </div>
          {!compact ? (
            <>
              <p className="mt-5 font-heading text-2xl font-semibold transition-colors group-hover:text-accent">
                {platform.name}
              </p>
              <p className="mt-2 text-xs font-semibold tracking-[0.12em] text-accent">
                {toTitleCase(platform.focus)}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {toParagraphCase(platform.body)}
              </p>
            </>
          ) : (
            <p className="mt-4 text-center text-sm font-semibold tracking-wide">
              {platform.name}
            </p>
          )}
        </Link>
      ))}
    </div>
  )
}

export function SisterPlatformsStrip({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-4 md:gap-8",
        className
      )}
    >
      {SISTER_PLATFORMS.map((platform) => (
        <Link
          key={platform.id}
          href={platform.href}
          target="_blank"
          rel="noreferrer"
          className="opacity-90 transition-opacity hover:opacity-100"
          title={platform.name}
          aria-label={platform.name}
        >
          <PlatformLogo platform={platform} size="sm" />
        </Link>
      ))}
    </div>
  )
}
