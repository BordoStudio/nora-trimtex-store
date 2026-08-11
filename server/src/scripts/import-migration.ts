import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { closeMongo, connectMongo, initializeMongo } from "../mongo.js";
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
const db = await connectMongo();
await initializeMongo(db);
const now = new Date();

if (categorySeed.length) {
  await db.collection("categories").bulkWrite(categorySeed.map((category) => ({
    updateOne: {
      filter: { id: category.id },
      update: { $set: category },
      upsert: true,
    },
  })), { ordered: false });
}

if (products.length) {
  await db.collection<ProductDocument>("products").bulkWrite(products.map(({ localImage: _localImage, ...product }) => ({
    updateOne: {
      filter: { id: product.id },
      update: {
        $set: { ...product, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  })), { ordered: false });
}

console.log(`Imported ${products.length} migrated products into MongoDB`);
await closeMongo();
