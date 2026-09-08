import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { FilterTabs } from "@/components/filter-tabs"
import { NetworkChairsScroll } from "@/components/network-chairs-scroll"
import {
  Container,
  PageBody,
  PageHero,
  Section,
  SectionHeader,
} from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { CHAPTER_BRANCHES } from "@/lib/flow"
import {
  getGlobalChairProfiles,
  getHub,
  getPagesByRole,
  htmlToPlainText,
} from "@/lib/wordpress"

export default function WingsPage() {
  const hub = getHub("g100-global-chairs-and-chapters")
  const chairs = getGlobalChairProfiles()
  const byRole = getPagesByRole()

  const groups = CHAPTER_BRANCHES.map((branch) => ({
    id: branch.id,
    label: branch.title,
    items: branch.roles.map((role) => ({
      id: role.id,
      label: role.title,
      href: `/chapters?branch=${branch.id}&role=${role.id}`,
      count: (byRole[role.id] ?? []).length,
    })),
  }))

  return (
    <PageBody>
      <PageHero
        eyebrow="Global Chair"
        title="100 Wings / Sectors"
        description="Each wing advances the shared G100 agenda across sector hubs worldwide."
        image={hub?.featured_image}
        actions={[
          { label: "View Chapters", href: "/chapters?branch=view-chapters" },
          {
            label: "Advisory Council",
            href: "/chapters?branch=advisory-council",
            variant: "outline",
          },
        ]}
      />

      <Section className="py-14 md:py-20">
        <Container>
          <FilterTabs
            eyebrow="Explore by role"
            description="Choose a directory tab, then open the related role card."
            groups={groups}
          />
        </Container>
      </Section>

      {hub ? (
        <Section tone="muted" className="py-14 md:py-20">
          <Container>
            <div className="max-w-3xl space-y-4">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
                About Global Chairs
              </p>
              <p className="font-heading text-2xl font-medium leading-snug tracking-tight text-foreground md:text-3xl">
                Leadership across one hundred sectors
              </p>
              <p className="text-base leading-relaxed text-muted-foreground md:text-lg md:leading-relaxed">
                {htmlToPlainText(hub.content_html, 420)}
              </p>
            </div>
          </Container>
        </Section>
      ) : null}

      <Section id="directory" className="scroll-mt-28 py-16 md:py-24">
        <Container>
          <SectionHeader
            eyebrow="Global Chairs"
            title="All wings / sectors"
            description={`${chairs.length} Global Chairs · click any chair for their wing profile.`}
            action={
              <Button variant="outline" asChild>
                <Link href="/chapters?branch=view-chapters&role=country_chair">
                  Country chairs
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            }
          />
          <NetworkChairsScroll chairs={chairs} pageSize={48} initialCount={48} />
        </Container>
      </Section>
    </PageBody>
  )
}
