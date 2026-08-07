import type { Locale } from "@/lib/i18n";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://noratrimtex.com").replace(/\/$/, "");

export const languageAlternates = (path = "") => ({
  en: `${siteUrl}/en${path}`,
  de: `${siteUrl}/de${path}`,
  uk: `${siteUrl}/uk${path}`,
  ru: `${siteUrl}/ru${path}`,
  "x-default": `${siteUrl}/en${path}`,
});

export const htmlLanguage: Record<Locale, string> = { en: "en", de: "de", uk: "uk", ru: "ru" };

export const jsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
