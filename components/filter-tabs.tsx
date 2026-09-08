"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowUpRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type FilterTabItem = {
  id: string
  label: string
  href: string
  meta?: string
  count?: number
}

export type FilterTabGroup = {
  id: string
  label?: string
  /** Navigate here when the group tab is clicked (e.g. chapters URL). */
  href?: string
  items: FilterTabItem[]
}

type FilterTabsProps = {
  groups: FilterTabGroup[]
  /** Active role / item id (highlights a card) */
  activeId?: string
  /** Active group / branch id (selects which cards show) */
  activeGroupId?: string
  eyebrow?: string
  description?: string
  className?: string
  /**
   * matrix — group tabs + related role cards
   * rail — compact underline tabs for in-page jumps
   */
  variant?: "matrix" | "rail"
}

function MatrixItem({
  item,
  active,
}: {
  item: FilterTabItem
  active: boolean
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex min-h-[5.5rem] flex-col justify-between gap-4 border bg-card p-5 transition-[border-color,background-color,box-shadow,transform] duration-200",
        "hover:-translate-y-0.5 hover:border-accent/55 hover:shadow-[0_18px_40px_-28px_oklch(0.145_0.01_75/0.55)]",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        active
          ? "border-accent bg-primary text-primary-foreground shadow-[0_18px_40px_-28px_oklch(0.145_0.01_75/0.65)]"
          : "border-border/90"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-[2px] transition-colors",
          active ? "bg-accent" : "bg-transparent group-hover:bg-accent/70"
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "font-heading text-xl font-semibold leading-snug tracking-tight md:text-[1.35rem]",
            active ? "text-primary-foreground" : "text-foreground"
          )}
        >
          {item.label}
        </p>
        <ArrowUpRightIcon
          className={cn(
            "mt-1 size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
            active
              ? "text-accent"
              : "text-muted-foreground/70 group-hover:text-accent"
          )}
        />
      </div>

      <div
        className={cn(
          "flex items-center justify-between gap-3 text-[11px] font-semibold tracking-[0.14em] uppercase",
          active ? "text-primary-foreground/60" : "text-muted-foreground"
        )}
      >
        <span className="truncate">
          {item.meta || (item.count != null ? "Profiles" : "Directory")}
        </span>
        {item.count != null ? (
          <span className="tabular-nums tracking-normal text-accent">
            {item.count}
          </span>
        ) : null}
      </div>
    </Link>
  )
}

function RailItem({
  item,
  active,
}: {
  item: FilterTabItem
  active: boolean
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative inline-flex shrink-0 items-baseline gap-2 px-1 pb-3 text-sm font-semibold tracking-wide transition-colors",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <span>{item.label}</span>
      {item.count != null ? (
        <span
          className={cn(
            "text-[11px] font-semibold tabular-nums tracking-normal",
            active ? "text-accent" : "text-muted-foreground/80"
          )}
        >
          {item.count}
        </span>
      ) : null}
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-accent transition-transform duration-200",
          active ? "scale-x-100" : "group-hover:scale-x-100"
        )}
      />
    </Link>
  )
}

function groupTabClass(active: boolean) {
  return cn(
    "relative shrink-0 px-1 pb-3 text-sm font-semibold tracking-wide transition-colors",
    "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
    active
      ? "text-foreground"
      : "text-muted-foreground hover:text-foreground"
  )
}

export function FilterTabs({
  groups,
  activeId,
  activeGroupId,
  eyebrow,
  description,
  className,
  variant = "matrix",
}: FilterTabsProps) {
  const groupFromItem = groups.find((group) =>
    group.items.some((item) => item.id === activeId)
  )
  const initialGroupId =
    activeGroupId || groupFromItem?.id || groups[0]?.id || ""

  const [groupId, setGroupId] = useState(initialGroupId)

  useEffect(() => {
    if (activeGroupId) {
      setGroupId(activeGroupId)
      return
    }
    if (activeId) {
      const match = groups.find((group) =>
        group.items.some((item) => item.id === activeId)
      )
      if (match) setGroupId(match.id)
    }
  }, [activeGroupId, activeId, groups])

  if (variant === "rail") {
    const items = groups.flatMap((group) => group.items)
    return (
      <div
        className={cn("space-y-4", className)}
        role="navigation"
        aria-label={eyebrow || "Filters"}
      >
        {eyebrow ? (
          <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
            {eyebrow}
          </p>
        ) : null}
        <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div
            role="tablist"
            className="flex min-w-max items-end gap-6 border-b border-border/80"
          >
            {items.map((item) => (
              <RailItem
                key={item.id}
                item={item}
                active={activeId === item.id}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const activeGroup =
    groups.find((group) => group.id === groupId) ?? groups[0] ?? null

  return (
    <div
      className={cn("space-y-8", className)}
      role="navigation"
      aria-label={eyebrow || "Directories"}
    >
      {(eyebrow || description) && (
        <div className="max-w-2xl space-y-3">
          {eyebrow ? (
            <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
              {eyebrow}
            </p>
          ) : null}
          {description ? (
            <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
              {description}
            </p>
          ) : null}
        </div>
      )}

      <div className="space-y-6">
        <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div
            role="tablist"
            aria-label="Directory groups"
            className="flex min-w-max items-end gap-6 border-b border-border/80 md:gap-8"
          >
            {groups.map((group) => {
              const active = group.id === activeGroup?.id
              const label = group.label || group.id
              const className = groupTabClass(active)
              const indicator = (
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-accent transition-transform duration-200",
                    active ? "scale-x-100" : "group-hover:scale-x-100"
                  )}
                />
              )

              if (group.href) {
                return (
                  <Link
                    key={group.id}
                    href={group.href}
                    role="tab"
                    aria-selected={active}
                    className={cn("group", className)}
                  >
                    {label}
                    {indicator}
                  </Link>
                )
              }

              return (
                <button
                  key={group.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setGroupId(group.id)}
                  className={cn("group", className)}
                >
                  {label}
                  {indicator}
                </button>
              )
            })}
          </div>
        </div>

        {activeGroup ? (
          <div
            role="tabpanel"
            aria-label={activeGroup.label || activeGroup.id}
            className={cn(
              "grid gap-3 animate-in fade-in-0 duration-200",
              activeGroup.items.length === 1
                ? "sm:max-w-sm"
                : activeGroup.items.length === 2
                  ? "sm:grid-cols-2"
                  : "sm:grid-cols-2 lg:grid-cols-3"
            )}
          >
            {activeGroup.items.map((item) => (
              <MatrixItem
                key={item.id}
                item={item}
                active={activeId === item.id}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Compact underline tabs for in-page section jumps. */
export function FilterTabRail({
  items,
  activeId,
  eyebrow,
  className,
}: {
  items: FilterTabItem[]
  activeId?: string
  eyebrow?: string
  className?: string
  size?: "default" | "compact"
}) {
  return (
    <FilterTabs
      groups={[{ id: "all", items }]}
      activeId={activeId}
      eyebrow={eyebrow}
      className={className}
      variant="rail"
    />
  )
}
