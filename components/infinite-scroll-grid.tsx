"use client"

import {
  Fragment,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils"

export function InfiniteScrollGrid<T>({
  items,
  pageSize = 12,
  initialCount,
  getKey,
  renderItem,
  className,
  endLabel,
  contained = false,
  maxHeightClassName = "max-h-[70vh]",
  resetKey,
}: {
  items: readonly T[]
  /** Items added each time the user scrolls to the end. */
  pageSize?: number
  /** First paint size (defaults to pageSize). Keep small on home sections. */
  initialCount?: number
  getKey: (item: T, index: number) => string | number
  renderItem: (item: T, index: number) => ReactNode
  className?: string
  endLabel?: string
  /** When true, scroll within a capped panel so page sections below stay reachable. */
  contained?: boolean
  maxHeightClassName?: string
  /** Change this when the item set identity changes (filters, roles, queries). */
  resetKey?: string | number
}) {
  const startCount = Math.min(initialCount ?? pageSize, items.length)
  const [visibleCount, setVisibleCount] = useState(startCount)
  const rootRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const busyRef = useRef(false)
  /** Require sentinel to leave view before the next auto-load (one page per scroll). */
  const armedRef = useRef(true)

  const loadMore = useEffectEvent(() => {
    if (busyRef.current) return
    if (visibleCount >= items.length) return
    busyRef.current = true
    armedRef.current = false
    setVisibleCount((count) => Math.min(count + pageSize, items.length))
    queueMicrotask(() => {
      busyRef.current = false
    })
  })

  const listKey = resetKey ?? "default"

  useEffect(() => {
    setVisibleCount(Math.min(initialCount ?? pageSize, items.length))
    armedRef.current = true
    if (contained && rootRef.current) {
      rootRef.current.scrollTop = 0
    }
  }, [items.length, pageSize, initialCount, listKey, contained])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || visibleCount >= items.length) return

    const root = contained ? rootRef.current : null

    // Contained panels that do not yet overflow keep the sentinel "visible",
    // which would eagerly load the entire list. Wait until the panel scrolls.
    if (contained && root && root.scrollHeight <= root.clientHeight + 4) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        if (!entry.isIntersecting) {
          armedRef.current = true
          return
        }
        if (!armedRef.current) return
        loadMore()
      },
      {
        root,
        // Small margin — avoid filling the whole viewport in one go
        rootMargin: contained ? "80px 0px" : "120px 0px",
        threshold: 0.01,
      }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [visibleCount, items.length, contained, listKey])

  const shown = items.slice(0, visibleCount)
  const hasMore = visibleCount < items.length

  return (
    <div
      ref={rootRef}
      className={cn(
        contained &&
          cn(
            "overflow-y-auto overscroll-contain border border-border/70 bg-card/40 pr-1",
            maxHeightClassName
          )
      )}
    >
      <div className={cn(contained && "p-4 md:p-5", className)}>
        {shown.map((item, index) => (
          <Fragment key={getKey(item, index)}>
            {renderItem(item, index)}
          </Fragment>
        ))}
      </div>

      {hasMore ? (
        <div
          ref={sentinelRef}
          className="flex flex-col items-center gap-3 py-8"
          aria-live="polite"
        >
          <span className="h-px w-16 animate-pulse bg-accent/60" />
          <span className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Scroll for more · {visibleCount} of {items.length}
          </span>
          <button
            type="button"
            onClick={() => {
              armedRef.current = true
              loadMore()
            }}
            className="mt-1 border border-border bg-background px-4 py-2 text-[11px] font-semibold tracking-[0.16em] text-foreground uppercase transition-colors hover:border-accent/50 hover:bg-secondary/60"
          >
            Load more
          </button>
        </div>
      ) : items.length > 0 ? (
        <p
          className={cn(
            "text-center text-sm text-muted-foreground",
            contained ? "px-4 pb-6 md:px-5" : "mt-8"
          )}
        >
          {endLabel ?? `Showing all ${items.length}`}
        </p>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No items to show.
        </p>
      )}
    </div>
  )
}
