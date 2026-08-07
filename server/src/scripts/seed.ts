import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { categorySeed } from "../domain/categories.js";
import { closeDatabase, connectDatabase } from "../db.js";
import { runMigrations } from "../migrations.js";
import type { LocalizedText } from "../domain/types.js";

type SeedProduct = {
  id: string;
  sku: string;
  slug: string;
  categoryId: string;
  status: "active";
  names: LocalizedText;
  primaryImageKey: string;
  variants?: Array<{ id: string; imageKey: string }>;
  priceUsd?: number;
  variantCount: number;
  isNew: boolean;
};

const source = process.env.CATALOG_SEED_PATH
  ? resolve(process.env.CATALOG_SEED_PATH)
  : resolve(process.cwd(), "data/catalog.full.json");
const products = JSON.parse(await readFile(source, "utf8")) as SeedProduct[];
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

for (const [index, product] of products.entries()) {
  const sourceVariants = product.variants?.length ? product.variants : [{ id: `${product.id}-default`, imageKey: product.primaryImageKey }];
  const media = sourceVariants.map((variant, sortOrder) => ({ key: variant.imageKey, alt: product.names, sortOrder }));
  const variants = sourceVariants.map((variant) => ({ id: variant.id, optionValues: {}, mediaKeys: [variant.imageKey], stock: { tracked: false, available: 0 } }));
  await db`
    insert into products (
      id, sku, slug, category_id, status, names, primary_image_key,
      media, variants, variant_count, tags, featured, is_new, attributes, price_usd
    ) values (
      ${product.id}, ${product.sku}, ${product.slug}, ${product.categoryId}, ${product.status},
      ${db.json(product.names)}, ${product.primaryImageKey}, ${db.json(media)}, ${db.json(variants)},
      ${product.variantCount}, ${[]}, ${index < 8}, ${product.isNew}, ${db.json({})}, ${product.priceUsd ?? null}
    )
    on conflict (id) do update set
      sku = excluded.sku,
      slug = excluded.slug,
      category_id = excluded.category_id,
      status = excluded.status,
      names = excluded.names,
      primary_image_key = excluded.primary_image_key,
      media = excluded.media,
      variants = excluded.variants,
      variant_count = excluded.variant_count,
      featured = excluded.featured,
      is_new = excluded.is_new,
      price_usd = excluded.price_usd,
      updated_at = now()
  `;
}

console.log(`Seeded ${products.length} products and ${categorySeed.length} categories into PostgreSQL`);
await closeDatabase();
