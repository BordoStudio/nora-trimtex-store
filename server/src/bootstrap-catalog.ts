import { access, readFile } from "node:fs/promises";
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

async function catalogDataRoot() {
  const candidates = [resolve(process.cwd(), "data"), resolve(process.cwd(), "../data")];
  for (const candidate of candidates) {
    try {
      await access(resolve(candidate, "migration/catalog.postgres.json"));
      return candidate;
    } catch {
      // Try the packaged or workspace-level data directory next.
    }
  }
  throw new Error("Catalogue migration data was not found");
}

export async function bootstrapCatalog(db: MongoDatabase): Promise<number> {
  const productsCollection = db.collection<ProductDocument>("products");
  const dataRoot = await catalogDataRoot();
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
  const priceImportId = "furniture-prices-2026-09-05";

  if (await productsCollection.estimatedDocumentCount() > 0) {
    const imports = db.collection<{ id: string; appliedAt: Date }>("dataImports");
    if (!await imports.findOne({ id: priceImportId })) {
      const pricedProducts = products.filter((product) => product.partnerPriceUsd !== undefined || product.priceUsd !== undefined);
      if (pricedProducts.length) {
        await productsCollection.bulkWrite(pricedProducts.map((product) => {
          const partnerPriceUsd = product.partnerPriceUsd ?? product.priceUsd!;
          const retailPriceUsd = Number((partnerPriceUsd * 2).toFixed(2));
          return {
            updateOne: {
              filter: { id: product.id },
              update: { $set: { priceUsd: partnerPriceUsd, partnerPriceUsd, retailPriceUsd } },
            },
          };
        }), { ordered: false });
      }
      await imports.updateOne({ id: priceImportId }, { $set: { appliedAt: new Date() } }, { upsert: true });
    }
    return 0;
  }

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
  await db.collection<{ id: string; appliedAt: Date }>("dataImports").updateOne(
    { id: priceImportId },
    { $set: { appliedAt: now } },
    { upsert: true },
  );
  return products.length;
}
