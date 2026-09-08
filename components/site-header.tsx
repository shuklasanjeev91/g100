"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Suspense } from "react"
import {
  ChevronDownIcon,
  MenuIcon,
} from "lucide-react"

import { HeaderSearch } from "@/components/header-search"
import { SiteBrandLogo } from "@/components/site-brand-logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { primaryNav, SITE } from "@/lib/site"
import { toTitleCase } from "@/lib/text-case"
import { cn } from "@/lib/utils"

function isActive(pathname: string, href: string) {
  const base = href.split("#")[0]
  if (base === "/") return pathname === "/"
  return pathname === base || pathname.startsWith(`${base}/`)
}

function SearchFallback({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-9 min-w-0 flex-1 border border-primary-foreground/20 bg-primary-foreground/5",
        className
      )}
    />
  )
}

function MobileMenu({ pathname }: { pathname: string }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 shrink-0 rounded-full text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          aria-label="Open menu"
        >
          <MenuIcon className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[min(100%,22rem)] border-border bg-background text-foreground"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="sr-only">{SITE.name}</SheetTitle>
          <SheetDescription className="text-left">
            {SITE.tagline}
          </SheetDescription>
          <SiteBrandLogo size="md" />
        </SheetHeader>
        <nav className="flex flex-col gap-1 overflow-y-auto px-4 pb-10">
          {primaryNav.map((item) => (
            <div key={item.href + item.label} className="space-y-1">
              <Button
                variant={isActive(pathname, item.href) ? "secondary" : "ghost"}
                className="h-11 w-full justify-start rounded-xl text-base"
                asChild
              >
                <Link href={item.href}>{toTitleCase(item.label)}</Link>
              </Button>
              {item.children?.map((child) => (
                <Button
                  key={child.href + child.label}
                  variant="ghost"
                  size="sm"
                  className="h-10 w-full justify-start rounded-lg pl-6 text-muted-foreground"
                  asChild
                >
                  <Link href={child.href}>{toTitleCase(child.label)}</Link>
                </Button>
              ))}
            </div>
          ))}
          <Button className="mt-4 h-12 w-full" size="lg" variant="brand" asChild>
            <Link href="/country-club/join">Join G100</Link>
          </Button>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">Appearance</span>
            <ThemeToggle />
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}

/** Compact native-style app bar — phones & tablets */
function MobileAppHeader({ pathname }: { pathname: string }) {
  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-accent/30 bg-primary text-primary-foreground lg:hidden"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex h-14 items-center gap-2 px-2 sm:px-3">
        <Link
          href="/"
          className="flex h-11 shrink-0 items-center py-1"
          aria-label="G100 home"
        >
          <SiteBrandLogo
            size="header"
            priority
            className="h-full max-h-11 w-auto"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Suspense
            fallback={
              <SearchFallback className="h-9 w-full border-primary-foreground/25 bg-primary-foreground/5" />
            }
          >
            <HeaderSearch className="h-9 w-full min-w-0 border-primary-foreground/25 bg-primary-foreground/5 text-primary-foreground placeholder:text-primary-foreground/45 [&_input]:text-primary-foreground [&_input]:placeholder:text-primary-foreground/45" />
          </Suspense>
        </div>
        <MobileMenu pathname={pathname} />
      </div>
    </header>
  )
}

/** Full desktop / large-screen web app header */
function DesktopWebHeader({ pathname }: { pathname: string }) {
  return (
    <header className="sticky top-0 z-50 hidden w-full border-b border-accent/35 bg-primary text-primary-foreground lg:block">
      <div className="mx-auto flex h-16 w-full max-w-none items-stretch gap-3 px-4 xl:px-6 2xl:px-8">
        <Link
          href="/"
          className="flex h-full shrink-0 items-center py-1"
          aria-label="G100 home"
        >
          <SiteBrandLogo
            size="header"
            priority
            className="h-full max-h-14 w-auto"
          />
        </Link>

        <nav className="flex shrink-0 items-center gap-0.5">
          {primaryNav.map((item) =>
            item.children?.length ? (
              <DropdownMenu key={item.label}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-9 gap-1 px-2.5 text-[11px] font-semibold tracking-[0.12em] text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground",
                      isActive(pathname, item.href) &&
                        "bg-primary-foreground/12 text-accent hover:text-accent"
                    )}
                  >
                    {toTitleCase(item.label)}
                    <ChevronDownIcon className="size-3.5 opacity-55" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="min-w-64 border-border/80 bg-background p-2 text-foreground"
                >
                  {item.children.map((child) => (
                    <DropdownMenuItem
                      key={child.href + child.label}
                      asChild
                      className="cursor-pointer rounded-md px-3 py-2.5"
                    >
                      <Link
                        href={child.href}
                        className="flex flex-col items-start gap-0.5"
                      >
                        <span className="text-sm font-medium">
                          {toTitleCase(child.label)}
                        </span>
                        {child.description ? (
                          <span className="text-xs text-muted-foreground">
                            {child.description}
                          </span>
                        ) : null}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                key={item.label}
                variant="ghost"
                size="sm"
                asChild
                className={cn(
                  "h-9 px-2.5 text-[11px] font-semibold tracking-[0.12em] text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground",
                  isActive(pathname, item.href) &&
                    "bg-primary-foreground/12 text-accent hover:text-accent"
                )}
              >
                <Link href={item.href}>{toTitleCase(item.label)}</Link>
              </Button>
            )
          )}
        </nav>

        <div className="flex min-w-0 flex-1 items-center px-2">
          <Suspense
            fallback={
              <SearchFallback className="h-9 w-full border-primary-foreground/25 bg-primary-foreground/5" />
            }
          >
            <HeaderSearch className="h-9 w-full min-w-0 border-primary-foreground/25 bg-primary-foreground/5 text-primary-foreground placeholder:text-primary-foreground/45 [&_input]:text-primary-foreground [&_input]:placeholder:text-primary-foreground/45" />
          </Suspense>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <ThemeToggle className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" />
          <Button size="sm" variant="brand" className="h-9 px-4" asChild>
            <Link href="/country-club/join">Join</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

export function SiteHeader() {
  const pathname = usePathname()

  return (
    <>
      <MobileAppHeader pathname={pathname} />
      <DesktopWebHeader pathname={pathname} />
    </>
  )
}
