import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CatalogClient } from "@/components/CatalogClient";
import { getDictionary, isLocale } from "@/lib/i18n";
import { getCatalogProducts } from "@/lib/catalog-api";
import { languageAlternates, siteUrl } from "@/lib/site";
import { hasPartnerPricingAccess } from "@/lib/partner-pricing";

const descriptions = {
  en: "Shop curtain tassels, wall hooks, rosettes, fringes, piping, braids and cords with clear article numbers and colourways.",
  de: "Entdecken Sie Quasten, Wandhaken, Rosetten, Fransen, Paspeln, Borten und Kordeln für Vorhänge mit Artikeln und Farbvarianten.",
  uk: "Каталог фурнітури для штор: китиці, настінні гачки, розетки, бахрома, канти, тасьма й шнури з артикулами та кольорами.",
  ru: "Каталог фурнитуры для штор: кисти, настенные крючки, розетки, бахрома, бордюры, тесьмы и шнуры с артикулами и цветами.",
};

const sampleIntro = {
  en: { eyebrow: "SAMPLE CATALOGUES", title: "Collections you can hold in your hands.", body: "Sample books, presentation cards and collection boxes arranged as in the original catalogue. Open a set to see its details or add it to your order." },
  de: { eyebrow: "MUSTERKATALOGE", title: "Kollektionen zum Anfassen.", body: "Musterbücher, Präsentationskarten und Kollektionboxen in der Anordnung des Originalkatalogs. Öffnen Sie ein Set oder fügen Sie es Ihrer Bestellung hinzu." },
  uk: { eyebrow: "КАТАЛОГИ ЗРАЗКІВ", title: "Колекції, які можна побачити наживо.", body: "Книги зразків, презентаційні карти та бокси колекцій у структурі оригінального каталогу. Відкрийте комплект або додайте його до замовлення." },
  ru: { eyebrow: "КАТАЛОГИ ОБРАЗЦОВ", title: "Коллекции, которые можно увидеть вживую.", body: "Книги образцов, презентационные карты и боксы коллекций в раскладке оригинального каталога. Откройте комплект или добавьте его к заказу." },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const title = getDictionary(locale).catalog.title;
  return { title, description: descriptions[locale], alternates: { canonical: `${siteUrl}/${locale}/catalog`, languages: languageAlternates("/catalog") }, openGraph: { url: `${siteUrl}/${locale}/catalog`, title, description: descriptions[locale] } };
}

export default async function CatalogPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ category?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { category } = await searchParams;
  const t = getDictionary(locale);
  const intro = category === "samples" ? sampleIntro[locale] : { eyebrow: t.catalog.eyebrow, title: t.catalog.title, body: t.catalog.body };
  const partnerPricingAccess = await hasPartnerPricingAccess();
  const products = await getCatalogProducts(locale, { limit: 1_000, includePrices: partnerPricingAccess });
  return <section className={`catalog-page${category === "samples" ? " samples-page" : ""}`}><header className="catalog-intro"><p className="eyebrow">{intro.eyebrow}</p><h1>{intro.title}</h1><p>{intro.body}</p></header><CatalogClient locale={locale} initialProducts={products} /></section>;
}
