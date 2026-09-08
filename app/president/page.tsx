import Image from "next/image"
import Link from "next/link"

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
import { SiteBrandLogo } from "@/components/site-brand-logo"
import { Button } from "@/components/ui/button"
import {
  getGlobalPresidentIntroHtml,
  getGlobalPresidentTerms,
  getHub,
  getPagesByRole,
  htmlToPlainText,
  prepareWpHtml,
} from "@/lib/wordpress"

export default function PresidentPage() {
  const president = getHub("global-president")
  const advisory = getHub("presidents-advisory-council")
  const advisors = getPagesByRole().country_advisory ?? []
  const terms = getGlobalPresidentTerms()
  const introHtml = prepareWpHtml(getGlobalPresidentIntroHtml(), {
    stripImages: true,
    stripLeadingTitle: president?.title,
  }).replace(/<h[1-6]\b[^>]*>\s*20\d{2}\s*<\/h[1-6]>[\s\S]*$/i, "")

  const introPage = president
    ? { ...president, content_html: introHtml }
    : null

  return (
    <PageBody>
      <PageHero
        eyebrow="Leadership"
        title="Global president"
        description="Nominated every year by rotation from among the Global Chairs for a one-year tenure."
        image={terms[0]?.image || president?.featured_image}
        actions={[
          { label: "Presidents roster", href: "#presidents" },
          {
            label: "Presidents advisory",
            href: "#advisory",
            variant: "outline",
          },
        ]}
      />

      <Section id="rotation" tone="band" className="scroll-mt-28 py-14 md:py-16">
        <Container>
          <BorderGrid cols="md:grid-cols-2">
            <BorderGridCell className="p-8 md:p-10">
              <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
                Elected by rotation
              </p>
              <p className="mt-4 font-heading text-2xl md:text-3xl">
                1-year term, Global Chairs
              </p>
              <p className="mt-4 text-muted-foreground">
                Tenure from January 1 to December 31. The Global President
                retains the portfolio as Global Chair of a wing while leading
                self-led initiatives.
              </p>
            </BorderGridCell>
            <BorderGridCell className="p-8 md:p-10">
              <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
                Presidents advisory
              </p>
              <p className="mt-4 font-heading text-2xl md:text-3xl">
                Advisory council
              </p>
              <p className="mt-4 text-muted-foreground">
                Distinguished leaders supporting the Global President in driving
                positive change and gender equality worldwide.
              </p>
            </BorderGridCell>
          </BorderGrid>
        </Container>
      </Section>

      {introPage ? (
        <Section className="py-16 md:py-20">
          <Container>
            <ContentArticle
              page={introPage}
              bare
              stripImages
              showGallery={false}
            />
          </Container>
        </Section>
      ) : null}

      <Section id="presidents" className="scroll-mt-28 pb-16 md:pb-24">
        <Container>
          <SectionHeader
            eyebrow="Roster"
            title="Global Presidents"
            description="Profiles of leaders who have served as Global President by rotation."
          />
          <div className="grid gap-8 sm:grid-cols-2">
            {terms.map((term) => (
              <Link
                key={`${term.year}-${term.slug}`}
                href={term.href}
                className="group flex flex-col overflow-hidden border border-border/70 bg-card transition-all duration-500 hover:border-accent/45 hover:shadow-[0_24px_48px_-32px_oklch(0.145_0.01_75/0.45)]"
              >
                <div className="relative aspect-[5/4] overflow-hidden bg-surface-inset">
                  {term.image ? (
                    <Image
                      src={term.image}
                      alt={term.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-contain object-center transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                      priority
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <SiteBrandLogo size="lg" className="opacity-60" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between gap-5 border-t border-border/60 p-6 md:p-7">
                  <div>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
                        Global President
                      </p>
                      <p className="font-heading text-3xl font-medium text-accent tabular-nums md:text-4xl">
                        {term.year}
                      </p>
                    </div>
                    <h3 className="mt-3 font-heading text-2xl font-semibold tracking-tight transition-colors group-hover:text-accent md:text-[1.75rem]">
                      {term.name}
                    </h3>
                    {term.excerpt ? (
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                        {term.excerpt
                          .replace(/<[^>]+>/g, " ")
                          .replace(/\s+/g, " ")
                          .trim()}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        Serving a one-year Global President tenure by rotation
                        among Global Chairs.
                      </p>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">
                    View full profile
                    <span
                      aria-hidden
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </Section>

      <Section id="advisory" tone="muted" className="scroll-mt-28 py-16 md:py-24">
        <Container className="space-y-10">
          <SectionHeader
            eyebrow="Presidents advisory"
            title="Advisory council"
            description={
              advisory
                ? `${htmlToPlainText(advisory.content_html, 280)} ${advisors.length} profiles · scroll to load more.`
                : `${advisors.length} leaders supporting the Global President · scroll to load more.`
            }
            action={
              <Button variant="outline" asChild>
                <Link href="/chapters?branch=advisory-council">
                  All advisory councils
                </Link>
              </Button>
            }
          />
          {advisors.length ? (
            <PagesScroll
              pages={advisors}
              pageSize={36}
              initialCount={36}
              endLabel={`All ${advisors.length} advisory profiles`}
            />
          ) : null}
        </Container>
      </Section>
    </PageBody>
  )
}
