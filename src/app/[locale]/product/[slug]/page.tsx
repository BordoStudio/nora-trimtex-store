import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { ProductDetailClient } from "@/components/ProductDetailClient";
import { ProductCard } from "@/components/ProductCard";
import { SampleCatalogCard } from "@/components/SampleCatalogCard";
import { SampleCatalogDetail } from "@/components/SampleCatalogDetail";
import { getCatalogProductBySlug, getCatalogProducts } from "@/lib/catalog-api";
import { getDictionary, isLocale } from "@/lib/i18n";
import { jsonLd, languageAlternates, siteUrl } from "@/lib/site";
import { getPartnerPricingContext } from "@/lib/partner-pricing";
import samplePageSeed from "../../../../../data/catalog.sample-pages.json";

function productDescription(locale: "ru" | "uk" | "de" | "en", product: { sku: string; name: string; dimensions?: string; composition?: string }, category: string) {
  const details = [product.dimensions, product.composition].filter(Boolean).join(" · ");
  const text = {
    ru: `${category} ${product.sku}: ${product.name}. ${details}. Цветовые варианты, наличие и заказ в Nora TrimTex.`,
    uk: `${category} ${product.sku}: ${product.name}. ${details}. Кольорові варіанти, наявність і замовлення в Nora TrimTex.`,
    de: `${category} ${product.sku}: ${product.name}. ${details}. Farbvarianten, Verfügbarkeit und Bestellung bei Nora TrimTex.`,
    en: `${category} ${product.sku}: ${product.name}. ${details}. Colourways, availability and ordering from Nora TrimTex.`,
  }[locale];
  return text.replace(/\.\s*\./g, ".").slice(0, 300);
}

