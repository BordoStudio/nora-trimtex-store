import type { Database } from "./db.js";
import type { CategoryDocument, OrderDocument, ProductDocument, SampleRequestDocument } from "./domain/types.js";
import type {
  AppServices,
  CatalogRepository,
  ProductListQuery,
  ProductListResult,
  SampleRequestRepository,
  OrderRepository,
} from "./repositories.js";

type ProductRow = {
  id: string;
  sku: string;
  slug: string;
  categoryId: string;
  status: ProductDocument["status"];
  names: ProductDocument["names"];
  descriptions: ProductDocument["descriptions"] | null;
  primaryImageKey: string;
  media: ProductDocument["media"];
  variants: ProductDocument["variants"];
  variantCount: number;
  tags: string[];
  featured: boolean;
  isNew: boolean;
  attributes: ProductDocument["attributes"];
  priceUsd: number | null;
  createdAt: Date;
  updatedAt: Date;
};

const mapProduct = (row: ProductRow): ProductDocument => ({
  ...row,
  descriptions: row.descriptions ?? undefined,
  priceUsd: row.priceUsd === null ? undefined : Number(row.priceUsd),
});

export class PostgresCatalogRepository implements CatalogRepository {
  constructor(private readonly db: Database) {}

  async listProducts(query: ProductListQuery): Promise<ProductListResult> {
    const category = query.category ?? null;
    const featured = query.featured ?? null;
    const search = query.search?.trim() || null;
    const pattern = search ? `%${search}%` : null;
    const offset = (query.page - 1) * query.limit;

    const filter = this.db`
      status = 'active'
      and (${category}::text is null or category_id = ${category})
      and (${featured}::boolean is null or featured = ${featured})
      and (
        ${pattern}::text is null
        or sku ilike ${pattern}
        or coalesce(names ->> ${query.locale}, names ->> 'en', '') ilike ${pattern}
        or array_to_string(tags, ' ') ilike ${pattern}
      )
    `;

    const columns = this.db`
      id, sku, slug, category_id as "categoryId", status, names, descriptions,
      primary_image_key as "primaryImageKey", media, variants,
      variant_count as "variantCount", tags, featured, is_new as "isNew",
      attributes, price_usd as "priceUsd", created_at as "createdAt", updated_at as "updatedAt"
    `;

    const rows = query.sort === "sku"
      ? await this.db<ProductRow[]>`
          select ${columns} from products where ${filter}
          order by sku asc limit ${query.limit} offset ${offset}
        `
      : await this.db<ProductRow[]>`
          select ${columns} from products where ${filter}
          order by is_new desc, updated_at desc limit ${query.limit} offset ${offset}
        `;

    const [count] = await this.db<{ total: number }[]>`
      select count(*)::int as total from products where ${filter}
    `;

    return { items: rows.map(mapProduct), total: count?.total ?? 0 };
  }

  async findProductBySlug(slug: string): Promise<ProductDocument | null> {
    const rows = await this.db<ProductRow[]>`
      select
        id, sku, slug, category_id as "categoryId", status, names, descriptions,
        primary_image_key as "primaryImageKey", media, variants,
        variant_count as "variantCount", tags, featured, is_new as "isNew",
        attributes, price_usd as "priceUsd", created_at as "createdAt", updated_at as "updatedAt"
      from products
      where slug = ${slug} and status = 'active'
      limit 1
    `;
    return rows[0] ? mapProduct(rows[0]) : null;
  }

  async listCategories(): Promise<CategoryDocument[]> {
    return this.db<CategoryDocument[]>`
      select id, slug, names, sort_order as "sortOrder", active
      from categories where active = true order by sort_order asc
    `;
  }
}

export class PostgresSampleRequestRepository implements SampleRequestRepository {
  constructor(private readonly db: Database) {}

  async create(document: SampleRequestDocument): Promise<void> {
    await this.db`
      insert into sample_requests (
        request_number, locale, customer, items, notes, status, created_at, updated_at
      ) values (
        ${document.requestNumber}, ${document.locale}, ${this.db.json(document.customer)},
        ${this.db.json(document.items)}, ${document.notes ?? null}, ${document.status},
        ${document.createdAt}, ${document.updatedAt}
      )
    `;
  }
}

export class PostgresOrderRepository implements OrderRepository {
  constructor(private readonly db: Database) {}

  async create(document: OrderDocument): Promise<void> {
    const ids = [...new Set(document.items.map((item) => item.productId))];
    const rows = await this.db<{ id: string; sku: string; priceUsd: number | null; variants: ProductDocument["variants"] }[]>`
      select id, sku, price_usd as "priceUsd", variants from products where status = 'active' and id = any(${ids})
    `;
    const products = new Map(rows.map((row) => [row.id, { sku: row.sku, priceUsd: row.priceUsd === null ? undefined : Number(row.priceUsd), variantIds: new Set(row.variants.map((variant) => variant.id)) }]));
    if (products.size !== ids.length || document.items.some((item) => {
      const product = products.get(item.productId);
      return product?.sku !== item.sku || Boolean(item.variantId && !product.variantIds.has(item.variantId));
    })) {
      throw Object.assign(new Error("Order contains an unknown product, SKU or colour variant"), { statusCode: 400 });
    }
    const items = document.items.map((item) => ({ ...item, sku: products.get(item.productId)!.sku, unitPriceUsd: products.get(item.productId)!.priceUsd }));
    const pricedSubtotalUsd = items.reduce((sum, item) => sum + (item.unitPriceUsd ?? 0) * item.quantity, 0);
    await this.db`
      insert into orders (
        order_number, locale, customer, items, currency, priced_subtotal_usd,
        status, created_at, updated_at
      ) values (
        ${document.orderNumber}, ${document.locale}, ${this.db.json(document.customer)},
        ${this.db.json(items)}, 'USD', ${pricedSubtotalUsd},
        ${document.status}, ${document.createdAt}, ${document.updatedAt}
      )
    `;
  }
}

export function createPostgresServices(db: Database): AppServices {
  return {
    db,
    databaseHealth: async () => { await db`select 1`; },
    catalog: new PostgresCatalogRepository(db),
    sampleRequests: new PostgresSampleRequestRepository(db),
    orders: new PostgresOrderRepository(db),
  };
}
