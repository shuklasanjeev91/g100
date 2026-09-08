"use client"

import Link from "next/link"
import { FormEvent, useEffect, useState } from "react"
import { LoaderCircleIcon } from "lucide-react"

import { InfiniteScrollGrid } from "@/components/infinite-scroll-grid"
import { MediaImage } from "@/components/media-gallery"
import { MediaScroll } from "@/components/media-scroll"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useRealtimeSearch } from "@/hooks/use-realtime-search"
import { toParagraphCase, toTitleCase } from "@/lib/text-case"
import { cn } from "@/lib/utils"
import { contentHref } from "@/lib/content-href"

export type SearchHit = {
  id: number
  title: string
  slug: string
  excerpt: string
  role: string
  featured_image: string | null
}

export type MediaHit = {
  id: number
  title: string
  slug: string
  url: string
  mime?: string
}

type SiteSearchProps = {
  /** SSR seed for first paint when URL has `q` */
  initialResults?: SearchHit[]
  initialMedia?: MediaHit[]
  initialQuery?: string
  className?: string
}

export function SiteSearch({
  initialResults = [],
  initialMedia = [],
  initialQuery = "",
  className,
}: SiteSearchProps) {
  const [query, setQuery] = useState(initialQuery)

  const { results, media, loading, deferredQuery, error } = useRealtimeSearch(
    query,
    {
      debounceMs: 200,
      limit: 80,
      mediaLimit: 48,
      minLength: 1,
    }
  )

  // Prefer live API results once the debounced query matches what the user typed;
  // fall back to SSR seed while the first request is in flight for the initial query.
  const useSeed =
    Boolean(initialQuery) &&
    deferredQuery.toLowerCase() === initialQuery.trim().toLowerCase() &&
    results.length === 0 &&
    media.length === 0 &&
    !error

  const pageResults = useSeed ? initialResults : results
  const mediaResults = useSeed ? initialMedia : media
  const showLoading = loading && query.trim().length > 0

  // Keep the URL shareable without remounting the page (avoids losing input focus).
  useEffect(() => {
    const q = deferredQuery
    const next = q ? `/search?q=${encodeURIComponent(q)}` : "/search"
    const current = `${window.location.pathname}${window.location.search}`
    if (current === next) return
    window.history.replaceState(window.history.state, "", next)
  }, [deferredQuery])

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const q = query.trim()
    const next = q ? `/search?q=${encodeURIComponent(q)}` : "/search"
    window.history.replaceState(window.history.state, "", next)
  }

  return (
    <div className={cn("space-y-8", className)}>
      <form
        role="search"
        onSubmit={onSubmit}
        className="relative border border-border bg-card"
      >
        <Input
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search leaders, wings, chapters, meetings, media…"
          className="h-12 rounded-none border-0 bg-transparent px-4 pr-12 shadow-none focus-visible:ring-0"
          autoFocus
          aria-label="Search G100"
          autoComplete="off"
        />
        {showLoading ? (
          <LoaderCircleIcon className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </form>

      {!query.trim() ? (
        <p className="text-sm text-muted-foreground">
          Try “Denim Club”, a country name, a wing / sector, or a leader name.
          Results update as you type.
        </p>
      ) : pageResults.length === 0 && mediaResults.length === 0 && !showLoading ? (
        <p className="text-sm text-muted-foreground">
          No matches for “{query.trim()}”.
          {error ? ` (${error})` : null}
        </p>
      ) : (
        <div className="space-y-10">
          {pageResults.length > 0 ? (
            <section className="space-y-4">
              <h2 className="font-heading text-2xl font-semibold">
                Pages · {pageResults.length}
                {showLoading ? (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    updating…
                  </span>
                ) : null}
              </h2>
              <InfiniteScrollGrid
                items={pageResults}
                pageSize={20}
                resetKey={deferredQuery}
                getKey={(hit) => hit.id}
                endLabel={`All ${pageResults.length} page matches`}
                className="divide-y divide-border border border-border bg-card"
                renderItem={(hit) => (
                  <Link
                    href={contentHref(hit.slug)}
                    className="flex gap-4 px-4 py-3 transition-colors hover:bg-muted/40 sm:items-center sm:justify-between"
                  >
                    {hit.featured_image ? (
                      <div className="relative hidden size-14 shrink-0 overflow-hidden bg-surface-inset sm:block">
                        <MediaImage
                          src={hit.featured_image}
                          alt=""
                          className="absolute inset-0 size-full bg-transparent"
                          sizes="56px"
                          fit="contain"
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate font-medium">
                        {toTitleCase(hit.title)}
                      </p>
                      {hit.excerpt ? (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {toParagraphCase(hit.excerpt.replace(/<[^>]+>/g, ""))}
                        </p>
                      ) : null}
                    </div>
                    {hit.role ? (
                      <Badge
                        variant="outline"
                        className="hidden w-fit shrink-0 capitalize sm:inline-flex"
                      >
                        {hit.role.replace(/_/g, " ")}
                      </Badge>
                    ) : null}
                  </Link>
                )}
              />
            </section>
          ) : showLoading ? (
            <p className="text-sm text-muted-foreground">Searching pages…</p>
          ) : null}

          {mediaResults.length > 0 ? (
            <section className="space-y-4">
              <h2 className="font-heading text-2xl font-semibold">
                Media · {mediaResults.length}
              </h2>
              <MediaScroll
                items={mediaResults}
                pageSize={24}
                resetKey={deferredQuery}
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
                endLabel={`All ${mediaResults.length} media matches`}
              />
              <Link
                href={`/media?q=${encodeURIComponent(deferredQuery)}`}
                className="inline-block text-sm link-accent"
              >
                Browse full media library →
              </Link>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}
