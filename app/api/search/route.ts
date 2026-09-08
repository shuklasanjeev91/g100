import { NextResponse } from "next/server"

import { searchMedia, searchPages } from "@/lib/wordpress"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q") || searchParams.get("s") || ""
  const limit = Math.min(Number(searchParams.get("limit")) || 40, 100)
  const mediaLimit = Math.min(
    Number(searchParams.get("mediaLimit")) || 24,
    100
  )
  const pages = searchPages(q, limit)
  const media = searchMedia(q, mediaLimit)
  return NextResponse.json({
    query: q,
    count: pages.length,
    mediaCount: media.length,
    results: pages,
    media,
  })
}
