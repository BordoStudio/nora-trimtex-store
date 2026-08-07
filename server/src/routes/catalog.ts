import type { FastifyPluginAsync } from "fastify";
import { config } from "../config.js";
import { publicAssetUrl } from "../storage/r2.js";
import { locales, type Locale, type ProductDocument } from "../domain/types.js";
import type { CatalogRepository } from "../repositories.js";

type ProductQuery = {
  locale?: Locale;
  category?: string;
  q?: string;
  page?: string;
  limit?: string;
  sort?: "newest" | "sku";
  featured?: "true" | "false";
};

const normalizeLocale = (value?: string): Locale => locales.includes(value as Locale) ? value as Locale : "en";

function availability(product: ProductDocument) {
  const trackedVariants = product.variants.filter((variant) => variant.stock.tracked);
  if (!trackedVariants.length) return { availability: "on_request" as const };
  const availableQuantity = trackedVariants.reduce((sum, variant) => sum + Math.max(0, variant.stock.available), 0);
  return { availability: availableQuantity > 5 ? "in_stock" as const : availableQuantity > 0 ? "low_stock" as const : "preorder" as const, availableQuantity };
}

function serializeProductSummary(product: ProductDocument, locale: Locale, includePrice = false) {
  return {
    id: product.id,
    sku: product.sku,
    slug: product.slug,
    categoryId: product.categoryId,
    name: product.names[locale] || product.names.en,
    image: publicAssetUrl(product.primaryImageKey),
    variantCount: product.variantCount,
    isNew: product.isNew,
    ...availability(product),
    ...(includePrice && product.priceUsd !== undefined ? { priceUsd: product.priceUsd } : {}),
  };
}

function serializeProductDetail(product: ProductDocument, locale: Locale, includePrice = false) {
  const dimensions = typeof product.attributes.dimensions === "string" ? product.attributes.dimensions : undefined;
  const composition = typeof product.attributes.composition === "string" ? product.attributes.composition : undefined;
  return {
    ...serializeProductSummary(product, locale, includePrice),
    description: product.descriptions?.[locale] || product.descriptions?.en,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      image: publicAssetUrl(variant.mediaKeys[0] || product.primaryImageKey),
    })),
    dimensions,
    composition,
  };
}

export function catalogRoutes(repository: CatalogRepository): FastifyPluginAsync {
  return async (app) => {
    app.get<{ Querystring: ProductQuery }>("/api/v1/catalog/products", {
      schema: {
        querystring: {
          type: "object",
          properties: {
            locale: { type: "string", enum: [...locales] },
            category: { type: "string", maxLength: 80 },
            q: { type: "string", maxLength: 100 },
            page: { type: "string", pattern: "^[0-9]+$" },
            limit: { type: "string", pattern: "^[0-9]+$" },
            sort: { type: "string", enum: ["newest", "sku"] },
            featured: { type: "string", enum: ["true", "false"] },
          },
          additionalProperties: false,
        },
      },
    }, async (request) => {
      const locale = normalizeLocale(request.query.locale);
      const includePrice = Boolean(config.INTERNAL_API_KEY && request.headers["x-internal-api-key"] === config.INTERNAL_API_KEY);
      const page = Math.max(1, Number(request.query.page || 1));
      const limit = Math.min(1_000, Math.max(1, Number(request.query.limit || 24)));
      const { items, total } = await repository.listProducts({
        locale,
        category: request.query.category,
        search: request.query.q,
        page,
        limit,
        sort: request.query.sort ?? "newest",
        featured: request.query.featured === "true" ? true : undefined,
      });

      return {
        data: items.map((item) => serializeProductSummary(item, locale, includePrice)),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      };
    });

    app.get<{ Params: { slug: string }; Querystring: { locale?: Locale } }>("/api/v1/catalog/products/:slug", {
      schema: {
        params: { type: "object", required: ["slug"], properties: { slug: { type: "string", maxLength: 160 } } },
        querystring: { type: "object", properties: { locale: { type: "string", enum: [...locales] } }, additionalProperties: false },
      },
    }, async (request, reply) => {
      const product = await repository.findProductBySlug(request.params.slug);
      if (!product) return reply.code(404).send({ error: "product_not_found" });
      const includePrice = Boolean(config.INTERNAL_API_KEY && request.headers["x-internal-api-key"] === config.INTERNAL_API_KEY);
      return { data: serializeProductDetail(product, normalizeLocale(request.query.locale), includePrice) };
    });

    app.get<{ Querystring: { locale?: Locale } }>("/api/v1/catalog/categories", {
      schema: { querystring: { type: "object", properties: { locale: { type: "string", enum: [...locales] } }, additionalProperties: false } },
    }, async (request) => {
      const locale = normalizeLocale(request.query.locale);
      const items = await repository.listCategories();
      return { data: items.map((item) => ({ id: item.id, slug: item.slug, name: item.names[locale] || item.names.en })) };
    });
  };
}
