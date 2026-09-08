import Link from "next/link"

import {
  Container,
  PageBody,
  PageHero,
  Section,
  SectionHeader,
} from "@/components/page-shell"
import { PagesScroll } from "@/components/pages-scroll"
import { Button } from "@/components/ui/button"
import { getHub, getPagesByRole, contentHref } from "@/lib/wordpress"

export default function MeetingsPage() {
  const hub = getHub("meetings")
  const meetings = getPagesByRole().meetings ?? []

  return (
    <PageBody>
      <PageHero
        eyebrow="Meetings"
        title="Meetings"
        description="Gatherings documenting G100 advocacy across continents."
        image={hub?.featured_image}
        actions={[
          { label: "Join Country Club", href: "/country-club/join" },
          { label: "Media library", href: "/media", variant: "outline" },
        ]}
      />

      <Section tone="muted" className="py-16 md:py-24">
        <Container>
          <SectionHeader
            eyebrow="Archive"
            title="All meetings"
            description={`${meetings.length} gatherings worldwide — scroll to load more.`}
            action={
              hub ? (
                <Button variant="outline" asChild>
                  <Link href={contentHref(hub.slug)}>Meetings hub</Link>
                </Button>
              ) : null
            }
          />
          <PagesScroll
            pages={meetings}
            pageSize={24}
            endLabel={`All ${meetings.length} meetings`}
          />
        </Container>
      </Section>
    </PageBody>
  )
}
