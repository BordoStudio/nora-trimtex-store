import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const catalogPath = join(process.cwd(), "data", "catalog.full.json");
const products = JSON.parse(await readFile(catalogPath, "utf8"));
let removed = 0;

for (const product of products) {
  if (!Array.isArray(product.variants) || product.variants.length < 2) continue;
  const hashes = new Set();
  const unique = [];
  for (const variant of product.variants) {
    try {
      const file = await readFile(join(process.cwd(), "public", variant.imageKey));
      const hash = createHash("sha256").update(file).digest("hex");
      if (hashes.has(hash)) {
        removed += 1;
        continue;
      }
      hashes.add(hash);
    } catch {
      // Keep the record when an asset has not been downloaded yet.
    }
    unique.push(variant);
  }
  product.variants = unique;
  product.variantCount = unique.length;
}

await writeFile(catalogPath, `${JSON.stringify(products, null, 2)}\n`);
console.log(`Removed ${removed} byte-identical colour variants.`);
