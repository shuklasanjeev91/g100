import type { Metadata } from "next"
import Link from "next/link"

import { BorderGrid, BorderGridCell } from "@/components/border-grid"
import {
  Container,
  PageBody,
  PageHero,
  Section,
} from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { getForms } from "@/lib/forms"
import { listSubmissions } from "@/lib/submissions"
import { FLOW_HUBS, getManifest } from "@/lib/wordpress"

export const metadata: Metadata = {
  title: "Admin",
  description: "G100 sync status and form submissions.",
}

export default async function AdminPage() {
  const manifest = getManifest()
  const forms = getForms()
  const submissions = await listSubmissions()

  return (
    <PageBody>
      <PageHero
        eyebrow="Admin"
        title="Sync & submissions"
        description={`Live data mirror of ${manifest.site}.`}
        compact
      />

      <Section className="py-12 md:py-16">
        <Container className="space-y-12">
          <p className="text-sm text-muted-foreground">
            Re-sync WordPress → local JSON, then push to Supabase with{" "}
            <code className="border border-border bg-muted px-1.5 py-0.5 text-xs">
              npm run sync:wordpress
            </code>{" "}
            and{" "}
            <code className="border border-border bg-muted px-1.5 py-0.5 text-xs">
              npm run sync:supabase
            </code>
            . Mirror priority images with{" "}
            <code className="border border-border bg-muted px-1.5 py-0.5 text-xs">
              npm run sync:media
            </code>
            .
          </p>

          <BorderGrid>
            {[
              { label: "Pages", value: manifest.page_count },
              { label: "Media", value: manifest.media_count },
              { label: "Wings", value: manifest.wings_count },
              { label: "Submissions", value: submissions.length },
            ].map((stat) => (
              <BorderGridCell key={stat.label}>
                <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
                  {stat.label}
                </p>
                <p className="mt-3 font-mono text-4xl font-medium">
                  {stat.value.toLocaleString()}
                </p>
              </BorderGridCell>
            ))}
          </BorderGrid>

          <div className="space-y-4">
            <h2 className="font-heading text-2xl font-medium md:text-3xl">
              Org flow hubs
            </h2>
            <ul className="divide-y divide-border border border-border">
              {FLOW_HUBS.map((hub) => (
                <li key={hub.key}>
                  <Link
                    href={hub.href}
                    className="flex items-center justify-between px-5 py-4 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="font-medium">{hub.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {hub.key}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-heading text-2xl font-medium md:text-3xl">
                Forms
              </h2>
              <Button variant="outline" size="sm" asChild>
                <Link href="/country-club/join">Open join form</Link>
              </Button>
            </div>
            <BorderGrid cols="sm:grid-cols-2">
              {forms.map((form) => (
                <BorderGridCell key={form.slug} className="p-6">
                  <p className="font-medium">{form.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {form.fields.length} fields · {form.slug}
                  </p>
                </BorderGridCell>
              ))}
            </BorderGrid>
          </div>

          <div className="space-y-4">
            <h2 className="font-heading text-2xl font-medium md:text-3xl">
              Recent submissions
            </h2>
            {submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No submissions yet. Submit Join, Contact, or Denim forms to
                persist them.
              </p>
            ) : (
              <ul className="space-y-3">
                {submissions.slice(0, 50).map((row) => (
                  <li
                    key={row.id}
                    className="border border-border bg-card p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{row.formTitle}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {row.createdAt}
                      </p>
                    </div>
                    <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                      {Object.entries(row.values).map(([key, value]) => (
                        <div key={key}>
                          <dt className="text-xs text-muted-foreground">{key}</dt>
                          <dd className="break-words">{value || "—"}</dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Container>
      </Section>
    </PageBody>
  )
}
