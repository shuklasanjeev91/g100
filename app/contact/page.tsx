import type { Metadata } from "next"
import Link from "next/link"
import { MailIcon } from "lucide-react"

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
import { SITE } from "@/lib/site"

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Get in touch with ${SITE.name} at info@g100.in.`,
}

export default function ContactPage() {
  const form = getFormBySlug("contact")

  return (
    <PageBody>
      <PageHero
        eyebrow="Contact"
        title="Contact us"
        description="Questions about wings, country clubs, meetings, or partnership — reach the G100 secretariat."
        compact
        actions={[
          { label: "Join Country Club", href: "/country-club/join" },
          { label: "Search", href: "/search", variant: "outline" },
        ]}
      />

      <Section className="py-12 md:py-16">
        <Container>
          <FormSplit
            brand={
              <div className="flex h-full flex-col justify-between gap-10">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
                    Secretariat
                  </p>
                  <h2 className="mt-3 font-heading text-2xl font-semibold tracking-tight md:text-3xl">
                    Write to us
                  </h2>
                  <div className="mt-5 h-px w-12 bg-accent" />
                  <a
                    href="mailto:info@g100.in"
                    className="mt-6 inline-flex items-center gap-3 text-base font-medium text-accent underline-offset-4 transition-colors hover:underline md:text-lg"
                  >
                    <MailIcon className="size-5 text-accent" />
                    info@g100.in
                  </a>
                  <p className="mt-4 text-sm leading-relaxed text-primary-foreground/60 md:text-base">
                    Prefer to explore first? Browse wings, chapters, and the
                    media library.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                    asChild
                  >
                    <Link href="/wings">Wings</Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                    asChild
                  >
                    <Link href="/media">Media</Link>
                  </Button>
                </div>
              </div>
            }
          >
            {form ? (
              <SiteForm
                form={form}
                submitLabel="Send message"
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
