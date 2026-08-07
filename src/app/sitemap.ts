import type { MetadataRoute } from "next";
import seed from "../../data/catalog.full.json";
import { locales } from "@/lib/i18n";
import { languageAlternates, siteUrl } from "@/lib/site";

type SitemapProduct = { slug: string };

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-07-18T00:00:00Z");
  const staticEntries = locales.flatMap((locale) => [
    { url: `${siteUrl}/${locale}`, lastModified, changeFrequency: "weekly" as const, priority: 1, alternates: { languages: languageAlternates() } },
    { url: `${siteUrl}/${locale}/catalog`, lastModified, changeFrequency: "daily" as const, priority: .9, alternates: { languages: languageAlternates("/catalog") } },
    { url: `${siteUrl}/${locale}/about`, lastModified, changeFrequency: "monthly" as const, priority: .6, alternates: { languages: languageAlternates("/about") } },
    { url: `${siteUrl}/${locale}/privacy`, lastModified, changeFrequency: "yearly" as const, priority: .2, alternates: { languages: languageAlternates("/privacy") } },
  ]);
  const productEntries = (seed as SitemapProduct[]).flatMap((product) => locales.map((locale) => ({
    url: `${siteUrl}/${locale}/product/${product.slug}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: .7,
    alternates: { languages: languageAlternates(`/product/${product.slug}`) },
  })));
  return [...staticEntries, ...productEntries];
}
