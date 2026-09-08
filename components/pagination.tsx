import Link from "next/link"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function Pagination({
  page,
  totalPages,
  hrefForPage,
  className,
}: {
  page: number
  totalPages: number
  hrefForPage: (page: number) => string
  className?: string
}) {
  if (totalPages <= 1) return null

  const prev = page > 1 ? page - 1 : null
  const next = page < totalPages ? page + 1 : null

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        className
      )}
    >
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        {prev ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={hrefForPage(prev)}>Previous</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
        )}
        {next ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={hrefForPage(next)}>Next</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        )}
      </div>
    </div>
  )
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  return {
    page: safePage,
    totalPages,
    total: items.length,
    items: items.slice(start, start + pageSize),
  }
}
