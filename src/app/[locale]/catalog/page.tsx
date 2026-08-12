import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CatalogClient } from "@/components/CatalogClient";
import { getDictionary, isLocale } from "@/lib/i18n";
import { getCatalogProducts } from "@/lib/catalog-api";
import { jsonLd, languageAlternates, siteUrl } from "@/lib/site";
import { getPartnerPricingContext } from "@/lib/partner-pricing";
import { categoryIds, type CategoryId } from "@/data/categories";

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

const categoryBody = {
  en: (name: string) => `Explore ${name.toLocaleLowerCase("en")} for curtains and interior textiles. Check availability.`,
  de: (name: string) => `Entdecken Sie ${name} für Vorhänge und textile Raumgestaltung. Verfügbarkeit prüfen.`,
  uk: (name: string) => `Перегляньте ${name.toLocaleLowerCase("uk")} для штор та інтер’єрного текстилю. Дізнавайтеся про наявність.`,
  ru: (name: string) => `Посмотрите ${name.toLocaleLowerCase("ru")} для штор и интерьерного текстиля. Узнавайте наличие.`,
};

export async function generateMetadata({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ category?: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const requestedCategory = (await searchParams).category;
  const category = categoryIds.includes(requestedCategory as CategoryId) ? requestedCategory as CategoryId : undefined;
  const dictionary = getDictionary(locale);
  const title = category ? `${dictionary.categories[category]} — ${dictionary.catalog.title}` : dictionary.catalog.title;
  const path = category ? `/catalog?category=${category}` : "/catalog";
  const description = category ? `${dictionary.categories[category]}. ${descriptions[locale]}` : descriptions[locale];
  return { title, description, alternates: { canonical: `${siteUrl}/${locale}${path}`, languages: languageAlternates(path) }, openGraph: { url: `${siteUrl}/${locale}${path}`, title, description } };
}

export default async function CatalogPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ category?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { category } = await searchParams;
  const t = getDictionary(locale);
  const selectedCategory = categoryIds.includes(category as CategoryId) ? category as CategoryId : undefined;
  const intro = selectedCategory === "samples"
    ? sampleIntro[locale]
    : selectedCategory
      ? { eyebrow: t.catalog.eyebrow, title: t.categories[selectedCategory], body: categoryBody[locale](t.categories[selectedCategory]) }
      : { eyebrow: t.catalog.eyebrow, title: t.catalog.title, body: t.catalog.body };
  const pricing = await getPartnerPricingContext();
  const products = await getCatalogProducts(locale, { limit: 1_000, includePrices: pricing.hasAccess, discountPercent: pricing.discountPercent });
  const listedProducts = selectedCategory ? products.filter((product) => product.categoryId === selectedCategory) : products;
  const path = selectedCategory ? `/catalog?category=${selectedCategory}` : "/catalog";
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${siteUrl}/${locale}${path}#collection`,
    name: intro.title,
    description: intro.body,
    url: `${siteUrl}/${locale}${path}`,
    inLanguage: locale,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: listedProducts.length,
      itemListElement: listedProducts.slice(0, 36).map((product, index) => ({ "@type": "ListItem", position: index + 1, name: `${product.sku} — ${product.name}`, url: `${siteUrl}/${locale}/product/${product.slug}` })),
    },
  };
  return <section className={`catalog-page${selectedCategory === "samples" ? " samples-page" : ""}`}><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} /><header className="catalog-intro"><p className="eyebrow">{intro.eyebrow}</p><h1>{intro.title}</h1><p>{intro.body}</p></header><CatalogClient locale={locale} initialProducts={products} /></section>;
}
