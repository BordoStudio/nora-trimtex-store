import { getFallbackSpecifications, getSeedProductBySlug, getSeedProducts, getSeedProductsByCategory, getSeedProductsBySearch, type CategoryId, type Product } from "@/data/catalog";
import type { Locale } from "@/lib/i18n";
import { cache } from "react";

type CatalogResponse = {
  data: Array<Omit<Product, "variants"> & { variants?: Product["variants"] }>;
  pagination: { page: number; limit: number; total: number; pages: number };
};

export type PriceTier = "retail" | "partner";

const apiUrl = process.env.CATALOG_API_URL || process.env.NEXT_PUBLIC_API_URL;

function withoutPricingInternals(product: Product): Product {
  const safeProduct = { ...product };
  delete safeProduct.retailPriceUsd;
  delete safeProduct.partnerPriceUsd;
  return safeProduct;
}

function designerPrice(product: Product | undefined) {
  return product?.partnerPriceUsd ?? product?.priceUsd;
}

function resolvePricingSource(apiProduct: Product, localProduct?: Product): Product {
  if (apiProduct.partnerPriceUsd !== undefined) return apiProduct;
  const apiDesignerPrice = apiProduct.priceUsd;
  const localDesignerPrice = designerPrice(localProduct);
  if (apiDesignerPrice !== undefined && (localDesignerPrice === undefined || Math.abs(apiDesignerPrice - localDesignerPrice) > 0.0001)) {
    return { ...apiProduct, partnerPriceUsd: apiDesignerPrice, retailPriceUsd: apiDesignerPrice * 2 };
  }
  return localProduct ?? apiProduct;
}

