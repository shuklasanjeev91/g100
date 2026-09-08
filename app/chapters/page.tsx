import Link from "next/link"

import { FilterTabs } from "@/components/filter-tabs"
import {
  Container,
  PageBody,
  PageHero,
  Section,
} from "@/components/page-shell"
import { PagesScroll } from "@/components/pages-scroll"
import { Button } from "@/components/ui/button"
import { CHAPTER_BRANCHES } from "@/lib/flow"
import {
  buildChaptersHref,
  contentHref,
  filterPagesByWing,
  getPagesByRole,
  getWingByParam,
} from "@/lib/wordpress"
import { toTitleCase } from "@/lib/text-case"

export default async function ChaptersPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string; role?: string; wing?: string }>
}) {
  const params = await searchParams
  const byRole = getPagesByRole()
  const wing = getWingByParam(params.wing)
  const wingSlug = wing?.slug ?? null
  const wingLabel = wing
    ? toTitleCase(wing.title.replace(/\s+Wing$/i, "").trim())
    : null

  const branch =
    CHAPTER_BRANCHES.find((b) => b.id === params.branch) ?? CHAPTER_BRANCHES[0]
  const roleId =
    branch.roles.find((r) => r.id === params.role)?.id ?? branch.roles[0].id
  const roleTitle =
    branch.roles.find((r) => r.id === roleId)?.title ?? roleId

  const allRows = byRole[roleId] ?? []
  const rows = filterPagesByWing(allRows, wingSlug)

  const groups = CHAPTER_BRANCHES.map((item) => ({
    id: item.id,
    label: item.title,
    href: buildChaptersHref({
      branch: item.id,
      role: item.roles[0]?.id ?? "",
      wing: wingSlug,
    }),
    items: item.roles.map((role) => ({
      id: role.id,
      label: role.title,
      href: buildChaptersHref({
        branch: item.id,
        role: role.id,
        wing: wingSlug,
      }),
      count: filterPagesByWing(byRole[role.id] ?? [], wingSlug).length,
    })),
  }))

  return (
    <PageBody>
      <PageHero
        eyebrow={wingLabel ? `${wingLabel} · Network` : "Chapters"}
        title={
          wingLabel
            ? `${wingLabel} · ${roleTitle}`
            : "View Chapters · Advisory · Denim"
        }
        description={
          wingLabel
            ? `Profiles under the ${wingLabel} Wing Global Chair — ${roleTitle.toLowerCase()} only.`
            : "Country, state, and city leadership across chairs, advisory councils, and Denim partners."
        }
        actions={
          wing
            ? [
                { label: "Wing profile", href: contentHref(wing.slug) },
                {
                  label: "All chapters",
                  href: buildChaptersHref({
                    branch: branch.id,
                    role: roleId,
                  }),
                  variant: "outline" as const,
                },
              ]
            : [
                { label: "Country Club", href: "/country-club" },
                { label: "100 Wings", href: "/wings", variant: "outline" as const },
              ]
        }
      />

      <Section className="py-14 md:py-20">
        <Container className="space-y-12">
          <FilterTabs
            eyebrow={wingLabel ? "Roles in this wing" : "Choose a role"}
            description={
              wingLabel
                ? "Switch roles while staying inside this Global Chair’s network."
                : "Pick a directory tab, then open a role card to browse profiles."
            }
            groups={groups}
            activeGroupId={branch.id}
            activeId={roleId}
          />

          <div className="space-y-6 border-t border-border/70 pt-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">
                  {wingLabel ? `${wingLabel} · ${branch.title}` : branch.title}
                </p>
                <h2 className="mt-2 font-heading text-2xl font-medium tracking-tight md:text-3xl">
                  {roleTitle}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {rows.length} profiles
                  {wingLabel ? ` in this wing` : ""} · scroll to load more
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={wing ? contentHref(wing.slug) : "/country-club"}>
                  {wing ? "Back to wing →" : "Country Club →"}
                </Link>
              </Button>
            </div>

            {rows.length ? (
              <PagesScroll
                pages={rows}
                pageSize={36}
                initialCount={36}
                resetKey={`${wingSlug || "all"}-${branch.id}-${roleId}`}
                endLabel={`All ${rows.length} ${roleTitle}${wingLabel ? ` · ${wingLabel}` : ""}`}
              />
            ) : (
              <div className="border border-border/80 bg-card px-6 py-12 text-center md:px-10">
                <p className="font-heading text-2xl font-semibold tracking-tight">
                  No {roleTitle.toLowerCase()} profiles yet
                </p>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base">
                  {wingLabel
                    ? `The ${wingLabel} Wing does not have published ${roleTitle.toLowerCase()} profiles in the archive yet. Try another role tab, or open the wing advisory page.`
                    : `No profiles found for this role.`}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {wing ? (
                    <Button asChild>
                      <Link href={contentHref(wing.slug)}>Wing profile</Link>
                    </Button>
                  ) : null}
                  <Button variant="outline" asChild>
                    <Link
                      href={buildChaptersHref({
                        branch: branch.id,
                        role: roleId,
                      })}
                    >
                      Browse all wings
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Container>
      </Section>
    </PageBody>
  )
}
