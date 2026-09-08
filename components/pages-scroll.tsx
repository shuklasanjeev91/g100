"use client"

import { InfiniteScrollGrid } from "@/components/infinite-scroll-grid"
import { PageCard, type PageCardData } from "@/components/page-card"

export function PagesScroll({
  pages,
  pageSize = 24,
  initialCount,
  contained = false,
  resetKey,
  endLabel,
  className = "grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  maxHeightClassName = "max-h-[min(72vh,52rem)]",
}: {
  pages: PageCardData[]
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
      items={pages}
      pageSize={pageSize}
      initialCount={initialCount}
      getKey={(page) => page.id}
      className={className}
      endLabel={endLabel ?? `All ${pages.length} items`}
      contained={contained}
      maxHeightClassName={maxHeightClassName}
      resetKey={resetKey}
      renderItem={(page) => <PageCard page={page} />}
    />
  )
}
