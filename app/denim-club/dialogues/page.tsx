import type { Metadata } from "next"
import Link from "next/link"

import { ContentArticle } from "@/components/content-article"
import {
  Container,
  PageBody,
  PageHero,
  Section,
} from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { getHub } from "@/lib/wordpress"

export const metadata: Metadata = {
  title: "Denim Dialogues",
  description:
    "The Denim Club Dialogues — conversations for gender-balanced leadership.",
}

export default function DenimDialoguesPage() {
  const dialogues = getHub("the-denim-club-dialogues")

  return (
    <PageBody>
      <PageHero
        eyebrow="Denim Club"
        title="Denim Dialogues"
        description="Dedicated dialogues advancing gender-balanced leadership and transformative change."
        image={dialogues?.featured_image}
        compact
        actions={[
          { label: "Back to Denim Club", href: "/denim-club", variant: "outline" },
          { label: "Meetings", href: "/meetings" },
        ]}
      />

      <Section className="py-16 md:py-24">
        <Container className="space-y-10">
          {dialogues ? (
            <ContentArticle
              page={dialogues}
              bare
              stripImages
              showGallery={false}
            />
          ) : (
            <p className="text-muted-foreground">Dialogues content unavailable.</p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href="/denim-club">Denim Club</Link>
            </Button>
            <Button asChild>
              <Link href="/meetings">Continue to Meetings</Link>
            </Button>
          </div>
        </Container>
      </Section>
    </PageBody>
  )
}
