"use client"

import { ChairCard } from "@/components/chair-card"
import { InfiniteScrollGrid } from "@/components/infinite-scroll-grid"

export type NetworkChairCard = {
  id: number
  name: string
  wing: string
  slug: string
  image: string | null
  href: string
}

export function NetworkChairsScroll({
  chairs,
  pageSize = 12,
  initialCount,
  contained = false,
  resetKey,
  endLabel,
  className = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  maxHeightClassName = "max-h-[min(72vh,52rem)]",
}: {
  chairs: NetworkChairCard[]
  pageSize?: number
  initialCount?: number
  contained?: boolean
  resetKey?: string | number
  endLabel?: string
  className?: string
  maxHeightClassName?: string
}) {
  return (
    <InfiniteScrollGrid
      items={chairs}
      pageSize={pageSize}
      initialCount={initialCount}
      getKey={(chair) => chair.id}
      className={className}
      endLabel={endLabel ?? `All ${chairs.length} Global Chairs`}
      contained={contained}
      maxHeightClassName={maxHeightClassName}
      resetKey={resetKey}
      renderItem={(chair) => <ChairCard chair={chair} />}
    />
  )
}
