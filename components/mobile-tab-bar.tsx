"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarDaysIcon,
  HomeIcon,
  LayersIcon,
  NetworkIcon,
  SparklesIcon,
} from "lucide-react"

import { mobileTabNav } from "@/lib/site"
import { cn } from "@/lib/utils"

const ICONS = {
  "/": HomeIcon,
  "/wings": LayersIcon,
  "/chapters": NetworkIcon,
  "/meetings": CalendarDaysIcon,
  "/country-club/join": SparklesIcon,
} as const

function isTabActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function MobileTabBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/95 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="grid w-full grid-cols-5 px-1 pt-1.5 pb-1">
        {mobileTabNav.map((item) => {
          const Icon = ICONS[item.href as keyof typeof ICONS] ?? HomeIcon
          const active = isTabActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-md px-1 transition-colors",
                active
                  ? "text-accent"
                  : "text-muted-foreground active:bg-muted/60"
              )}
            >
              {active ? (
                <span
                  aria-hidden
                  className="absolute top-0 h-0.5 w-8 rounded-full bg-accent"
                />
              ) : null}
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full transition-colors",
                  active && "bg-accent/15"
                )}
              >
                <Icon
                  className={cn("size-[1.15rem]", active && "stroke-[2.25]")}
                  aria-hidden
                />
              </span>
              <span className="text-[10px] font-semibold tracking-wide">
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
