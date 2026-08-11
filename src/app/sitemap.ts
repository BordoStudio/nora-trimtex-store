import type { MetadataRoute } from "next";
import seed from "../../data/catalog.full.json";
import sampleSeed from "../../data/catalog.samples.json";
import { categoryIds } from "@/data/categories";
import { locales } from "@/lib/i18n";
import { languageAlternates, siteUrl } from "@/lib/site";

type SitemapProduct = { slug: string };

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-08-10T00:00:00Z");
  const staticEntries = locales.flatMap((locale) => [
    { url: `${siteUrl}/${locale}`, lastModified, changeFrequency: "weekly" as const, priority: 1, alternates: { languages: languageAlternates() } },
    { url: `${siteUrl}/${locale}/catalog`, lastModified, changeFrequency: "daily" as const, priority: .9, alternates: { languages: languageAlternates("/catalog") } },
    { url: `${siteUrl}/${locale}/about`, lastModified, changeFrequency: "monthly" as const, priority: .6, alternates: { languages: languageAlternates("/about") } },
    { url: `${siteUrl}/${locale}/privacy`, lastModified, changeFrequency: "yearly" as const, priority: .2, alternates: { languages: languageAlternates("/privacy") } },
  ]);
  const categoryEntries = categoryIds.flatMap((category) => locales.map((locale) => ({
    url: `${siteUrl}/${locale}/catalog?category=${category}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: .8,
    alternates: { languages: languageAlternates(`/catalog?category=${category}`) },
  })));
  const products = Array.from(new Map([...(seed as SitemapProduct[]), ...(sampleSeed as SitemapProduct[])].map((product) => [product.slug, product])).values());
  const productEntries = products.flatMap((product) => locales.map((locale) => ({
    url: `${siteUrl}/${locale}/product/${product.slug}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: .7,
    alternates: { languages: languageAlternates(`/product/${product.slug}`) },
  })));
  return [...staticEntries, ...categoryEntries, ...productEntries];
}
