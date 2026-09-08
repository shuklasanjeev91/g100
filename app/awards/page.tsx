import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ContentPageLayout } from "@/components/content-article"
import { PageBody } from "@/components/page-shell"
import { toParagraphCase, toTitleCase } from "@/lib/text-case"
import { getPageBySlug } from "@/lib/wordpress"

export function generateMetadata(): Metadata {
  const page = getPageBySlug("awards")
  return {
    title: page ? toTitleCase(page.title) : "Awards",
    description: page
      ? toParagraphCase(page.excerpt || page.title)
      : "G100 Awards categories and ceremonies recognising leaders for gender equity.",
  }
}

export default function AwardsPage() {
  const page = getPageBySlug("awards")
  if (!page) notFound()

  return (
    <PageBody>
      <ContentPageLayout page={page} />
    </PageBody>
  )
}
