"use client"

import {
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useState,
} from "react"

import {
  fetchSearch,
  type SearchMediaHit,
  type SearchPageHit,
} from "@/lib/search"

export type RealtimeSearchState = {
  query: string
  deferredQuery: string
  results: SearchPageHit[]
  media: SearchMediaHit[]
  loading: boolean
  error: string | null
}

/**
 * Debounced live search against `/api/search`.
 * Aborts in-flight requests when the query changes.
 */
export function useRealtimeSearch(
  query: string,
  options?: {
    debounceMs?: number
    limit?: number
    mediaLimit?: number
    enabled?: boolean
    minLength?: number
  }
): RealtimeSearchState {
  const debounceMs = options?.debounceMs ?? 220
  const limit = options?.limit ?? 40
  const mediaLimit = options?.mediaLimit ?? 24
  const enabled = options?.enabled ?? true
  const minLength = options?.minLength ?? 1

  const deferredQuery = useDeferredValue(query.trim())
  const [debouncedQuery, setDebouncedQuery] = useState(deferredQuery)
  const [results, setResults] = useState<SearchPageHit[]>([])
  const [media, setMedia] = useState<SearchMediaHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedQuery(deferredQuery)
    }, debounceMs)
    return () => window.clearTimeout(id)
  }, [deferredQuery, debounceMs])

  const runSearch = useEffectEvent(async (q: string, signal: AbortSignal) => {
    if (!enabled || q.length < minLength) {
      setResults([])
      setMedia([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await fetchSearch(q, { limit, mediaLimit, signal })
      if (signal.aborted) return
      setResults(data.results)
      setMedia(data.media)
    } catch (err) {
      if (signal.aborted) return
      setResults([])
      setMedia([])
      setError(err instanceof Error ? err.message : "Search failed")
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  })

  useEffect(() => {
    const controller = new AbortController()
    void runSearch(debouncedQuery, controller.signal)
    return () => controller.abort()
  }, [debouncedQuery, enabled, limit, mediaLimit, minLength])

  return {
    query: query.trim(),
    deferredQuery: debouncedQuery,
    results,
    media,
    loading,
    error,
  }
}
