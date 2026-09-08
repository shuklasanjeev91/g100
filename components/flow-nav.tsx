"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { FLOW_STEPS } from "@/lib/flow"
import { cn } from "@/lib/utils"

function activeStepId(pathname: string) {
  if (pathname.startsWith("/about")) return "about"
  if (pathname.startsWith("/president")) return "president"
  if (pathname.startsWith("/wings")) return "chair"
  if (pathname.startsWith("/chapters")) return "chapters"
  if (pathname.startsWith("/country-club") || pathname.startsWith("/join"))
    return "country-club"
  if (pathname.startsWith("/denim-club")) return "denim-club"
  if (pathname.startsWith("/meetings")) return "meetings"
  return null
}

export function FlowStepper({ className }: { className?: string }) {
  const pathname = usePathname()
  const active = activeStepId(pathname)
  const activeIndex = FLOW_STEPS.findIndex((s) => s.id === active)

  return (
    <nav
      aria-label="G100 organization flow"
      className={cn(
        "w-full border-b border-border/80 bg-background/90 backdrop-blur-md",
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-none gap-1 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8 xl:px-10">
        {FLOW_STEPS.map((step, index) => {
          const isActive = step.id === active
          const isPast = activeIndex >= 0 && index < activeIndex
          return (
            <Link
              key={step.id}
              href={step.href}
              className={cn(
                "group relative flex min-w-[9.5rem] flex-1 flex-col rounded-md border px-3 py-2.5 transition-colors",
                isActive
                  ? "border-accent/70 bg-accent/10 text-foreground shadow-xs"
                  : isPast
                    ? "border-border bg-muted/50 text-foreground"
                    : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
              )}
            >
              <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="mt-0.5 text-sm font-medium">{step.label}</span>
              <span className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                {step.note}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function FlowContinue({
  current,
}: {
  current: (typeof FLOW_STEPS)[number]["id"]
}) {
  const index = FLOW_STEPS.findIndex((s) => s.id === current)
  const next = index >= 0 ? FLOW_STEPS[index + 1] : undefined
  const prev = index > 0 ? FLOW_STEPS[index - 1] : undefined
  if (!next && !prev) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-10">
      {prev ? (
        <Button variant="link" className="link-muted h-auto px-0 text-sm" asChild>
          <Link href={prev.href}>← {prev.label}</Link>
        </Button>
      ) : (
        <span />
      )}
      {next ? (
        <Button variant="brand" size="lg" asChild>
          <Link href={next.href}>Continue to {next.label} →</Link>
        </Button>
      ) : null}
    </div>
  )
}
