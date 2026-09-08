"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react"
import { LoaderCircleIcon, SearchIcon } from "lucide-react"

import { MediaImage } from "@/components/media-gallery"
import { useRealtimeSearch } from "@/hooks/use-realtime-search"
import { toTitleCase } from "@/lib/text-case"
import { cn } from "@/lib/utils"
import { contentHref } from "@/lib/content-href"

type HeaderSearchProps = {
  className?: string
  size?: "sm" | "md"
}

type FlatHit =
  | { kind: "page"; id: string; href: string; title: string; role?: string; image?: string | null }
  | { kind: "media"; id: string; href: string; title: string; image?: string | null }
  | { kind: "more"; id: string; href: string; title: string }

export function HeaderSearch({ className, size = "sm" }: HeaderSearchProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [value, setValue] = useState("")
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const { results, media, loading, deferredQuery } = useRealtimeSearch(value, {
    debounceMs: 180,
    limit: 6,
    mediaLimit: 4,
    minLength: 2,
  })

  const flatHits: FlatHit[] = []
  if (deferredQuery.length >= 2) {
    for (const hit of results) {
      flatHits.push({
        kind: "page",
        id: `page-${hit.id}`,
        href: contentHref(hit.slug),
        title: hit.title,
        role: hit.role,
        image: hit.featured_image,
      })
    }
    for (const hit of media) {
      flatHits.push({
        kind: "media",
        id: `media-${hit.id}`,
        href: hit.url,
        title: hit.title || hit.slug || "Media",
        image: hit.url,
      })
    }
    if (flatHits.length > 0 || (!loading && deferredQuery)) {
      flatHits.push({
        kind: "more",
        id: "more",
        href: `/search?q=${encodeURIComponent(value.trim())}`,
        title: `Search all for “${value.trim()}”`,
      })
    }
  }

  const showPanel =
    open && value.trim().length >= 2 && (loading || flatHits.length > 0)

  useEffect(() => {
    setActiveIndex(-1)
  }, [deferredQuery])

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [])

  function go(href: string, external = false) {
    setOpen(false)
    if (external) {
      window.open(href, "_blank", "noopener,noreferrer")
      return
    }
    startTransition(() => {
      router.push(href)
    })
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const q = value.trim()
    if (activeIndex >= 0 && flatHits[activeIndex]) {
      const hit = flatHits[activeIndex]
      go(hit.href, hit.kind === "media")
      return
    }
    // One Enter → open the best match instead of an intermediate results page
    const best =
      flatHits.find((hit) => hit.kind === "page") ||
      flatHits.find((hit) => hit.kind === "media")
    if (best) {
      go(best.href, best.kind === "media")
      return
    }
    go(q ? `/search?q=${encodeURIComponent(q)}` : "/search")
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showPanel && event.key !== "Escape") return

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((i) => Math.min(i + 1, flatHits.length - 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (event.key === "Escape") {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <form
        role="search"
        onSubmit={onSubmit}
        className={cn(
          "flex min-w-0 items-center border border-border/80 bg-background",
          size === "sm" && "h-9",
          size === "md" && "h-11",
          className
        )}
      >
        <label className="sr-only" htmlFor="site-search-input">
          Search G100
        </label>
        <span className="pointer-events-none pl-2.5 text-current opacity-50">
          {loading ? (
            <LoaderCircleIcon className="size-3.5 animate-spin" />
          ) : (
            <SearchIcon className="size-3.5" />
          )}
        </span>
        <input
          id="site-search-input"
          type="search"
          name="q"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search…"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showPanel}
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-${flatHits[activeIndex]?.id}` : undefined
          }
          className={cn(
            "h-full w-full min-w-0 bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground",
            size === "md" && "px-3 text-[15px]"
          )}
        />
      </form>

      {showPanel ? (
        <div
          id={listId}
          role="listbox"
          className="absolute top-[calc(100%+6px)] right-0 left-0 z-[60] overflow-hidden border border-border bg-background text-foreground shadow-[0_24px_48px_-28px_oklch(0.145_0.01_75/0.55)]"
        >
          {loading && flatHits.length <= 1 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Searching…</p>
          ) : null}

          {results.length > 0 ? (
            <div className="border-b border-border">
              <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Pages
              </p>
              <ul className="pb-1">
                {results.map((hit) => {
                  const id = `page-${hit.id}`
                  const index = flatHits.findIndex((row) => row.id === id)
                  const active = index === activeIndex
                  return (
                    <li key={id} role="option" aria-selected={active} id={`${listId}-${id}`}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                          active ? "bg-muted" : "hover:bg-muted/60"
                        )}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => go(contentHref(hit.slug))}
                      >
                        {hit.featured_image ? (
                          <div className="relative size-9 shrink-0 overflow-hidden bg-surface-inset">
                            <MediaImage
                              src={hit.featured_image}
                              alt=""
                              className="absolute inset-0 size-full bg-transparent"
                              sizes="36px"
                              fit="cover"
                            />
                          </div>
                        ) : (
                          <div className="size-9 shrink-0 bg-secondary" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {toTitleCase(hit.title)}
                          </span>
                          {hit.role ? (
                            <span className="block truncate text-[11px] text-muted-foreground capitalize">
                              {hit.role.replace(/_/g, " ")}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {media.length > 0 ? (
            <div className="border-b border-border">
              <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Media
              </p>
              <ul className="grid grid-cols-4 gap-1.5 px-3 pb-2.5">
                {media.map((hit) => {
                  const id = `media-${hit.id}`
                  const index = flatHits.findIndex((row) => row.id === id)
                  const active = index === activeIndex
                  return (
                    <li key={id} role="option" aria-selected={active} id={`${listId}-${id}`}>
                      <button
                        type="button"
                        className={cn(
                          "relative aspect-square w-full overflow-hidden bg-surface-inset ring-offset-background transition",
                          active && "ring-2 ring-accent"
                        )}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => go(hit.url, true)}
                        title={hit.title || hit.slug}
                      >
                        <MediaImage
                          src={hit.url}
                          alt={hit.title || ""}
                          className="absolute inset-0 size-full bg-transparent"
                          sizes="80px"
                          fit="cover"
                        />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {!loading && results.length === 0 && media.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              No matches for “{value.trim()}”.
            </p>
          ) : null}

          <Link
            href={`/search?q=${encodeURIComponent(value.trim())}`}
            id={`${listId}-more`}
            role="option"
            aria-selected={
              flatHits.findIndex((row) => row.id === "more") === activeIndex
            }
            className={cn(
              "block px-3 py-2.5 text-sm font-medium text-accent transition-colors",
              flatHits.findIndex((row) => row.id === "more") === activeIndex
                ? "bg-muted"
                : "hover:bg-muted/60"
            )}
            onMouseEnter={() =>
              setActiveIndex(flatHits.findIndex((row) => row.id === "more"))
            }
            onClick={() => setOpen(false)}
          >
            View all results →
          </Link>
        </div>
      ) : null}
    </div>
  )
}
