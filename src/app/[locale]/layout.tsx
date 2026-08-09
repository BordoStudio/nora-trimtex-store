import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";
import { ContactChat } from "@/components/ContactChat";
import { getDictionary, isLocale } from "@/lib/i18n";
import { languageAlternates, siteUrl } from "@/lib/site";
import { hasPartnerPricingAccess } from "@/lib/partner-pricing";
import { BrandLogo } from "@/components/BrandLogo";

// Render localized storefront pages on request. This avoids the Next.js 16
// parallel prerender workStore bug while preserving fully indexable SSR HTML.
export const dynamic = "force-dynamic";

const descriptions = {
  en: "Curtain trimmings, tassels, wall hooks, rosettes, fringes, piping, braids and cords for interior projects.",
  de: "Vorhangzubehör, Quasten, Wandhaken, Rosetten, Fransen, Paspeln, Borten und Kordeln für Interior-Projekte.",
  uk: "Фурнітура для штор: китиці, настінні гачки, розетки, бахрома, канти, тасьма й шнури для інтер’єрних проєктів.",
  ru: "Фурнитура для штор: кисти, настенные крючки, розетки, бахрома, бордюры, тесьмы и шнуры для интерьерных проектов.",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: { default: "Nora TrimTex", template: "%s · Nora TrimTex" },
    description: descriptions[locale],
    alternates: { canonical: `${siteUrl}/${locale}`, languages: languageAlternates() },
    openGraph: { locale, url: `${siteUrl}/${locale}`, title: "Nora TrimTex", description: descriptions[locale] },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const partnerPricingAccess = await hasPartnerPricingAccess();
  const footerLinks = {
    en: { about: "About", catalog: "Catalogue", privacy: "Privacy" },
    de: { about: "Über uns", catalog: "Katalog", privacy: "Datenschutz" },
    uk: { about: "Про бренд", catalog: "Каталог", privacy: "Конфіденційність" },
    ru: { about: "О бренде", catalog: "Каталог", privacy: "Конфиденциальность" },
  }[locale];
  return <Providers><Header locale={locale} /><main>{children}</main><footer className="site-footer"><div className="brand footer-brand"><BrandLogo footer /></div><p>{t.footer.note}</p><nav className="footer-nav"><Link href={`/${locale}/about`}>{footerLinks.about}</Link><Link href={`/${locale}/catalog`}>{footerLinks.catalog}</Link><Link href={`/${locale}/privacy`}>{footerLinks.privacy}</Link></nav><span>{t.footer.legal}</span></footer><CartDrawer locale={locale} partnerPricingAccess={partnerPricingAccess} /><ContactChat locale={locale} /></Providers>;
}
