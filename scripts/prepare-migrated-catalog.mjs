import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { createHash } from "node:crypto";
import sharp from "../node_modules/.pnpm/node_modules/sharp/lib/index.js";

const root = process.cwd();
const migrationDir = join(root, "data", "migration");
const raw = JSON.parse(await readFile(join(migrationDir, "catalog.raw.json"), "utf8"));
const curated = JSON.parse(await readFile(join(root, "data", "catalog.seed.json"), "utf8"));
const bordoPriceFile = JSON.parse(await readFile(join(root, "data", "bordo-prices.json"), "utf8").catch(() => "{\"prices\":[]}"));
const bordoPrices = new Map(bordoPriceFile.prices.map((item) => [item.sku, item.priceUsd]));
const curatedIds = new Set(curated.map((product) => product.id));
const rawById = new Map(raw.products.map((product) => [product.id, product]));

const getVariants = async (product, primaryImageKey) => {
  const variants = [];
  const hashes = new Set();
  const previews = [];
  for (const [index, variant] of (product?.variants || []).entries()) {
    const key = index === 0 ? primaryImageKey : `products/variants/${product.id}/${variant.id}.webp`;
    let file;
    if (index > 0) {
      try {
        await access(join(root, "public", key));
        file = await readFile(join(root, "public", key));
      } catch { continue; }
    } else {
      try { file = await readFile(join(root, "public", key)); } catch { /* Primary image is validated separately. */ }
    }
    if (file) {
      const hash = createHash("sha256").update(file).digest("hex");
      if (hashes.has(hash)) continue;
      hashes.add(hash);
      try {
        const preview = await sharp(file).resize(64, 64, { fit: "fill" }).removeAlpha().raw().toBuffer();
        const duplicate = previews.some((existing) => {
          let squaredError = 0;
          for (let pixel = 0; pixel < preview.length; pixel += 1) {
            const difference = preview[pixel] - existing[pixel];
            squaredError += difference * difference;
          }
          return squaredError / preview.length < 8;
        });
        if (duplicate) continue;
        previews.push(preview);
      } catch { /* Byte-level validation still applies when a preview cannot be decoded. */ }
    }
    variants.push({ id: variant.id, imageKey: key });
  }
  return variants;
};

const categoryNames = {
  "tassels-large": { en: "Large tassel", de: "Große Quaste", uk: "Велика китиця", ru: "Большая кисть" },
  "tassels-small": { en: "Small tassel", de: "Kleine Quaste", uk: "Мала китиця", ru: "Малая кисть" },
  "tassel-trim": { en: "Tassel trim", de: "Quastenborte", uk: "Бахрома з китицями", ru: "Бахрома с кистями" },
  "decorative-tapes": { en: "Border or braid", de: "Bordüre oder Borte", uk: "Бордюр або тасьма", ru: "Бордюр или тесьма" },
  fringe: { en: "Decorative fringe", de: "Dekorfranse", uk: "Декоративна бахрома", ru: "Декоративная бахрома" },
  "cord-fringe": { en: "Cord fringe", de: "Kordelfranse", uk: "Шнурова бахрома", ru: "Шнуровая бахрома" },
  cords: { en: "Decorative cord", de: "Dekorkordel", uk: "Декоративний шнур", ru: "Декоративный шнур" },
  holdbacks: { en: "Wall hook or rosette", de: "Wandhaken oder Rosette", uk: "Настінний гачок або розетка", ru: "Настенный крючок или розетка" },
  home: { en: "Home accent", de: "Wohnaccessoire", uk: "Декор для дому", ru: "Декор для дома" },
  samples: { en: "Sample set", de: "Musterset", uk: "Комплект зразків", ru: "Комплект образцов" },
};

const slugify = (value) => value
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "") || "product";

const products = [];
for (const [index, product] of raw.products.filter((item) => item.localImage && !curatedIds.has(item.id)).entries()) {
    const names = categoryNames[product.category] || categoryNames["decorative-tapes"];
    const imageFile = basename(product.localImage);
    const priceUsd = bordoPrices.get(product.sku);
    const displayNames = Object.fromEntries(
      Object.entries(names).map(([locale, name]) => [locale, `${name} ${product.sku}`]),
    );

    const primaryImageKey = `products/imported/${imageFile}`;
    const variants = await getVariants(product, primaryImageKey);
    products.push({
      id: product.id,
      sku: product.sku,
      slug: `${slugify(product.sku)}-${product.id}`,
      categoryId: product.category,
      status: "active",
      names: displayNames,
      primaryImageKey,
      media: variants.map((variant, sortOrder) => ({ key: variant.imageKey, alt: displayNames, sortOrder })),
      variants: variants.map((variant) => ({
        id: variant.id,
        optionValues: {},
        mediaKeys: [variant.imageKey],
        stock: { tracked: false, available: 0 },
      })),
      variantCount: variants.length,
      tags: [],
      featured: index < 12,
      isNew: false,
      attributes: { legacyName: product.originalName },
      ...(priceUsd === undefined ? {} : { priceUsd }),
      localImage: `assets/${imageFile}`,
    });
}

const outputPath = join(migrationDir, "catalog.postgres.json");
await writeFile(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), products }, null, 2)}\n`);

const previewProducts = products.map((product) => ({
  id: product.id,
  sku: product.sku,
  slug: product.slug,
  categoryId: product.categoryId,
  status: product.status,
  names: product.names,
  primaryImageKey: product.primaryImageKey,
  variants: product.variants.map((variant) => ({ id: variant.id, imageKey: variant.mediaKeys[0] })),
  variantCount: product.variants.length,
  isNew: product.isNew,
  ...(product.priceUsd === undefined ? {} : { priceUsd: product.priceUsd }),
}));

const enrichedCurated = [];
for (const product of curated) {
  const variants = await getVariants(rawById.get(product.id), product.primaryImageKey);
  enrichedCurated.push({
    ...product,
    variants,
    variantCount: variants.length,
  });
}
await writeFile(
  join(root, "data", "catalog.full.json"),
  `${JSON.stringify([...enrichedCurated, ...previewProducts], null, 2)}\n`,
);

const publicImageDir = join(root, "public", "products", "imported");
await mkdir(publicImageDir, { recursive: true });
for (const product of products) {
  const publicImage = join(publicImageDir, basename(product.localImage));
  try {
    await access(publicImage);
  } catch {
    await copyFile(join(migrationDir, product.localImage), publicImage);
  }
}

console.log(`Prepared ${products.length} independent products for PostgreSQL and R2`);
console.log(`Prepared ${curated.length + previewProducts.length} locally previewable products`);
