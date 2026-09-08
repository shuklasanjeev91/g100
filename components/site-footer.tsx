import Link from "next/link"

import { SiteBrandLogo } from "@/components/site-brand-logo"
import { SisterPlatformsStrip } from "@/components/sister-platforms"
import { Container } from "@/components/page-shell"
import { footerColumns, SITE } from "@/lib/site"

export function SiteFooter() {
  return (
    <footer className="mt-auto w-full bg-primary text-primary-foreground">
      <div className="h-0.5 w-full bg-accent" />

      {/* Compact mobile app footer */}
      <Container className="space-y-5 py-8 lg:hidden">
        <div className="flex items-center gap-3">
          <SiteBrandLogo size="sm" className="size-10" />
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-wide">{SITE.name}</p>
            <p className="truncate text-xs text-primary-foreground/55">
              {SITE.tagline}
            </p>
          </div>
        </div>
        <SisterPlatformsStrip className="justify-start gap-3" />
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-primary-foreground/55">
          <Link href="/contact" className="transition-colors hover:text-accent">
            Contact
          </Link>
          <Link
            href="/code-of-conduct"
            className="transition-colors hover:text-accent"
          >
            Code of Conduct
          </Link>
          <span>© {new Date().getFullYear()} G100</span>
        </div>
      </Container>

      {/* Full web-app footer on large screens */}
      <div className="hidden lg:block">
        <Container className="grid gap-14 py-20 md:grid-cols-[1.1fr_2fr] lg:gap-20 lg:py-24">
          <div className="space-y-5">
            <div className="space-y-3">
              <SiteBrandLogo size="lg" />
              <p className="text-sm tracking-wide text-primary-foreground/55">
                {SITE.tagline}
              </p>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-primary-foreground/70">
              An influential network of women leaders across 100 wings and
              sectors, supported by He-for-She champions and country clubs
              worldwide.
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {footerColumns.map((column) => (
              <div key={column.title} className="space-y-4">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
                  {column.title}
                </p>
                <ul className="space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-primary-foreground/70 transition-colors hover:text-accent"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Container>

        <div className="border-t border-primary-foreground/10">
          <Container className="space-y-6 py-8">
            <p className="text-center text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">
              Sister platforms
            </p>
            <SisterPlatformsStrip />
          </Container>
        </div>

        <div className="border-t border-primary-foreground/10">
          <Container className="flex flex-col gap-3 py-5 text-xs text-primary-foreground/45 sm:flex-row sm:items-center sm:justify-between">
            <p>Copyright © G100 {new Date().getFullYear()}</p>
            <div className="flex flex-wrap gap-5">
              <Link
                href="/code-of-conduct"
                className="transition-colors hover:text-accent"
              >
                Code of Conduct
              </Link>
              <Link
                href="/zero-tolerance-policy"
                className="transition-colors hover:text-accent"
              >
                Zero Tolerance
              </Link>
              <Link href="/contact" className="transition-colors hover:text-accent">
                Contact
              </Link>
            </div>
          </Container>
        </div>
      </div>
    </footer>
  )
}
