import Image from "next/image"
import Link from "next/link"

import { BorderGrid, BorderGridCell } from "@/components/border-grid"
import { WpContent } from "@/components/content-article"
import {
  Container,
  PageBody,
  PageHero,
  Section,
  SectionHeader,
} from "@/components/page-shell"
import {
  SisterPlatformsGrid,
  SisterPlatformsStrip,
} from "@/components/sister-platforms"
import { Button } from "@/components/ui/button"
import { SITE } from "@/lib/site"
import { normalizeMediaUrl } from "@/lib/media-url"
import { getHub } from "@/lib/wordpress"

const WHAT_IS_G100 = [
  "G100 is an empowered group of 100 women leaders from across the world, leading 100 global wings, supported by G100 He-for-She champions (Denim Club) and 100 Country Chairs for powerful advocacy, awareness & impact across governments and organisations for a gender equal future.",
  "G100 comprises a league of luminaries including Nobel Laureates, Heads of States, Ministers, Businesswomen, Philanthropists, Investors, Entrepreneurs, CEOs, and Community Leaders — architects of the future who wish to give back and move us all forward.",
  "The blueprint is 100 Global Wings · 100 Country Clubs · 100 Members · Million Gender Champions. Together we advocate for equity and mitigate barriers to women’s participation and leadership in all walks of life.",
]

const VALUES = [
  "Agility",
  "Autonomy",
  "Care",
  "Community",
  "Creativity",
  "Diversity",
  "Empowerment",
  "Integrity",
  "Leadership",
  "Solidarity",
  "Sustainability",
  "Trust",
]

export default function AboutPage() {
  const about = getHub("about-us")
  const founder = getHub("about-founder")
  const founderImage = normalizeMediaUrl(
    founder?.featured_image ||
      founder?.images?.[0] ||
      "https://www.g100.in/wp-content/uploads/2021/07/Dr.-Harbeen-Arora-241x300.jpg"
  )

  return (
    <PageBody>
      <PageHero
        eyebrow="About Us"
        title="All Ladies League & G100"
        description="Equal, inclusive world — vision, mission, and the founders who built the family of platforms."
        actions={[
          { label: "Join Us", href: "/country-club/join" },
          { label: "Global president", href: "/president", variant: "outline" },
        ]}
      />

      <Section id="vision" tone="band" className="scroll-mt-28 py-16 md:py-20">
        <Container>
          <BorderGrid cols="md:grid-cols-3">
            <BorderGridCell className="p-7 md:p-9">
              <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
                Vision
              </p>
              <p className="mt-5 font-heading text-xl leading-snug md:text-2xl">
                {SITE.vision}
              </p>
            </BorderGridCell>
            <BorderGridCell id="mission" className="scroll-mt-28 p-7 md:p-9">
              <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
                Mission
              </p>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
                {SITE.mission}
              </p>
            </BorderGridCell>
            <BorderGridCell className="p-7 md:p-9">
              <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
                Founder
              </p>
              <p className="mt-5 font-heading text-xl md:text-2xl">
                Dr. Harbeen Arora Rai
              </p>
              <Link
                href="#founder"
                className="link-accent mt-4 inline-block text-sm"
              >
                Read founder profile →
              </Link>
            </BorderGridCell>
          </BorderGrid>
        </Container>
      </Section>

      <Section className="py-16 md:py-24">
        <Container className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <div>
            <SectionHeader
              eyebrow="What is G100?"
              title="An action + think tank for gender parity"
              className="mb-8"
            />
            <div className="w-full space-y-5 text-base leading-relaxed text-justify text-muted-foreground md:text-lg">
              {WHAT_IS_G100.map((paragraph) => (
                <p key={paragraph.slice(0, 48)} className="w-full">
                  {paragraph}
                </p>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/wings">Explore Global Chairs</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/chapters">Browse chapters</Link>
              </Button>
            </div>
          </div>

          <aside className="space-y-4 border border-border bg-secondary/40 p-7 md:p-8">
            <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
              Blueprint
            </p>
            <ul className="space-y-4 font-heading text-2xl leading-snug md:text-3xl">
              <li>100 Global Wings</li>
              <li>100 Country Clubs</li>
              <li>100 Members</li>
              <li>Million Gender Champions</li>
            </ul>
            <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
              Supported by The Denim Club — G100 He-for-She champions worldwide.
            </p>
          </aside>
        </Container>
      </Section>

      <Section tone="muted" className="py-16 md:py-24">
        <Container>
          <SectionHeader
            eyebrow="Sister platforms"
            title="One family of platforms"
            description="Five free platforms working together — bridging gaps for a more inclusive world."
          />
          <SisterPlatformsGrid />
        </Container>
      </Section>

      <Section className="py-14 md:py-16">
        <Container>
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
            Core values
          </p>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3">
            {VALUES.map((value) => (
              <span
                key={value}
                className="font-heading text-lg text-foreground/80 md:text-xl"
              >
                {value}
              </span>
            ))}
          </div>
        </Container>
      </Section>

      <Section id="founder" tone="band" className="scroll-mt-28 py-16 md:py-24">
        <Container>
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] xl:gap-14">
            <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
              <div className="relative aspect-[3/4] w-full max-w-xs overflow-hidden border border-border bg-muted">
                <Image
                  src={founderImage}
                  alt="Dr. Harbeen Arora Rai"
                  fill
                  sizes="288px"
                  className="object-cover"
                />
              </div>
              <div className="space-y-3">
                <div>
                  <p className="font-heading text-2xl font-semibold">
                    Dr. Harbeen Arora Rai
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Founder
                  </p>
                </div>
                <SisterPlatformsStrip className="justify-start gap-2.5 md:gap-3" />
              </div>
            </aside>

            <div className="flex min-h-0 min-w-0 flex-col space-y-6 lg:max-h-[min(70vh,42rem)] lg:overflow-hidden">
              <SectionHeader
                eyebrow="Founder"
                title="About the founder"
                className="mb-0 shrink-0"
              />
              {founder ? (
                <div className="min-h-0 flex-1 lg:overflow-y-auto lg:pr-3 lg:[scrollbar-gutter:stable]">
                  <WpContent
                    html={founder.content_html}
                    prepareOptions={{
                      stripImages: true,
                      stripLeadingTitle: founder.title,
                    }}
                    className="max-w-none"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </Container>
      </Section>

      {about ? (
        <Section className="border-t border-border py-10">
          <Container className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Secretariat coordinates all wings in support of a million gender
              champions.
            </p>
            <Button variant="outline" asChild>
              <Link href="/contact">Contact the Secretariat</Link>
            </Button>
          </Container>
        </Section>
      ) : null}
    </PageBody>
  )
}
