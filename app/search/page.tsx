import type { Metadata } from "next"

import {
  Container,
  PageBody,
  PageHero,
  Section,
} from "@/components/page-shell"
import { SiteSearch } from "@/components/site-search"
import { searchMedia, searchPages } from "@/lib/wordpress"

export const metadata: Metadata = {
  title: "Search",
  description: "Search G100 pages, wings, chapters, leaders, and media.",
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; s?: string }>
}) {
  const params = await searchParams
  const q = (params.q || params.s || "").trim()

  const pageHits = q
    ? searchPages(q, 80).map((page) => ({
        id: page.id,
        title: page.title,
        slug: page.slug,
        excerpt: page.excerpt,
        role: page.role,
        featured_image: page.featured_image,
      }))
    : []
  const mediaHits = q
    ? searchMedia(q, 48).map((item) => ({
        id: item.id,
        title: item.title,
        slug: item.slug,
        url: item.url,
        mime: item.mime,
      }))
    : []

  return (
    <PageBody>
      <PageHero
        eyebrow="Search"
        title="Search G100"
        description={
          q
            ? `Live results for “${q}” across pages and media.`
            : "Find leaders, wings, chapters, meetings, and media — results update as you type."
        }
        compact
      />
      <Section className="py-12 md:py-16">
        <Container>
          <SiteSearch
            initialResults={pageHits}
            initialMedia={mediaHits}
            initialQuery={q}
          />
        </Container>
      </Section>
    </PageBody>
  )
}
