import Image from "next/image"
import Link from "next/link"

import { SiteBrandLogo } from "@/components/site-brand-logo"
import { normalizeMediaUrl } from "@/lib/media-url"
import { toTitleCase } from "@/lib/text-case"
import { cn } from "@/lib/utils"

export type ChairCardData = {
  id: number
  name: string
  wing: string
  slug: string
  image: string | null
  href: string
}

export function ChairCard({
  chair,
  className,
}: {
  chair: ChairCardData
  className?: string
}) {
  const image = normalizeMediaUrl(chair.image)

  return (
    <Link
      href={chair.href}
      className={cn(
        "group grid grid-cols-2 overflow-hidden rounded-2xl border border-accent/35 bg-primary text-primary-foreground transition-colors hover:border-accent lg:rounded-none",
        className
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-primary/90">
        {image ? (
          <Image
            src={image}
            alt={toTitleCase(chair.name)}
            fill
            sizes="(max-width: 768px) 45vw, 16vw"
            className="object-contain object-center p-1"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-secondary/20">
            <SiteBrandLogo size="md" className="opacity-70" />
          </div>
        )}
      </div>
      <div className="flex flex-col justify-between gap-3 p-3 sm:p-4">
        <SiteBrandLogo size="sm" className="opacity-80" />
        <div>
          <p className="font-heading text-sm font-semibold leading-snug text-accent sm:text-base md:text-[1.05rem]">
            {toTitleCase(chair.name)}
          </p>
          <p className="mt-1.5 text-[10px] font-semibold tracking-[0.12em] text-primary-foreground/55">
            Global Chair
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-snug text-primary-foreground/80 sm:text-[13px]">
            {toTitleCase(chair.wing)}
          </p>
        </div>
      </div>
    </Link>
  )
}
