import Link from "next/link"

import { SiteBrandLogo } from "@/components/site-brand-logo"
import { Container } from "@/components/page-shell"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <Container className="flex flex-1 flex-col items-start justify-center gap-8 py-20 md:py-28">
        <SiteBrandLogo size="lg" className="size-16" />
        <div className="max-w-xl space-y-4">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-accent">
            404
          </p>
          <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
            Page Not Found
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
            This link is missing or no longer available. Search the network or
            return home to continue.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            asChild
          >
            <Link href="/">Go Home</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/search">Search</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/wings">Global Chairs</Link>
          </Button>
        </div>
      </Container>
    </div>
  )
}
