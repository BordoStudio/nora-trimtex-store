import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";
import { ContactChat } from "@/components/ContactChat";
import { isLocale } from "@/lib/i18n";
import { languageAlternates, siteUrl } from "@/lib/site";
import { getPartnerPricingContext } from "@/lib/partner-pricing";
import { DocumentLanguage } from "@/components/DocumentLanguage";
import { StoreFooter } from "@/components/StoreFooter";

// Render localized storefront pages on request. This avoids the Next.js 16
// parallel prerender workStore bug while preserving fully indexable SSR HTML.
export const dynamic = "force-dynamic";

const descriptions = {
  en: "Curtain trimmings, tassels, wall hooks, rosettes, fringes, piping, braids and cords for interior projects.",
  de: "Vorhangzubehör, Quasten, Wandhaken, Rosetten, Fransen, Paspeln, Borten und Kordeln für Interior-Projekte.",
  uk: "Фурнітура для штор: китиці, настінні гачки, розетки, бахрома, канти, тасьма й шнури для інтер’єрних проєктів.",
  ru: "Фурнитура для штор: кисти, настенные крючки, розетки, бахрома, бордюры, тесьмы и шнуры для интерьерных проектов.",
};

const homeTitles = {
  en: "Nora TrimTex — Curtain trimmings",
  de: "Nora TrimTex — Vorhangzubehör",
  uk: "Nora TrimTex — Фурнітура для штор",
  ru: "Nora TrimTex — Фурнитура для штор",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: { default: homeTitles[locale], template: "%s · Nora TrimTex" },
    description: descriptions[locale],
    alternates: { canonical: `${siteUrl}/${locale}`, languages: languageAlternates() },
    openGraph: { locale, url: `${siteUrl}/${locale}`, title: homeTitles[locale], description: descriptions[locale] },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const pricing = await getPartnerPricingContext();
  return <>
    <link rel="preload" href="/fonts/libre-bodoni-regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
    <DocumentLanguage locale={locale} />
    <Providers priceTier={pricing.priceTier}><a className="skip-link" href="#main-content">{{ru:"К содержимому",uk:"До вмісту",en:"Skip to content",de:"Zum Inhalt"}[locale]}</a><Header locale={locale} /><main id="main-content" tabIndex={-1}>{children}</main><StoreFooter locale={locale} /><CartDrawer locale={locale} /><ContactChat locale={locale} /></Providers>
  </>;
}
