"use client"

import { PagesScroll } from "@/components/pages-scroll"
import type { PageCardData } from "@/components/page-card"

/** @deprecated Prefer PagesScroll — kept for existing home imports. */
export function MeetingsScroll({
  meetings,
  pageSize = 12,
  initialCount,
  contained = false,
}: {
  meetings: PageCardData[]
  pageSize?: number
  initialCount?: number
  contained?: boolean
}) {
  return (
    <PagesScroll
      pages={meetings}
      pageSize={pageSize}
      initialCount={initialCount}
      contained={contained}
      endLabel={`All ${meetings.length} meetings`}
    />
  )
}
