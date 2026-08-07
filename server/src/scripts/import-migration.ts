import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { closeDatabase, connectDatabase } from "../db.js";
import { runMigrations } from "../migrations.js";
import type { ProductDocument } from "../domain/types.js";
import { categorySeed } from "../domain/categories.js";

type MigrationProduct = Omit<ProductDocument, "createdAt" | "updatedAt"> & { localImage: string };
type MigrationFile = { products: MigrationProduct[] };
type SampleSeedProduct = {
  id: string;
  sku: string;
  slug: string;
  categoryId: "samples";
  status: "active";
  names: ProductDocument["names"];
  primaryImageKey: string;
  variants: Array<{ id: string; imageKey: string }>;
  variantCount: number;
  isNew: boolean;
};

async function dataPath(path: string): Promise<string> {
  const candidates = [resolve(process.cwd(), "../data", path), resolve(process.cwd(), "data", path)];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the packaged production path next.
    }
  }
  throw new Error(`Required data file was not found: ${path}`);
}

const path = await dataPath("migration/catalog.postgres.json");
const source = JSON.parse(await readFile(path, "utf8")) as MigrationFile;
const samplePath = await dataPath("catalog.samples.json");
const sampleSource = JSON.parse(await readFile(samplePath, "utf8")) as SampleSeedProduct[];
const sampleProducts: MigrationProduct[] = sampleSource.map((product) => ({
  ...product,
  descriptions: undefined,
  media: product.variants.map((variant, sortOrder) => ({ key: variant.imageKey, alt: product.names, sortOrder })),
  variants: product.variants.map((variant) => ({ id: variant.id, optionValues: {}, mediaKeys: [variant.imageKey], stock: { tracked: false, available: 0 } })),
  tags: [],
  featured: false,
  attributes: { source: "chinatrimming.cn", productType: "sample" },
  localImage: product.primaryImageKey.replace(/^products\//, ""),
}));
const products = [...source.products, ...sampleProducts];
const db = connectDatabase();
await runMigrations(db);

for (const category of categorySeed) {
  await db`
    insert into categories (id, slug, names, sort_order, active)
    values (${category.id}, ${category.slug}, ${db.json(category.names)}, ${category.sortOrder}, ${category.active})
    on conflict (id) do update set
      slug = excluded.slug,
      names = excluded.names,
      sort_order = excluded.sort_order,
      active = excluded.active
  `;
}

for (const product of products) {
  await db`
    insert into products (
      id, sku, slug, category_id, status, names, descriptions, primary_image_key,
      media, variants, variant_count, tags, featured, is_new, attributes, price_usd
    ) values (
      ${product.id}, ${product.sku}, ${product.slug}, ${product.categoryId}, ${product.status},
      ${db.json(product.names)}, ${product.descriptions ? db.json(product.descriptions) : null},
      ${product.primaryImageKey}, ${db.json(product.media)}, ${db.json(product.variants)},
      ${product.variantCount}, ${product.tags}, ${product.featured}, ${product.isNew},
      ${db.json(product.attributes)}, ${product.priceUsd ?? null}
    )
    on conflict (id) do update set
      sku = excluded.sku,
      slug = excluded.slug,
      category_id = excluded.category_id,
      status = excluded.status,
      names = excluded.names,
      descriptions = excluded.descriptions,
      primary_image_key = excluded.primary_image_key,
      media = excluded.media,
      variants = excluded.variants,
      variant_count = excluded.variant_count,
      tags = excluded.tags,
      featured = excluded.featured,
      is_new = excluded.is_new,
      attributes = excluded.attributes,
      price_usd = excluded.price_usd,
      updated_at = now()
  `;
}

console.log(`Imported ${products.length} migrated products into PostgreSQL`);
await closeDatabase();
