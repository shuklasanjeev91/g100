import Image from "next/image"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { HeroSlider } from "@/components/hero-slider"
import { MeetingsScroll } from "@/components/meetings-scroll"
import { NetworkChairsScroll } from "@/components/network-chairs-scroll"
import { PagesScroll } from "@/components/pages-scroll"
import {
  Container,
  PageBody,
  Section,
  SectionHeader,
} from "@/components/page-shell"
import { SisterPlatformsStrip } from "@/components/sister-platforms"
import { Button } from "@/components/ui/button"
import { getG100Hierarchy } from "@/lib/g100"
import { isUsableImageUrl, normalizeMediaUrl } from "@/lib/media-url"
import { SITE } from "@/lib/site"
import {
  getGlobalChairProfiles,
  getHub,
  getPagesByRole,
  getWings,
  resolvePageCardImage,
  type WpPage,
} from "@/lib/wordpress"

const BLUEPRINT = [
  { value: "100", label: "Global Wings" },
  { value: "100", label: "Country Clubs" },
  { value: "100", label: "Members" },
  { value: "1M+", label: "Gender Champions" },
] as const

function firstUsableImage(
  page: WpPage | undefined,
  fallback?: string | null
): string | null {
  const candidates = [
    page?.featured_image,
    ...(page?.images ?? []),
    fallback,
  ].filter(Boolean) as string[]
  for (const src of candidates) {
    if (!isUsableImageUrl(src)) continue
    const normalized = normalizeMediaUrl(src)
    if (normalized.toLowerCase().includes("logo")) continue
    return normalized
  }
  return fallback && isUsableImageUrl(fallback)
    ? normalizeMediaUrl(fallback)
    : null
}

function formatCount(n: number) {
  return new Intl.NumberFormat("en").format(n)
}

function PortraitStack({
  portraits,
}: {
  portraits: { src: string; name: string }[]
}) {
  if (!portraits.length) return null
  return (
    <div className="flex items-center">
      {portraits.map((p, i) => (
        <div
          key={p.src + p.name}
          className="relative size-9 overflow-hidden border-2 border-card bg-muted shadow-sm md:size-10"
          style={{ marginLeft: i === 0 ? 0 : -10, zIndex: portraits.length - i }}
        >
          <Image
            src={p.src}
            alt=""
            fill
            sizes="40px"
            className="object-cover object-top"
          />
        </div>
      ))}
    </div>
  )
}

