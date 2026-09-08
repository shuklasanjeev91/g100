import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ContentPageLayout } from "@/components/content-article"
import { PageBody } from "@/components/page-shell"
import { toParagraphCase, toTitleCase } from "@/lib/text-case"
import { getPageBySlug } from "@/lib/wordpress"

export function generateMetadata(): Metadata {
  const page = getPageBySlug("press")
  return {
    title: page ? toTitleCase(page.title) : "Press",
    description: page
      ? toParagraphCase(page.excerpt || page.title)
      : "Press coverage and media featuring G100 leaders worldwide.",
  }
}

export default function PressPage() {
  const page = getPageBySlug("press")
  if (!page) notFound()

  return (
    <PageBody>
      <ContentPageLayout page={page} />
    </PageBody>
  )
}
