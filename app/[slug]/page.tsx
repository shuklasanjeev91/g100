import { notFound, redirect } from "next/navigation"

import { ContentPageLayout } from "@/components/content-article"
import { PageBody } from "@/components/page-shell"
import { toParagraphCase, toTitleCase } from "@/lib/text-case"
import {
  getPageBySlug,
  getPagesIndex,
  hrefForWpSlug,
} from "@/lib/wordpress"

type Props = {
  params: Promise<{ slug: string }>
}

const STATIC_APP_SLUGS = new Set([
  "about",
  "president",
  "wings",
  "chapters",
  "country-club",
  "denim-club",
  "meetings",
  "join",
  "contact",
  "search",
  "media",
  "admin",
  "content",
  "api",
  "awards",
  "press",
])

export function generateStaticParams() {
  return getPagesIndex()
    .filter((page) => !STATIC_APP_SLUGS.has(page.slug.toLowerCase()))
    .map((page) => ({ slug: page.slug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const page = getPageBySlug(slug)
  if (!page) return { title: "Not Found" }
  return {
    title: toTitleCase(page.title),
    description: toParagraphCase(page.excerpt || page.title),
  }
}

export default async function ContentSlugPage({ params }: Props) {
  const { slug } = await params

  // Never steal dedicated app routes if a catch-all somehow matches
  if (STATIC_APP_SLUGS.has(slug.toLowerCase())) {
    notFound()
  }

  const page = getPageBySlug(slug)

  if (!page) {
    if (!slug || slug.length < 3) {
      redirect(`/search?q=${encodeURIComponent(slug || "")}`)
    }
    const mapped = hrefForWpSlug(slug)
    if (mapped !== `/${slug}` && !mapped.startsWith(`/${slug}`)) {
      redirect(mapped)
    }
    notFound()
  }

  return (
    <PageBody>
      <ContentPageLayout page={page} />
    </PageBody>
  )
}
