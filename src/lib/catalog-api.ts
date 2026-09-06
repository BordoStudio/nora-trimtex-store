import { getFallbackSpecifications, getSeedProducts, type Product } from "@/data/catalog";
import type { Locale } from "@/lib/i18n";

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

export async function getCatalogProducts(
  locale: Locale,
  options: { limit?: number; featured?: boolean; search?: string; includePrices?: boolean; priceTier?: PriceTier; discountPercent?: number } = {},
): Promise<Product[]> {
  const priceTier = options.priceTier || "retail";
  const applyAccountPrice = (product: Product): Product => {
    const safeProduct = withoutPricingInternals(product);
    if (!options.includePrices) return { ...safeProduct, priceUsd: undefined, tradePriceHidden: true };
    const partnerPrice = product.partnerPriceUsd ?? product.priceUsd;
    const basePrice = priceTier === "partner" ? partnerPrice : product.retailPriceUsd ?? (partnerPrice === undefined ? undefined : partnerPrice * 2);
    const discount = priceTier === "partner" ? Math.min(80, Math.max(0, options.discountPercent || 0)) : 0;
    return {
      ...safeProduct,
      priceUsd: basePrice === undefined ? undefined : Number((basePrice * (1 - discount / 100)).toFixed(2)),
      tradePriceHidden: false,
    };
  };
  const applyApiPrice = (product: Product): Product => {
    const safeProduct = withoutPricingInternals(product);
    if (!options.includePrices) return { ...safeProduct, priceUsd: undefined, tradePriceHidden: true };
    const discount = priceTier === "partner" ? Math.min(80, Math.max(0, options.discountPercent || 0)) : 0;
    return { ...safeProduct, priceUsd: product.priceUsd === undefined ? undefined : Number((product.priceUsd * (1 - discount / 100)).toFixed(2)), tradePriceHidden: false };
  };
  if (!apiUrl) {
    const query = options.search?.trim().toLowerCase();
    const products = query ? getSeedProducts(locale).filter((product) => `${product.sku} ${product.name}`.toLowerCase().includes(query)) : getSeedProducts(locale);
    return products.slice(0, options.limit).map(applyAccountPrice);
  }

  const params = new URLSearchParams({ locale, limit: String(options.limit || 100) });
  if (options.featured) params.set("featured", "true");
  if (options.search) params.set("q", options.search);
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
      const pricedProduct = applyApiPrice(normalizedProduct);
      const localProduct = localProductsById.get(product.id) || localProductsById.get(product.slug);
      if (!localProduct) return pricedProduct;
      return { ...pricedProduct, priceUsd: applyAccountPrice(localProduct).priceUsd };
    });
    if (options.featured) return apiProducts;

    // The database remains the source of truth. Keep the independently
    // curated sample catalogues visible while older database imports are
    // being completed, without replacing or duplicating API products. The
    // local import also preserves the exact product sequence from the
    // original catalogue; database update timestamps must not reshuffle it.
    const query = options.search?.trim().toLowerCase();
    const localProducts = getSeedProducts(locale)
      .filter((product) => !query || `${product.sku} ${product.name}`.toLowerCase().includes(query))
      .map(applyAccountPrice);
    const originalOrder = new Map(localProducts.map((product, index) => [product.id, index]));
    const apiIds = new Set(apiProducts.map((product) => product.id));
    return [...apiProducts, ...localProducts.filter((product) => !apiIds.has(product.id))]
      .sort((left, right) => (originalOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (originalOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER))
      .slice(0, options.limit || 100);
  } catch (error) {
    if (process.env.CATALOG_FALLBACK === "false") throw error;
    const query = options.search?.trim().toLowerCase();
    const products = query ? getSeedProducts(locale).filter((product) => `${product.sku} ${product.name}`.toLowerCase().includes(query)) : getSeedProducts(locale);
    return products.slice(0, options.limit).map(applyAccountPrice);
  }
}

export async function getCatalogProductBySlug(locale: Locale, slug: string, includePrices = false, discountPercent = 0, priceTier: PriceTier = "retail"): Promise<Product | undefined> {
  const accountPrice = (product: Product): Product => {
    const { retailPriceUsd, partnerPriceUsd, ...safeProduct } = product;
    if (!includePrices) return { ...safeProduct, priceUsd: undefined, tradePriceHidden: true };
    const partnerPrice = partnerPriceUsd ?? product.priceUsd;
    const basePrice = priceTier === "partner" ? partnerPrice : retailPriceUsd ?? (partnerPrice === undefined ? undefined : partnerPrice * 2);
    const discount = priceTier === "partner" ? Math.min(80, Math.max(0, discountPercent)) : 0;
    return { ...safeProduct, priceUsd: basePrice === undefined ? undefined : Number((basePrice * (1 - discount / 100)).toFixed(2)), tradePriceHidden: false };
  };
  const apiPrice = (product: Product): Product => {
    const safeProduct = withoutPricingInternals(product);
    if (!includePrices) return { ...safeProduct, priceUsd: undefined, tradePriceHidden: true };
    const discount = priceTier === "partner" ? Math.min(80, Math.max(0, discountPercent)) : 0;
    return { ...safeProduct, priceUsd: product.priceUsd === undefined ? undefined : Number((product.priceUsd * (1 - discount / 100)).toFixed(2)), tradePriceHidden: false };
  };
  if (!apiUrl) {
    const product = getSeedProducts(locale).find((item) => item.slug === slug);
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
      const product = getSeedProducts(locale).find((item) => item.slug === slug);
      return product ? accountPrice(product) : undefined;
    }
    if (!response.ok) throw new Error(`Catalog API responded with ${response.status}`);
    const payload = await response.json() as { data: Product };
    const localProduct = getSeedProducts(locale).find((item) => item.id === payload.data.id || item.slug === slug);
    const specifications = getFallbackSpecifications(payload.data.categoryId, locale);
    const pricedProduct = apiPrice({ ...payload.data, dimensionImage: localProduct?.dimensionImage, technicalImages: localProduct?.technicalImages, dimensions: payload.data.dimensions || localProduct?.dimensions || specifications.dimensions, composition: payload.data.composition || localProduct?.composition || specifications.composition, variants: payload.data.variants?.length ? payload.data.variants : [{ id: `${payload.data.id}-default`, image: payload.data.image }] });
    if (!localProduct) return pricedProduct;
    return { ...pricedProduct, priceUsd: accountPrice(localProduct).priceUsd };
  } catch (error) {
    if (process.env.CATALOG_FALLBACK === "false") throw error;
    const product = getSeedProducts(locale).find((item) => item.slug === slug);
    return product ? accountPrice(product) : undefined;
  }
}
