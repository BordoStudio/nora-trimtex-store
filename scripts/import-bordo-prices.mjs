import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = resolve(process.argv[2] || "data/price-matches.json");
const root = process.cwd();
const matches = JSON.parse(await readFile(sourcePath, "utf8"));
const accepted = matches.filter((match) =>
  match.method === "exact" || (match.hashDistance <= 4 && match.mse <= 2),
);
const prices = new Map();
for (const match of accepted) {
  if (prices.has(match.sku) && prices.get(match.sku).priceUsd !== match.priceUsd) {
    throw new Error(`Conflicting prices for ${match.sku}`);
  }
  prices.set(match.sku, {
    sku: match.sku,
    priceUsd: match.priceUsd,
    source: { workbook: "Электронный каталог фурнитуры ВОRDO.xlsx", sheet: match.sheet, row: match.row, match: match.method },
  });
}

const fullPath = resolve(root, "data/catalog.full.json");
const full = JSON.parse(await readFile(fullPath, "utf8"));
for (const product of full) {
  const price = prices.get(product.sku);
  if (price) product.priceUsd = price.priceUsd;
}
await writeFile(fullPath, `${JSON.stringify(full, null, 2)}\n`);

const migrationPath = resolve(root, "data/migration/catalog.postgres.json");
const migration = JSON.parse(await readFile(migrationPath, "utf8"));
for (const product of migration.products) {
  const price = prices.get(product.sku);
  if (!price) continue;
  product.priceUsd = price.priceUsd;
  product.attributes = { ...product.attributes, priceUsd: price.priceUsd, priceSource: `${price.source.sheet}!${price.source.row}` };
}
await writeFile(migrationPath, `${JSON.stringify(migration, null, 2)}\n`);

const auditPath = resolve(root, "data/bordo-prices.json");
await writeFile(auditPath, `${JSON.stringify({ importedAt: new Date().toISOString(), currency: "USD", count: prices.size, prices: [...prices.values()].sort((a, b) => a.sku.localeCompare(b.sku)) }, null, 2)}\n`);
console.log(`Imported ${prices.size} verified USD prices`);
