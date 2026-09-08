export type SearchPageHit = {
  id: number
  title: string
  slug: string
  excerpt: string
  role: string
  featured_image: string | null
}

export type SearchMediaHit = {
  id: number
  title: string
  slug: string
  url: string
  mime?: string
}

export type SearchResponse = {
  query: string
  count: number
  mediaCount: number
  results: SearchPageHit[]
  media: SearchMediaHit[]
}

export async function fetchSearch(
  query: string,
  options?: {
    limit?: number
    mediaLimit?: number
    signal?: AbortSignal
  }
): Promise<SearchResponse> {
  const q = query.trim()
  if (!q) {
    return { query: "", count: 0, mediaCount: 0, results: [], media: [] }
  }

  const params = new URLSearchParams({
    q,
    limit: String(options?.limit ?? 40),
  })
  if (options?.mediaLimit != null) {
    params.set("mediaLimit", String(options.mediaLimit))
  }

  const res = await fetch(`/api/search?${params}`, {
    signal: options?.signal,
    headers: { Accept: "application/json" },
  })
  if (!res.ok) {
    throw new Error(`Search failed (${res.status})`)
  }
  return (await res.json()) as SearchResponse
}
