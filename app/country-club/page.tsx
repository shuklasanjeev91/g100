import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { BorderGrid, BorderGridCell } from "@/components/border-grid"
import { ContentArticle } from "@/components/content-article"
import {
  Container,
  PageBody,
  PageHero,
  Section,
  SectionHeader,
} from "@/components/page-shell"
import { PagesScroll } from "@/components/pages-scroll"
import { Button } from "@/components/ui/button"
import { getHub, getPagesByRole } from "@/lib/wordpress"

export default function CountryClubPage() {
  const hub = getHub("country-clubs")
  const countryChairs = getPagesByRole().country_chair ?? []

  return (
    <PageBody>
      <PageHero
        eyebrow="Country Club"
        title="Country Club"
        description="National clubs amplify advocacy, awareness, and impact across governments and organisations."
        image={hub?.featured_image}
        actions={[
          { label: "Join Country Club", href: "/country-club/join" },
          { label: "Denim Club", href: "/denim-club", variant: "outline" },
        ]}
      />

      <Section id="countries" tone="band" className="scroll-mt-28 py-14 md:py-16">
        <Container>
          <BorderGrid cols="md:grid-cols-2">
            <BorderGridCell className="p-8 md:p-10">
              <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
                National clubs
              </p>
              <p className="mt-4 font-heading text-2xl md:text-3xl">
                One club per country
              </p>
              <p className="mt-4 text-muted-foreground">
                Country chairs leading national clubs across G100.
              </p>
              <Button className="mt-6" variant="outline" asChild>
                <Link href="#directory">Browse country chairs</Link>
              </Button>
            </BorderGridCell>
            <BorderGridCell className="p-8 md:p-10">
              <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
                Join Country Club
              </p>
              <p className="mt-4 font-heading text-2xl md:text-3xl">
                Apply to join
              </p>
              <p className="mt-4 text-muted-foreground">
                Share your name, email, mobile, country, sector, and a short bio
                to join a national club.
              </p>
              <Button className="mt-6" asChild>
                <Link href="/country-club/join">
                  Open application
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            </BorderGridCell>
          </BorderGrid>
        </Container>
      </Section>

      {hub ? (
        <Section className="py-16 md:py-24">
          <Container>
            <ContentArticle
              page={hub}
              bare
              stripImages
              showGallery={false}
            />
          </Container>
        </Section>
      ) : null}

      <Section id="directory" tone="muted" className="scroll-mt-28 py-16 md:py-24">
        <Container>
          <SectionHeader
            eyebrow="Directory"
            title="Country chairs"
            description={`${countryChairs.length} national chairs · scroll to load more.`}
            action={
              <Button variant="outline" asChild>
                <Link href="/chapters?branch=view-chapters&role=country_chair">
                  All chapter roles
                </Link>
              </Button>
            }
          />
          <PagesScroll
            pages={countryChairs}
            pageSize={36}
            initialCount={36}
            endLabel={`All ${countryChairs.length} country chairs`}
          />
        </Container>
      </Section>
    </PageBody>
  )
}
