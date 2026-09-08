import { NextResponse } from "next/server"

import { getMediaImages, getMediaLibrary } from "@/lib/wordpress"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get("q") || "").trim().toLowerCase()
  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const pageSize = Math.min(Number(searchParams.get("pageSize")) || 48, 100)
  const imagesOnly = searchParams.get("images") !== "0"

  const source = imagesOnly ? getMediaImages() : getMediaLibrary()
  const filtered = q
    ? source.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.slug.toLowerCase().includes(q) ||
          item.file.toLowerCase().includes(q)
      )
    : source

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = (page - 1) * pageSize
  const items = filtered.slice(start, start + pageSize)

  return NextResponse.json({
    query: q,
    page,
    pageSize,
    total,
    totalPages,
    items,
  })
}
