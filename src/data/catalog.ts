import "server-only";

import seed from "../../data/catalog.full.json";
import sampleSeed from "../../data/catalog.samples.json";
import dimensionSeed from "../../data/catalog.dimensions.json";
import specificationSeed from "../../data/catalog.specifications.json";
import technicalImageSeed from "../../data/catalog.technical-images.json";
import type { Locale } from "@/lib/i18n";
import type { CategoryId } from "@/data/categories";
export type { CategoryId } from "@/data/categories";
export type LocalizedText = Record<Locale, string>;

export type Product = {
  id: string;
  sku: string;
  slug: string;
  categoryId: CategoryId;
  name: string;
  names?: LocalizedText;
  image: string;
  variants: ProductVariant[];
  priceUsd?: number;
  variantCount: number;
  isNew?: boolean;
  availability: "in_stock" | "low_stock" | "preorder" | "on_request";
  availableQuantity?: number;
  tradePriceHidden?: boolean;
  dimensions?: string;
  composition?: string;
  dimensionImage?: string;
  technicalImages?: Array<{ kind: "dimensions" | "sewing"; image: string }>;
};

export type ProductVariant = { id: string; image: string };

type SeedProduct = {
  id: string;
  sku: string;
  slug: string;
  categoryId: CategoryId;
  status: "active";
  names: LocalizedText;
  primaryImageKey: string;
  variants?: Array<{ id: string; imageKey: string }>;
  priceUsd?: number;
  variantCount: number;
  isNew: boolean;
  dimensions?: Partial<LocalizedText>;
  composition?: Partial<LocalizedText>;
};

type SpecificationSeed = Record<string, {
  sku: string;
  dimensions?: Partial<LocalizedText>;
  composition?: Partial<LocalizedText>;
}>;

const dimensionPhotoOnlyIds = new Set(["1100", "1101", "1293", "1326", "1327", "1328", "1383", "1512", "1580", "1581", "1613", "1614"]);

const assetsBaseUrl = process.env.NEXT_PUBLIC_ASSETS_URL?.replace(/\/$/, "");

