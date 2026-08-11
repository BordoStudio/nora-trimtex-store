import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { MongoDatabase } from "./mongo.js";
import type { ProductDocument } from "./domain/types.js";
import { categorySeed } from "./domain/categories.js";

type MigrationProduct = Omit<ProductDocument, "createdAt" | "updatedAt"> & { localImage?: string };
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

export async function bootstrapCatalog(db: MongoDatabase): Promise<number> {
  const productsCollection = db.collection<ProductDocument>("products");
  if (await productsCollection.estimatedDocumentCount() > 0) return 0;

  const dataRoot = resolve(process.cwd(), "data");
  const source = JSON.parse(await readFile(resolve(dataRoot, "migration/catalog.postgres.json"), "utf8")) as MigrationFile;
  const sampleSource = JSON.parse(await readFile(resolve(dataRoot, "catalog.samples.json"), "utf8")) as SampleSeedProduct[];
  const samples: MigrationProduct[] = sampleSource.map((product) => ({
    ...product,
    media: product.variants.map((variant, sortOrder) => ({ key: variant.imageKey, alt: product.names, sortOrder })),
    variants: product.variants.map((variant) => ({ id: variant.id, optionValues: {}, mediaKeys: [variant.imageKey], stock: { tracked: false, available: 0 } })),
    tags: [],
    featured: false,
    attributes: { source: "chinatrimming.cn", productType: "sample" },
  }));
  const products = [...source.products, ...samples];
  const now = new Date();

  await db.collection("categories").bulkWrite(categorySeed.map((category) => ({
    updateOne: { filter: { id: category.id }, update: { $set: category }, upsert: true },
  })), { ordered: false });
  await productsCollection.bulkWrite(products.map(({ localImage: _localImage, ...product }) => ({
    updateOne: {
      filter: { id: product.id },
      update: { $set: { ...product, updatedAt: now }, $setOnInsert: { createdAt: now } },
      upsert: true,
    },
  })), { ordered: false });
  return products.length;
}
