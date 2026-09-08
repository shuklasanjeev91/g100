import type { Metadata } from "next"

import { MediaScroll } from "@/components/media-scroll"
import {
  Container,
  PageBody,
  PageHero,
  Section,
} from "@/components/page-shell"
import { getMediaImages } from "@/lib/wordpress"

export const metadata: Metadata = {
  title: "Media library",
  description: "Browse the G100 media library.",
}

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  const images = getMediaImages()
  const q = (params.q || "").trim().toLowerCase()
  const filtered = q
    ? images.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.slug.toLowerCase().includes(q) ||
          item.file.toLowerCase().includes(q)
      )
    : images

  const items = filtered.map((item) => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    url: item.url,
  }))

  return (
    <PageBody>
      <PageHero
        eyebrow="Media"
        title="Media library"
        description={
          q
            ? `${items.length} results matching “${params.q}” — scroll to load more.`
            : `${items.length} images from the G100 archive — scroll to load more.`
        }
        compact
      />

      <Section className="py-12 md:py-16">
        <Container className="space-y-10">
          <form className="flex w-full gap-2">
            <input
              name="q"
              defaultValue={params.q}
              placeholder="Search media titles…"
              className="flex h-11 w-full border border-input bg-transparent px-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <button
              type="submit"
              className="inline-flex h-11 items-center bg-primary px-5 text-sm font-medium text-primary-foreground"
            >
              Search
            </button>
          </form>

          <MediaScroll
            items={items}
            pageSize={48}
            resetKey={q || "all"}
            endLabel={`All ${items.length} media items`}
          />
        </Container>
      </Section>
    </PageBody>
  )
}
