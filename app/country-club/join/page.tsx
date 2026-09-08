import type { Metadata } from "next"
import Link from "next/link"

import {
  Container,
  FormSplit,
  PageBody,
  PageHero,
  Section,
} from "@/components/page-shell"
import { SiteForm } from "@/components/site-form"
import { Button } from "@/components/ui/button"
import { getFormBySlug } from "@/lib/forms"
import { getHub, getPageBySlug } from "@/lib/wordpress"

export const metadata: Metadata = {
  title: "Join Country Club",
  description:
    "Apply to join a G100 Country Club — free membership with access to leaders, peer learning, and distributed leadership.",
}

export default function JoinCountryClubPage() {
  const form = getFormBySlug("join-country-club")
  const page = getPageBySlug("join-country-clubs")
  const hub = getHub("country-clubs")

  return (
    <PageBody>
      <PageHero
        eyebrow="Membership"
        title="Join Country Club"
        description="Free membership, peer learning, and privileged connection to leaders."
        image={hub?.featured_image}
        compact
        actions={[
          {
            label: "Back to Country Club",
            href: "/country-club",
            variant: "outline",
          },
        ]}
      />

      <Section className="py-12 md:py-16">
        <Container>
          <FormSplit
            brand={
              <div className="flex h-full flex-col justify-between gap-10">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
                    Why join
                  </p>
                  <h2 className="mt-3 font-heading text-2xl font-semibold tracking-tight md:text-3xl">
                    Belong to a national club advancing parity
                  </h2>
                  <div className="mt-5 h-px w-12 bg-accent" />
                  <ul className="mt-6 space-y-3 text-sm leading-relaxed text-primary-foreground/70 md:text-base">
                    <li>Free membership</li>
                    <li>Privileged connection to leaders and movers</li>
                    <li>Learn, lead, and be led in an inspiring environment</li>
                  </ul>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                    asChild
                  >
                    <Link href="/denim-club#signup">Denim Club signup</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                    asChild
                  >
                    <Link href="/contact">Contact</Link>
                  </Button>
                </div>
                {page?.excerpt ? (
                  <p className="text-sm leading-relaxed text-primary-foreground/50">
                    {page.excerpt.replace(/<[^>]+>/g, "").slice(0, 280)}
                  </p>
                ) : null}
              </div>
            }
          >
            {form ? (
              <SiteForm
                form={form}
                submitLabel="Submit application"
                className="border-0 bg-transparent p-0 md:p-0"
              />
            ) : (
              <p className="text-sm text-muted-foreground">Form unavailable.</p>
            )}
          </FormSplit>
        </Container>
      </Section>
    </PageBody>
  )
}
