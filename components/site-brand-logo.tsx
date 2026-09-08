import Image from "next/image"

import { SITE } from "@/lib/site"
import { cn } from "@/lib/utils"

type SiteBrandLogoProps = {
  className?: string
  /** Visual size of the rendered mark */
  size?: "sm" | "md" | "lg" | "xl" | "header"
  priority?: boolean
  alt?: string
}

const SIZE_MAP = {
  sm: { width: 36, height: 36, className: "size-9" },
  md: { width: 48, height: 48, className: "size-12" },
  lg: { width: 64, height: 64, className: "size-16" },
  xl: { width: 80, height: 80, className: "size-20" },
  /** Wide mark for app bars — natural aspect, fills header height */
  header: { width: 200, height: 162, className: "h-full w-auto" },
} as const

/** Official G100 brand mark fetched from g100.in */
export function SiteBrandLogo({
  className,
  size = "md",
  priority = false,
  alt = SITE.name,
}: SiteBrandLogoProps) {
  const dim = SIZE_MAP[size]

  return (
    <Image
      src={SITE.logo}
      alt={alt}
      width={dim.width}
      height={dim.height}
      className={cn(
        "object-contain object-center",
        dim.className,
        className
      )}
      priority={priority}
    />
  )
}
