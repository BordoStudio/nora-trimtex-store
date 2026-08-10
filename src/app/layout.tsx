import type { Metadata } from "next";
import "./globals.css";
import { siteUrl } from "@/lib/site";
import { ScrollRestoration } from "@/components/ScrollRestoration";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Nora TrimTex",
  description: "Curtain trimmings, tassels, wall hooks, rosettes, fringes, piping, braids and cords for interior projects.",
  applicationName: "Nora TrimTex",
  category: "Curtain trimmings and accessories",
  openGraph: { type: "website", siteName: "Nora TrimTex", images: [{ url: "/brand/hero.jpg", width: 1920, height: 560, alt: "Nora TrimTex curtain trimmings" }] },
  twitter: { card: "summary_large_image", images: ["/brand/hero.jpg"] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Keep the root layout request-independent. Next.js also uses it to render
  // /_not-found and /_global-error without a request workStore during builds.
  // Localized pages expose their language through Content-Language, hreflang
  // metadata and localized URLs; reading headers here makes builds unstable.
  return <html lang="en" data-scroll-behavior="smooth"><body><ScrollRestoration />{children}</body></html>;
}
