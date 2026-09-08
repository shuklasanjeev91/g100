import type { Metadata, Viewport } from "next"
import { Cormorant_Garamond, Geist_Mono, Manrope } from "next/font/google"

import { MobileTabBar } from "@/components/mobile-tab-bar"
import { Providers } from "@/components/providers"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { SITE } from "@/lib/site"

import "./globals.css"

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f4" },
    { media: "(prefers-color-scheme: dark)", color: "#1a160f" },
  ],
}

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} – Global Women Leaders Network`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.mission,
  metadataBase: new URL(SITE.url),
  icons: {
    icon: [
      { url: "/brand/g100-icon-32.jpg", sizes: "32x32", type: "image/jpeg" },
      { url: "/brand/g100-icon-192.jpg", sizes: "192x192", type: "image/jpeg" },
    ],
    apple: [{ url: "/brand/g100-icon-192.jpg", sizes: "192x192" }],
  },
  openGraph: {
    title: `${SITE.name} – ${SITE.tagline}`,
    description: SITE.vision,
    url: SITE.url,
    siteName: SITE.name,
    images: [{ url: SITE.heroImage }],
  },
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${geistMono.variable} ${cormorant.variable} h-full scroll-smooth`}
    >
      <body
        className="flex min-h-full flex-col font-sans antialiased"
        suppressHydrationWarning
      >
        <Providers>
          <SiteHeader />
          <main className="flex flex-1 flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
            {children}
          </main>
          <SiteFooter />
          <MobileTabBar />
        </Providers>
      </body>
    </html>
  )
}
