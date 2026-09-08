import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Equal cells with a continuous outer border.
 * Avoids the gap-px + overflow-hidden trick that clips the trailing edge
 * when column widths don't divide evenly.
 */
export function BorderGrid({
  children,
  className,
  cols = "sm:grid-cols-2 lg:grid-cols-4",
}: {
  children: ReactNode
  className?: string
  cols?: string
}) {
  return (
    <div className={cn("grid", cols, className)}>{children}</div>
  )
}

export function BorderGridCell({
  children,
  className,
  id,
}: {
  children: ReactNode
  className?: string
  id?: string
}) {
  return (
    <div
      id={id}
      className={cn(
        "-mb-px -mr-px border border-border bg-background p-6 md:p-7",
        className
      )}
    >
      {children}
    </div>
  )
}
