import Link from "next/link"

import { FilterTabRail } from "@/components/filter-tabs"
import {
  Container,
  PageBody,
  PageHero,
  Section,
  SectionHeader,
} from "@/components/page-shell"
import { PagesScroll } from "@/components/pages-scroll"
import { SiteForm } from "@/components/site-form"
import { Button } from "@/components/ui/button"
import { getFormBySlug } from "@/lib/forms"
import { SITE } from "@/lib/site"
import { cn } from "@/lib/utils"
import { getPagesByRole } from "@/lib/wordpress"

const PARTNER_TIERS = [
  { key: "country_partner", title: "Country Partner" },
  { key: "state_partner", title: "State Partner" },
  { key: "city_partner", title: "City Partner" },
  { key: "country_denim", title: "Country Denim" },
] as const

export default function DenimClubPage() {
  const byRole = getPagesByRole()
  const signup = getFormBySlug("sign-up-denim-club")

  const partnerSections = PARTNER_TIERS.map((tier) => ({
    ...tier,
    rows: byRole[tier.key] ?? [],
  })).filter((tier) => tier.rows.length > 0)

  const tierTabs = partnerSections.map((tier) => ({
    id: tier.key,
    label: tier.title,
    href: `#${tier.key}`,
    count: tier.rows.length,
  }))

  return (
    <PageBody>
      <PageHero
        eyebrow="Denim Club"
        title="Denim Club"
        description="He-for-She champions — Global, Country, State, and City partners supporting gender equity."
        image={SITE.denimImage}
        actions={[
          { label: "Denim Dialogues", href: "/denim-club/dialogues" },
          { label: "Sign up", href: "#signup", variant: "outline" },
        ]}
      />

      {tierTabs.length > 0 ? (
        <Section className="border-b border-border/70 py-8 md:py-10">
          <Container>
            <FilterTabRail eyebrow="Partner directories" items={tierTabs} />
          </Container>
        </Section>
      ) : null}

      {partnerSections.map((tier, index) => (
        <Section
          key={tier.key}
          id={tier.key}
          tone="muted"
          className={cn(
            "scroll-mt-28",
            index === 0 ? "pt-10 pb-16 md:pt-12 md:pb-20" : "py-16 md:py-24"
          )}
        >
          <Container>
            <SectionHeader
              eyebrow="Directory"
              title={tier.title}
              description={`${tier.rows.length} profiles · scroll to load more`}
              action={
                tier.key === "country_partner" ? (
                  <Button variant="outline" asChild>
                    <Link href="/denim-club/dialogues">Denim Dialogues</Link>
                  </Button>
                ) : null
              }
            />
            <PagesScroll
              pages={tier.rows}
              pageSize={36}
              initialCount={36}
              resetKey={tier.key}
              endLabel={`All ${tier.rows.length} ${tier.title}`}
            />
          </Container>
        </Section>
      ))}

      {signup ? (
        <Section id="signup" className="scroll-mt-28 py-16 md:py-24">
          <Container className="grid gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="space-y-4">
              <h2 className="font-heading text-3xl font-medium md:text-4xl">
                Sign up for Denim Club
              </h2>
              <p className="text-lg text-muted-foreground">
                Apply to join as a He-for-She champion.
              </p>
            </div>
            <SiteForm form={signup} submitLabel="Join Denim Club" />
          </Container>
        </Section>
      ) : null}
    </PageBody>
  )
}