function assetUrl(key: string, version: number): string {
  const normalizedKey = key.replace(/^\//, "");
  const path = assetsBaseUrl ? `${assetsBaseUrl}/${normalizedKey}` : `/${normalizedKey}`;
  // External R2 assets are immutable and already versioned by their object key.
  // Avoid appending a query string: Next's Cloudflare image optimizer rejects
  // remote URLs with a search component in some edge runtimes.
  return assetsBaseUrl ? path : `${path}?v=${version}`;
}

const fallbackSpecifications: Record<CategoryId, { dimensions: LocalizedText; composition: LocalizedText }> = {
  "tassels-large": {
    dimensions: { en: "Overall length confirmed per article", de: "Gesamtlänge je Artikel bestätigt", uk: "Загальна довжина уточнюється для артикула", ru: "Общая длина уточняется для артикула" },
    composition: { en: "Fibre blend confirmed per colourway", de: "Fasermischung je Farbvariante", uk: "Склад уточнюється для обраного кольору", ru: "Состав уточняется для выбранного цвета" },
  },
  "tassels-small": {
    dimensions: { en: "Overall length confirmed per article", de: "Gesamtlänge je Artikel bestätigt", uk: "Загальна довжина уточнюється для артикула", ru: "Общая длина уточняется для артикула" },
    composition: { en: "Fibre blend confirmed per colourway", de: "Fasermischung je Farbvariante", uk: "Склад уточнюється для обраного кольору", ru: "Состав уточняется для выбранного цвета" },
  },
  "tassel-trim": {
    dimensions: { en: "Tape width and drop confirmed per article", de: "Bandbreite und Fall je Artikel", uk: "Ширина стрічки й висота уточнюються", ru: "Ширина ленты и высота уточняются" },
    composition: { en: "Fibre blend confirmed per colourway", de: "Fasermischung je Farbvariante", uk: "Склад уточнюється для обраного кольору", ru: "Состав уточняется для выбранного цвета" },
  },
  "decorative-tapes": {
    dimensions: { en: "Width confirmed per article", de: "Breite je Artikel bestätigt", uk: "Ширина уточнюється для артикула", ru: "Ширина уточняется для артикула" },
    composition: { en: "Fibre composition available with quotation", de: "Faserzusammensetzung mit Angebot", uk: "Склад надається разом із пропозицією", ru: "Состав предоставляется вместе с предложением" },
  },
  fringe: {
    dimensions: { en: "Tape width and fringe drop confirmed per article", de: "Bandbreite und Fransenfall je Artikel", uk: "Ширина стрічки й висота бахроми уточнюються", ru: "Ширина ленты и высота бахромы уточняются" },
    composition: { en: "Fibre blend confirmed per colourway", de: "Fasermischung je Farbvariante", uk: "Склад уточнюється для обраного кольору", ru: "Состав уточняется для выбранного цвета" },
  },
  "cord-fringe": {
    dimensions: { en: "Tape width and fringe drop confirmed per article", de: "Bandbreite und Fransenfall je Artikel", uk: "Ширина стрічки й висота бахроми уточнюються", ru: "Ширина ленты и высота бахромы уточняются" },
    composition: { en: "Fibre blend confirmed per colourway", de: "Fasermischung je Farbvariante", uk: "Склад уточнюється для обраного кольору", ru: "Состав уточняется для выбранного цвета" },
  },
  cords: {
    dimensions: { en: "Cord diameter confirmed per article", de: "Kordeldurchmesser je Artikel", uk: "Діаметр шнура уточнюється для артикула", ru: "Диаметр шнура уточняется для артикула" },
    composition: { en: "Fibre composition available with quotation", de: "Faserzusammensetzung mit Angebot", uk: "Склад надається разом із пропозицією", ru: "Состав предоставляется вместе с предложением" },
  },
  holdbacks: {
    dimensions: { en: "Overall length confirmed per article", de: "Gesamtlänge je Artikel bestätigt", uk: "Загальна довжина уточнюється для артикула", ru: "Общая длина уточняется для артикула" },
    composition: { en: "Fibre and hardware specification on request", de: "Faser- und Beschlagsdaten auf Anfrage", uk: "Склад волокон і фурнітури — за запитом", ru: "Состав волокон и фурнитуры — по запросу" },
  },
  home: {
    dimensions: { en: "Dimensions confirmed per article", de: "Maße je Artikel bestätigt", uk: "Розміри уточнюються для артикула", ru: "Размеры уточняются для артикула" },
    composition: { en: "Material specification available with quotation", de: "Materialspezifikation mit Angebot", uk: "Специфікація матеріалів — разом із пропозицією", ru: "Спецификация материалов — вместе с предложением" },
  },
  samples: {
    dimensions: { en: "Format confirmed per article", de: "Format je Artikel bestätigt", uk: "Формат уточнюється для артикула", ru: "Формат уточняется для артикула" },
    composition: { en: "Sample card or presentation set", de: "Musterkarte oder Präsentationsset", uk: "Карта зразків або презентаційний комплект", ru: "Карта образцов или презентационный комплект" },
  },
};

export function getFallbackSpecifications(categoryId: CategoryId, locale: Locale) {
  const specification = fallbackSpecifications[categoryId];
  return { dimensions: specification.dimensions[locale], composition: specification.composition[locale] };
}

export function getSeedProducts(locale: Locale): Product[] {
  return ([...(seed as SeedProduct[]), ...(sampleSeed as SeedProduct[])]).map((product) => {
    const imported = (specificationSeed as SpecificationSeed)[product.id];
    const fallback = getFallbackSpecifications(product.categoryId, locale);
    return {
      id: product.id,
      sku: product.sku,
      slug: product.slug,
      categoryId: product.categoryId,
      name: product.names[locale],
      names: product.names,
      image: assetUrl(product.primaryImageKey, 6),
      variants: (product.variants?.length ? product.variants : [{ id: `${product.id}-default`, imageKey: product.primaryImageKey }]).map((variant) => ({
        id: variant.id,
        image: assetUrl(variant.imageKey, 7),
      })),
      priceUsd: product.priceUsd,
      variantCount: product.variantCount,
      isNew: product.isNew,
      availability: "on_request",
      dimensions: imported?.dimensions?.[locale] || product.dimensions?.[locale] || fallback.dimensions,
      composition: imported?.composition?.[locale] || product.composition?.[locale] || fallback.composition,
      dimensionImage: !dimensionPhotoOnlyIds.has(product.id) && (dimensionSeed as Record<string, string>)[product.id]
        ? assetUrl((dimensionSeed as Record<string, string>)[product.id], 3)
        : undefined,
      technicalImages: ((technicalImageSeed as Record<string, Array<{ kind: "dimensions" | "sewing"; image: string }>>)[product.id] || [])
        .map((item) => ({ ...item, image: assetUrl(item.image, 1) })),
    };
  });
}

export function getProductSummaries(locale: Locale): Product[] {
  return getSeedProducts(locale).map((product) => ({
    ...product,
    variants: product.variants.slice(0, 1),
  }));
}