const excludedSampleTextPages = new Set([
  "/products/sample-pages/20057/02.jpg",
  "/products/sample-pages/20058/02.jpg",
  "/products/sample-pages/19815/02.gif",
  "/products/sample-pages/19816/03.jpg",
  "/products/sample-pages/19816/04.jpg",
  "/products/sample-pages/19524/03.jpg",
  "/products/sample-pages/19524/10.jpg",
  "/products/sample-pages/19528/02.jpg",
  "/products/sample-pages/19519/02.jpg",
  "/products/sample-pages/19518/02.jpg",
]);

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const product = await getCatalogProductBySlug(locale, slug, false);
  if (!product) return {};
  const description = productDescription(locale, product, getDictionary(locale).categories[product.categoryId]);
  const title = `${product.sku} — ${product.name}`;
  const path = `/product/${product.slug}`;
  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}/${locale}${path}`, languages: languageAlternates(path) },
    openGraph: { type: "website", url: `${siteUrl}/${locale}${path}`, title, description, images: product.variants.slice(0, 4).map((variant) => ({ url: variant.image, alt: `${product.name} — ${product.sku}` })) },
    twitter: { card: "summary_large_image", title, description, images: [product.image] },
  };
}

export default async function ProductPage({ params, searchParams }: { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<{ variant?: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const pricing = await getPartnerPricingContext();
  const product = await getCatalogProductBySlug(locale, slug, pricing.hasAccess, pricing.discountPercent);
  if (!product) notFound();
  const products = await getCatalogProducts(locale, { limit: 1_000, includePrices: pricing.hasAccess, discountPercent: pricing.discountPercent });
  const t = getDictionary(locale);
  const copy = {
    ru: { quality: "Премиальное качество", samples: "Образцы доступны", description: "Фурнитура для оформления штор и интерьерного текстиля. Посмотрите доступные варианты, изучите фактуру и добавьте изделие или образец в корзину. Размер, состав и наличие подтверждаются для выбранного варианта.", dimensions: "РАЗМЕРЫ", composition: "СОСТАВ", collection: "КАТЕГОРИЯ", delivery: "ПОСТАВКА", deliveryValue: "Срок подтверждается при заказе", more: "ПОХОЖАЯ ФУРНИТУРА" },
    uk: { quality: "Преміальна якість", samples: "Зразки доступні", description: "Фурнітура для оформлення штор та інтер’єрного текстилю. Перегляньте доступні варіанти, роздивіться фактуру й додайте виріб або зразок до кошика. Розмір, склад і наявність підтверджуються для обраного варіанта.", dimensions: "РОЗМІРИ", composition: "СКЛАД", collection: "КАТЕГОРІЯ", delivery: "ПОСТАЧАННЯ", deliveryValue: "Термін підтверджується під час замовлення", more: "СХОЖА ФУРНІТУРА" },
    de: { quality: "Premiumqualität", samples: "Muster verfügbar", description: "Zubehör für Vorhänge und textile Raumgestaltung. Sehen Sie sich die verfügbaren Varianten und die Textur an und legen Sie das Produkt oder ein Muster in den Warenkorb. Maße, Material und Verfügbarkeit werden für die gewählte Variante bestätigt.", dimensions: "ABMESSUNGEN", composition: "MATERIAL", collection: "KATEGORIE", delivery: "LIEFERUNG", deliveryValue: "Termin wird bei Bestellung bestätigt", more: "ÄHNLICHES VORHANGZUBEHÖR" },
    en: { quality: "Premium quality", samples: "Samples available", description: "Trimmings for curtains and interior textiles. View the available options, examine the texture and add the product or a sample to your basket. Dimensions, composition and availability are confirmed for the selected option.", dimensions: "DIMENSIONS", composition: "COMPOSITION", collection: "CATEGORY", delivery: "DELIVERY", deliveryValue: "Lead time confirmed with order", more: "SIMILAR CURTAIN TRIMMINGS" },
  }[locale];
  const related = products.filter((item) => item.categoryId === product.categoryId && item.id !== product.id).slice(0, 4);
  const requestedVariant = (await searchParams).variant;
  const initialVariantId = product.variants.some((variant) => variant.id === requestedVariant) ? requestedVariant : product.variants[0]?.id;
  const productUrl = `${siteUrl}/${locale}/product/${product.slug}`;
  const seoDescription = productDescription(locale, product, t.categories[product.categoryId]);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProductGroup",
        "@id": `${productUrl}#product`,
        name: `${product.sku} — ${product.name}`,
        description: seoDescription,
        productGroupID: product.sku,
        sku: product.sku,
        brand: { "@type": "Brand", name: "Nora TrimTex" },
        category: t.categories[product.categoryId],
        ...(product.composition ? { material: product.composition } : {}),
        additionalProperty: [
          ...(product.dimensions ? [{ "@type": "PropertyValue", name: copy.dimensions, value: product.dimensions }] : []),
          ...(product.composition ? [{ "@type": "PropertyValue", name: copy.composition, value: product.composition }] : []),
          { "@type": "PropertyValue", name: copy.quality, value: copy.quality },
        ],
        image: product.variants.map((variant) => new URL(variant.image, siteUrl).href),
        url: productUrl,
        variesBy: "https://schema.org/color",
        hasVariant: product.variants.map((variant, index) => ({
          "@type": "Product",
          "@id": `${productUrl}?variant=${variant.id}#variant`,
          name: `${product.name} — ${locale === "de" ? "Farbe" : locale === "uk" ? "Колір" : locale === "ru" ? "Цвет" : "Colour"} ${index + 1}`,
          sku: `${product.sku}-${variant.id}`,
          color: `${index + 1}`,
          image: new URL(variant.image, siteUrl).href,
          url: `${productUrl}?variant=${variant.id}`,
          ...(product.priceUsd === undefined ? {} : { offers: { "@type": "Offer", price: product.priceUsd, priceCurrency: "USD", url: `${productUrl}?variant=${variant.id}`, itemCondition: "https://schema.org/NewCondition" } }),
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t.nav.home, item: `${siteUrl}/${locale}` },
          { "@type": "ListItem", position: 2, name: t.categories[product.categoryId], item: `${siteUrl}/${locale}/catalog?category=${product.categoryId}` },
          { "@type": "ListItem", position: 3, name: product.sku, item: productUrl },
        ],
      },
    ],
  };
  const samplePagesRaw = product.categoryId === "samples"
    ? (samplePageSeed as Record<string, string[]>)[product.id] || []
    : [];
  const filteredSamplePages = (product.sku.startsWith("Y-DL-")
    ? samplePagesRaw.slice(3, -4)
    : product.sku.startsWith("YK-DL-")
      ? samplePagesRaw.slice(1, -4)
      : samplePagesRaw).filter((page) => !excludedSampleTextPages.has(page));
  const sampleAssetsBase = process.env.NEXT_PUBLIC_ASSETS_URL?.replace(/\/$/, "");
  const samplePages = filteredSamplePages.map((page) => sampleAssetsBase ? `${sampleAssetsBase}${page}` : page);

  return <main className="product-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
    <Link className="product-back" href={`/${locale}/catalog?category=${product.categoryId}`}><ArrowLeft />{t.categories[product.categoryId]}</Link>
    {samplePages.length > 0
      ? <SampleCatalogDetail product={product} locale={locale} pages={samplePages} />
      : <ProductDetailClient product={product} locale={locale} categoryName={t.categories[product.categoryId]} copy={copy} initialVariantId={initialVariantId} />}
    {related.length > 0 && <section className="related-products"><div className="related-head"><div><p className="eyebrow">{copy.more}</p><h2>{t.categories[product.categoryId]}</h2></div><Link href={`/${locale}/catalog?category=${product.categoryId}`}>{t.home.viewAll}<ArrowRight /></Link></div>{product.categoryId === "samples" ? <div className="sample-catalog-grid">{related.map((item) => <SampleCatalogCard key={item.id} product={item} locale={locale} />)}</div> : <div className="product-grid">{related.map((item) => <ProductCard key={item.id} product={item} locale={locale} />)}</div>}</section>}
  </main>;
}
