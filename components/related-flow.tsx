import Link from "next/link"

import { PageCard } from "@/components/page-card"
import { Container } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import {
  getRelatedFlowContent,
  type WpPage,
} from "@/lib/wordpress"
import { toParagraphCase, toTitleCase } from "@/lib/text-case"

export function RelatedFlowSection({ page }: { page: WpPage }) {
  const related = getRelatedFlowContent(page)
  const hasGroups = related.groups.some((g) => g.items.length > 0)
  if (!hasGroups && !related.wing && !related.flowNext && !related.flowPrev) {
    return null
  }

  return (
    <section className="border-t border-border bg-secondary/30">
      <Container className="space-y-12 py-14 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="w-full max-w-none space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-accent">
              Related in Flow
            </p>
            <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
              {page.role === "wing"
                ? "Continue Through G100"
                : related.wing
                  ? toTitleCase(related.wing.title.replace(/\s+Wing$/i, ""))
                  : "Continue Through G100"}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              {toParagraphCase(
                [related.branchTitle, related.roleLabel]
                  .filter(Boolean)
                  .join(" · ") ||
                  "Linked profiles and next steps from the organization flow."
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {related.wing && related.wing.slug !== page.slug ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={related.wing.href}>
                  {toTitleCase(related.wing.title.replace(/\s+Wing$/i, ""))}{" "}
                  wing
                </Link>
              </Button>
            ) : null}
            {related.groups[0]?.browseHref && page.role !== "wing" ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={related.groups[0].browseHref}>Browse chapters</Link>
              </Button>
            ) : null}
          </div>
        </div>

        {related.groups.map((group) =>
          group.items.length ? (
            <div key={group.id} className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="font-heading text-xl font-semibold md:text-2xl">
                    {toTitleCase(group.title)}
                  </h3>
                  {group.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {toParagraphCase(group.description)}
                    </p>
                  ) : null}
                </div>
                {group.browseHref ? (
                  <Link
                    href={group.browseHref}
                    className="link-accent text-sm"
                  >
                    View all →
                  </Link>
                ) : null}
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.items.map((item) => (
                  <PageCard key={item.id} page={item} href={item.href} />
                ))}
              </div>
            </div>
          ) : null
        )}

        {(related.flowPrev || related.flowNext) && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8">
            {related.flowPrev ? (
              <Link
                href={related.flowPrev.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                ← {related.flowPrev.label}
              </Link>
            ) : (
              <span />
            )}
            {related.flowNext ? (
              <Button asChild>
                <Link href={related.flowNext.href}>
                  Continue to {related.flowNext.label} →
                </Link>
              </Button>
            ) : null}
          </div>
        )}
      </Container>
    </section>
  )
}
