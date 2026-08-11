import type { Filter } from "mongodb";
import type { MongoDatabase } from "./mongo.js";
import type { CategoryDocument, OrderDocument, ProductDocument, SampleRequestDocument } from "./domain/types.js";
import type {
  AppServices,
  CatalogRepository,
  ProductListQuery,
  ProductListResult,
  SampleRequestRepository,
  OrderRepository,
} from "./repositories.js";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class MongoCatalogRepository implements CatalogRepository {
  constructor(private readonly db: MongoDatabase) {}

  async listProducts(query: ProductListQuery): Promise<ProductListResult> {
    const filter: Filter<ProductDocument> = { status: "active" };
    if (query.category) filter.categoryId = query.category;
    if (query.featured !== undefined) filter.featured = query.featured;
    if (query.search?.trim()) {
      const pattern = new RegExp(escapeRegex(query.search.trim()), "i");
      filter.$or = [
        { sku: pattern },
        { [`names.${query.locale}`]: pattern },
        { "names.en": pattern },
        { tags: pattern },
      ];
    }
    const products = this.db.collection<ProductDocument>("products");
    const cursor = products.find(filter, { projection: { _id: 0 } })
      .sort(query.sort === "sku" ? { sku: 1 } : { isNew: -1, updatedAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit);
    const [items, total] = await Promise.all([cursor.toArray(), products.countDocuments(filter)]);
    return { items, total };
  }

  async findProductBySlug(slug: string): Promise<ProductDocument | null> {
    return this.db.collection<ProductDocument>("products").findOne(
      { slug, status: "active" },
      { projection: { _id: 0 } },
    );
  }

  async listCategories(): Promise<CategoryDocument[]> {
    return this.db.collection<CategoryDocument>("categories")
      .find({ active: true }, { projection: { _id: 0 } })
      .sort({ sortOrder: 1 })
      .toArray();
  }
}

export class MongoSampleRequestRepository implements SampleRequestRepository {
  constructor(private readonly db: MongoDatabase) {}

  async create(document: SampleRequestDocument): Promise<void> {
    await this.db.collection<SampleRequestDocument>("sampleRequests").insertOne(document);
  }
}

export class MongoOrderRepository implements OrderRepository {
  constructor(private readonly db: MongoDatabase) {}

  async create(document: OrderDocument): Promise<void> {
    const ids = [...new Set(document.items.map((item) => item.productId))];
    const rows = await this.db.collection<ProductDocument>("products")
      .find({ id: { $in: ids }, status: "active" }, { projection: { _id: 0, id: 1, sku: 1, priceUsd: 1, variants: 1 } })
      .toArray();
    const products = new Map(rows.map((row) => [row.id, {
      sku: row.sku,
      priceUsd: row.priceUsd,
      variantIds: new Set(row.variants.map((variant) => variant.id)),
    }]));
    if (products.size !== ids.length || document.items.some((item) => {
      const product = products.get(item.productId);
      return product?.sku !== item.sku || Boolean(item.variantId && !product.variantIds.has(item.variantId));
    })) {
      throw Object.assign(new Error("Order contains an unknown product, SKU or colour variant"), { statusCode: 400 });
    }
    const items = document.items.map((item) => ({
      ...item,
      sku: products.get(item.productId)!.sku,
      unitPriceUsd: products.get(item.productId)!.priceUsd,
    }));
    const pricedSubtotalUsd = items.reduce((sum, item) => sum + (item.unitPriceUsd ?? 0) * item.quantity, 0);
    await this.db.collection<OrderDocument>("orders").insertOne({ ...document, items, pricedSubtotalUsd });
  }
}

export function createMongoServices(db: MongoDatabase): AppServices {
  return {
    db,
    databaseHealth: async () => { await db.command({ ping: 1 }); },
    catalog: new MongoCatalogRepository(db),
    sampleRequests: new MongoSampleRequestRepository(db),
    orders: new MongoOrderRepository(db),
  };
}