export async function getCatalogProducts(
  locale: Locale,
  options: { limit?: number; featured?: boolean; search?: string; category?: CategoryId; includePrices?: boolean; priceTier?: PriceTier } = {},
): Promise<Product[]> {
  const priceTier = options.priceTier || "retail";
  const applyAccountPrice = (product: Product): Product => {
    const safeProduct = withoutPricingInternals(product);
    if (!options.includePrices) return { ...safeProduct, priceUsd: undefined, tradePriceHidden: true };
    const partnerPrice = designerPrice(product);
    const basePrice = priceTier === "partner" ? partnerPrice : partnerPrice === undefined ? undefined : partnerPrice * 2;
    return {
      ...safeProduct,
      priceUsd: basePrice === undefined ? undefined : Number(basePrice.toFixed(2)),
      tradePriceHidden: false,
    };
  };
  if (!apiUrl) {
    const query = options.search?.trim().toLowerCase();
    const products = query
      ? getSeedProductsBySearch(locale, query).filter((product) => !options.category || product.categoryId === options.category)
      : options.category ? getSeedProductsByCategory(locale, options.category) : getSeedProducts(locale);
    return products.slice(0, options.limit).map(applyAccountPrice);
  }

  const params = new URLSearchParams({ locale, limit: String(options.limit || 100) });
  if (options.featured) params.set("featured", "true");
  if (options.search) params.set("q", options.search);
  if (options.category) params.set("category", options.category);
  if (options.includePrices) params.set("priceTier", priceTier);

  try {
    const response = await fetch(`${apiUrl}/api/v1/catalog/products?${params}`, {
      headers: options.includePrices && process.env.INTERNAL_API_KEY ? { "x-internal-api-key": process.env.INTERNAL_API_KEY } : undefined,
      next: { revalidate: 300 },
    });
    if (!response.ok) throw new Error(`Catalog API responded with ${response.status}`);
    const localProductsById = new Map(getSeedProducts(locale).flatMap((product) => [[product.id, product], [product.slug, product]]));
    const apiProducts = ((await response.json()) as CatalogResponse).data.map((product) => {
      const normalizedProduct = { ...product, dimensionImage: undefined, technicalImages: undefined, variants: product.variants || [] };
      const localProduct = localProductsById.get(product.id) || localProductsById.get(product.slug);
      const pricingSource = resolvePricingSource(normalizedProduct, localProduct);
      return applyAccountPrice({
        ...normalizedProduct,
        priceUsd: pricingSource.priceUsd,
        partnerPriceUsd: pricingSource.partnerPriceUsd,
        retailPriceUsd: pricingSource.retailPriceUsd,
      });
    });
    if (options.featured) return apiProducts;

    // The database remains the source of truth. Keep the independently
    // curated sample catalogues visible while older database imports are
    // being completed, without replacing or duplicating API products. The
    // local import also preserves the exact product sequence from the
    // original catalogue; database update timestamps must not reshuffle it.
    const query = options.search?.trim().toLowerCase();
    const localProducts = (query
      ? getSeedProductsBySearch(locale, query).filter((product) => !options.category || product.categoryId === options.category)
      : options.category ? getSeedProductsByCategory(locale, options.category) : getSeedProducts(locale))
      .map(applyAccountPrice);
    const originalOrder = new Map(localProducts.map((product, index) => [product.id, index]));
    const apiIds = new Set(apiProducts.map((product) => product.id));
    return [...apiProducts, ...localProducts.filter((product) => !apiIds.has(product.id))]
      .sort((left, right) => (originalOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (originalOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER))
      .slice(0, options.limit || 100);
  } catch (error) {
    if (process.env.CATALOG_FALLBACK === "false") throw error;
    const query = options.search?.trim().toLowerCase();
    const products = query
      ? getSeedProductsBySearch(locale, query).filter((product) => !options.category || product.categoryId === options.category)
      : options.category ? getSeedProductsByCategory(locale, options.category) : getSeedProducts(locale);
    return products.slice(0, options.limit).map(applyAccountPrice);
  }
}

async function loadCatalogProductBySlug(locale: Locale, slug: string, includePrices = false, priceTier: PriceTier = "retail"): Promise<Product | undefined> {
  const accountPrice = (product: Product): Product => {
    const safeProduct = withoutPricingInternals(product);
    if (!includePrices) return { ...safeProduct, priceUsd: undefined, tradePriceHidden: true };
    const partnerPrice = designerPrice(product);
    const basePrice = priceTier === "partner" ? partnerPrice : partnerPrice === undefined ? undefined : partnerPrice * 2;
    return { ...safeProduct, priceUsd: basePrice === undefined ? undefined : Number(basePrice.toFixed(2)), tradePriceHidden: false };
  };
  if (!apiUrl) {
    const product = getSeedProductBySlug(locale, slug);
    return product ? accountPrice(product) : undefined;
  }
  try {
    const params = new URLSearchParams({ locale });
    if (includePrices) params.set("priceTier", priceTier);
    const response = await fetch(`${apiUrl}/api/v1/catalog/products/${encodeURIComponent(slug)}?${params}`, {
      headers: includePrices && process.env.INTERNAL_API_KEY ? { "x-internal-api-key": process.env.INTERNAL_API_KEY } : undefined,
      next: { revalidate: 300 },
    });
    if (response.status === 404) {
      if (process.env.CATALOG_FALLBACK === "false") return undefined;
      const product = getSeedProductBySlug(locale, slug);
      return product ? accountPrice(product) : undefined;
    }
    if (!response.ok) throw new Error(`Catalog API responded with ${response.status}`);
    const payload = await response.json() as { data: Product };
    const localProduct = getSeedProductBySlug(locale, slug);
    const specifications = getFallbackSpecifications(payload.data.categoryId, locale);
    const normalizedProduct = { ...payload.data, dimensionImage: localProduct?.dimensionImage, technicalImages: localProduct?.technicalImages, dimensions: payload.data.dimensions || localProduct?.dimensions || specifications.dimensions, composition: payload.data.composition || localProduct?.composition || specifications.composition, variants: payload.data.variants?.length ? payload.data.variants : [{ id: `${payload.data.id}-default`, image: payload.data.image }] };
    const pricingSource = resolvePricingSource(normalizedProduct, localProduct);
    return accountPrice({
      ...normalizedProduct,
      priceUsd: pricingSource.priceUsd,
      partnerPriceUsd: pricingSource.partnerPriceUsd,
      retailPriceUsd: pricingSource.retailPriceUsd,
    });
  } catch (error) {
    if (process.env.CATALOG_FALLBACK === "false") throw error;
    const product = getSeedProductBySlug(locale, slug);
    return product ? accountPrice(product) : undefined;
  }
}

export const getCatalogProductBySlug = cache(loadCatalogProductBySlug);