export function HomePage() {
  const hierarchy = getG100Hierarchy()
  const byRole = getPagesByRole()
  const wings = getWings()
  const chairsHub = getHub("g100-global-chairs-and-chapters")
  const denimHub = getHub("denim-club-partners")
  const countryHub = getHub("country-clubs")

  const allChairs = getGlobalChairProfiles()
  const heroChairs = allChairs
    .filter((chair) => Boolean(chair.image))
    .slice(0, 8)
    .map((chair) => ({
      id: chair.id,
      name: chair.name,
      wing: chair.wing,
      image: chair.image as string,
      href: chair.href,
    }))
  const meetings = byRole.meetings ?? []
  const wingPages = wings.map((wing) => ({
    id: wing.id,
    title: wing.title,
    slug: wing.slug,
    featured_image: resolvePageCardImage(wing),
    images: wing.images,
  }))
  const chapterPages = [
    ...(byRole.country_chair ?? []),
    ...(byRole.state_chair ?? []),
    ...(byRole.city_chair ?? []),
  ]
  const denimPages = [
    ...(byRole.country_denim ?? []),
    ...(byRole.state_denim ?? []),
    ...(byRole.city_denim ?? []),
  ]

  const chairPortraits = heroChairs.slice(0, 4).map((c) => ({
    src: c.image,
    name: c.name,
  }))
  const denimSeen = new Set<string>()
  const denimPortraits: { src: string; name: string }[] = []
  for (const raw of denimHub?.images ?? []) {
    const src = normalizeMediaUrl(raw)
    if (
      !isUsableImageUrl(src) ||
      src.toLowerCase().includes("denim-clud") ||
      src.toLowerCase().includes("logo")
    ) {
      continue
    }
    const key = src
      .toLowerCase()
      .replace(/-\d+x\d+(?=\.(jpe?g|png|webp))/i, "")
      .replace(/-scaled(?=\.(jpe?g|png|webp))/i, "")
    if (denimSeen.has(key)) continue
    denimSeen.add(key)
    denimPortraits.push({ src, name: `Denim partner ${denimPortraits.length + 1}` })
    if (denimPortraits.length >= 4) break
  }

  const countryChairCount = (byRole.country_chair ?? []).length
  const stateChairCount = (byRole.state_chair ?? []).length
  const cityChairCount = (byRole.city_chair ?? []).length
  const chapterTotal = countryChairCount + stateChairCount + cityChairCount
  const denimTotal =
    (byRole.country_denim ?? []).length +
    (byRole.state_denim ?? []).length +
    (byRole.city_denim ?? []).length
  const countryClubCount =
    (byRole.country_club ?? []).length +
    (byRole.country_partner ?? []).length

  const pathways = [
    {
      href: "/wings",
      label: "Global Chairs",
      detail: "Sector leadership across 100 global wings.",
      index: "01",
      image:
        firstUsableImage(chairsHub, heroChairs[0]?.image) ?? SITE.heroImage,
      stat: `${formatCount(wings.length || allChairs.length)} wings`,
      portraits: chairPortraits,
    },
    {
      href: "/chapters",
      label: "Chapters",
      detail: "Country, state, and city chairs building local reach.",
      index: "02",
      image:
        heroChairs[2]?.image ||
        firstUsableImage(chairsHub, SITE.heroImage) ||
        SITE.heroImage,
      stat: `${formatCount(chapterTotal)} leaders`,
      portraits: heroChairs.slice(4, 8).map((c) => ({
        src: c.image,
        name: c.name,
      })),
    },
    {
      href: "/country-club",
      label: "Country Club",
      detail: "National clubs advancing parity worldwide.",
      index: "03",
      image:
        firstUsableImage(countryHub, SITE.heroImage) ??
        heroChairs[5]?.image ??
        SITE.heroImage,
      stat:
        countryClubCount > 1
          ? `${formatCount(countryClubCount)} clubs`
          : "100 countries",
      portraits: [] as { src: string; name: string }[],
    },
    {
      href: "/denim-club",
      label: "Denim Club",
      detail: "He-for-She champions standing with women leaders.",
      index: "04",
      image: firstUsableImage(denimHub, SITE.denimImage) ?? SITE.denimImage,
      stat: `${formatCount(denimTotal || 100)}+ partners`,
      portraits: denimPortraits,
    },
  ] as const

  return (
    <PageBody>
      <HeroSlider chairs={heroChairs} />

      <Section tone="ink" className="relative overflow-hidden border-t border-accent/20 py-20 md:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,oklch(0.72_0.11_80/0.18),transparent_42%),radial-gradient(ellipse_at_100%_100%,oklch(0.28_0.02_75/0.4),transparent_50%)]"
        />
        <Container className="relative">
          <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.24em] text-accent uppercase">
                Who we are
              </p>
              <h2 className="mt-4 font-heading text-4xl font-semibold tracking-tight text-accent md:text-5xl lg:text-[3.5rem] lg:leading-[1.08]">
                {SITE.name}
              </h2>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-primary-foreground/65 md:text-xl">
                {SITE.tagline}
              </p>
              <div className="mt-8 h-px w-16 bg-accent" />
              <p className="mt-8 max-w-sm text-sm leading-relaxed text-primary-foreground/55">
                An action and think tank of women leaders—and the allies beside
                them—working toward gender parity within this decade.
              </p>
            </div>

            <div className="space-y-0">
              <div className="group border-t border-primary-foreground/15 py-8 first:border-t-0 first:pt-0 md:py-9">
                <div className="flex gap-5 md:gap-8">
                  <span className="font-heading text-2xl font-medium text-accent/70 tabular-nums md:text-3xl">
                    01
                  </span>
                  <div className="min-w-0 space-y-3">
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
                      Vision
                    </p>
                    <p className="text-base leading-relaxed text-primary-foreground/88 md:text-lg">
                      {hierarchy.about.vision || SITE.vision}
                    </p>
                  </div>
                </div>
              </div>
              <div className="border-t border-primary-foreground/15 py-8 md:py-9">
                <div className="flex gap-5 md:gap-8">
                  <span className="font-heading text-2xl font-medium text-accent/70 tabular-nums md:text-3xl">
                    02
                  </span>
                  <div className="min-w-0 space-y-3">
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
                      Mission
                    </p>
                    <p className="text-base leading-relaxed text-primary-foreground/88 md:text-lg">
                      {hierarchy.about.mission || SITE.mission}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 border-t border-primary-foreground/15 pt-8">
                <Button size="lg" variant="brand" className="h-12" asChild>
                  <Link href="/about">About Us</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 border-primary-foreground/35 bg-transparent text-primary-foreground hover:border-primary-foreground/55 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  asChild
                >
                  <Link href="/join">Join G100</Link>
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="band" className="py-12 md:py-14">
        <Container>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-6">
            {BLUEPRINT.map((item) => (
              <div key={item.label} className="text-center md:text-left">
                <p className="font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  {item.value}
                </p>
                <p className="mt-2 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="py-20 md:py-28">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20 xl:gap-28">
            <div className="relative order-2 lg:order-1">
              <div
                aria-hidden
                className="absolute -inset-3 border border-accent/35 md:-inset-4"
              />
              <div className="relative aspect-[4/5] overflow-hidden bg-muted lg:aspect-[5/6]">
                <Image
                  src={SITE.heroImage}
                  alt="G100 Global Women Leaders"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-[900ms] ease-out hover:scale-[1.04]"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-primary/50 via-transparent to-transparent"
                />
              </div>
              <div
                aria-hidden
                className="absolute -right-2 -bottom-2 h-24 w-24 border-r border-b border-accent/50 md:-right-3 md:-bottom-3"
              />
            </div>
            <div className="order-1 space-y-6 lg:order-2">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-accent uppercase">
                Why G100?
              </p>
              <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl lg:leading-[1.1]">
                {SITE.whyHeadline}
              </h2>
              <div className="h-px w-16 bg-accent/80" />
              <p className="w-full text-base leading-relaxed text-muted-foreground md:text-lg">
                {SITE.whyBody}
              </p>
              <Link
                href="/about"
                className="link-accent group inline-flex items-center gap-2.5 pt-1 text-sm tracking-wide"
              >
                Learn more about our work
                <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="muted" className="py-20 md:py-28">
        <Container>
          <SectionHeader
            eyebrow="Pathways"
            title="Engage with the network"
            description={`Explore wings, chapters, clubs, and ${formatCount(allChairs.length)} Global Chairs advancing gender parity with us.`}
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {pathways.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all duration-500 hover:border-accent/45 hover:shadow-[0_28px_56px_-36px_oklch(0.145_0.01_75/0.5)] lg:rounded-none"
              >
                <div className="relative aspect-[5/4] overflow-hidden bg-surface-inset">
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-contain object-center"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary/55 to-transparent"
                  />
                  <span className="absolute bottom-4 left-4 font-heading text-2xl font-medium text-accent tabular-nums md:bottom-5 md:left-5 md:text-3xl">
                    {item.index}
                  </span>
                </div>

                <div className="flex flex-1 flex-col justify-between gap-5 p-5 md:p-6">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">
                      {item.stat}
                    </p>
                    <p className="mt-2 font-heading text-2xl font-semibold tracking-tight transition-colors duration-300 group-hover:text-accent md:text-[1.65rem]">
                      {item.label}
                    </p>
                    <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <PortraitStack portraits={[...item.portraits]} />
                    <span className="ml-auto inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-accent uppercase">
                      Explore
                      <ArrowRightIcon className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

            <div className="mt-14 border-t border-border pt-14 md:mt-16 md:pt-16">
            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.22em] text-accent uppercase">
                  Global Chairs
                </p>
                <h3 className="mt-2 font-heading text-2xl font-semibold tracking-tight md:text-3xl">
                  Complete network
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatCount(allChairs.length)} leaders — showing a few first,
                  then more as you scroll.
                </p>
              </div>
            </div>
            <NetworkChairsScroll
              chairs={allChairs}
              initialCount={4}
              pageSize={4}
              contained={false}
            />
          </div>

          {wingPages.length > 0 ? (
            <div className="mt-14 border-t border-border pt-14 md:mt-16 md:pt-16">
              <div className="mb-8 space-y-2">
                <p className="text-[11px] font-semibold tracking-[0.22em] text-accent uppercase">
                  Wings
                </p>
                <h3 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
                  100 sectors of leadership
                </h3>
                <p className="text-sm text-muted-foreground">
                  {formatCount(wingPages.length)} wings — scroll to load more.
                </p>
              </div>
              <PagesScroll
                pages={wingPages}
                initialCount={4}
                pageSize={4}
                contained={false}
                endLabel={`All ${wingPages.length} wings`}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              />
            </div>
          ) : null}

          {chapterPages.length > 0 ? (
            <div className="mt-14 border-t border-border pt-14 md:mt-16 md:pt-16">
              <div className="mb-8 space-y-2">
                <p className="text-[11px] font-semibold tracking-[0.22em] text-accent uppercase">
                  Chapters
                </p>
                <h3 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
                  Country, state, and city chairs
                </h3>
                <p className="text-sm text-muted-foreground">
                  {formatCount(chapterPages.length)} chapter profiles — scroll to
                  load more.
                </p>
              </div>
              <PagesScroll
                pages={chapterPages}
                initialCount={4}
                pageSize={4}
                contained={false}
                endLabel={`All ${chapterPages.length} chapter profiles`}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              />
            </div>
          ) : null}
        </Container>
      </Section>

      <Section tone="ink" className="relative overflow-hidden py-0">
        <div className="grid lg:grid-cols-2">
          <div className="relative min-h-[24rem] lg:min-h-[36rem]">
            <Image
              src={SITE.denimImage}
              alt="G100 Denim Club"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition-transform duration-[1200ms] ease-out hover:scale-[1.03]"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-primary/40 lg:bg-gradient-to-r lg:from-transparent lg:via-primary/25 lg:to-primary/55"
            />
          </div>
          <div className="relative flex flex-col justify-center px-5 py-16 sm:px-8 lg:px-14 xl:px-20">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,oklch(0.72_0.11_80/0.14),transparent_55%)]"
            />
            <div className="relative">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-accent uppercase">
                Denim Club
              </p>
              <h2 className="mt-4 font-heading text-3xl font-semibold tracking-tight md:text-4xl lg:text-[2.85rem] lg:leading-[1.12]">
                He-for-She champions for gender parity
              </h2>
              <div className="mt-6 h-px w-16 bg-accent" />
              <p className="mt-6 max-w-xl text-base leading-relaxed text-primary-foreground/72 md:text-lg">
                {SITE.denimWhy}
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button size="lg" variant="brand" className="h-12" asChild>
                  <Link href="/denim-club">Explore Denim Club</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 border-primary-foreground/35 bg-transparent text-primary-foreground hover:border-primary-foreground/55 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  asChild
                >
                  <Link href="/denim-club/dialogues">Dialogues</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {denimPages.length > 0 ? (
          <Container className="relative border-t border-primary-foreground/10 py-14 md:py-16">
            <div className="mb-8 space-y-2">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-accent uppercase">
                Denim Partners
              </p>
              <h3 className="font-heading text-2xl font-semibold tracking-tight text-primary-foreground md:text-3xl">
                Champions across the network
              </h3>
              <p className="text-sm text-primary-foreground/60">
                {formatCount(denimPages.length)} partners — scroll to load more.
              </p>
            </div>
            <PagesScroll
              pages={denimPages}
              initialCount={4}
              pageSize={4}
              contained={false}
              endLabel={`All ${denimPages.length} Denim partners`}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            />
          </Container>
        ) : null}
      </Section>

      <Section className="py-20 md:py-28">
        <Container>
          <SectionHeader
            eyebrow="Gatherings"
            title="Leadership meetings"
            description={`A chronicle of ${formatCount(meetings.length)} G100 missions and gatherings worldwide. A few first — scroll to load more.`}
          />
          <MeetingsScroll
            meetings={meetings}
            initialCount={4}
            pageSize={4}
            contained={false}
          />
        </Container>
      </Section>

      <Section tone="band" className="py-12 md:py-14">
        <Container className="space-y-6">
          <p className="text-center text-[11px] font-semibold tracking-[0.22em] text-accent uppercase">
            Sister platforms
          </p>
          <SisterPlatformsStrip />
        </Container>
      </Section>

      <Section tone="ink" className="relative overflow-hidden py-20 md:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.72_0.11_80/0.2),transparent_55%)]"
        />
        <Container className="relative">
          <div className="w-full text-center lg:mx-auto">
            <p className="text-[11px] font-semibold tracking-[0.24em] text-accent uppercase">
              Join the movement
            </p>
            <h2 className="mt-4 font-heading text-3xl font-semibold tracking-tight text-primary-foreground md:text-4xl lg:text-5xl lg:leading-[1.1]">
              Build a gender-equal future with us
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-primary-foreground/65 md:text-lg">
              Whether you lead a wing, a chapter, or stand as a He-for-She
              champion—there is a place for you in G100.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" variant="brand" className="h-12" asChild>
                <Link href="/join">Join G100</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-primary-foreground/35 bg-transparent text-primary-foreground hover:border-primary-foreground/55 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                asChild
              >
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </PageBody>
  )
}
