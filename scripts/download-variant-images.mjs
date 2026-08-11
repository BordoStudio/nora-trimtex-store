import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "../node_modules/.pnpm/node_modules/sharp/lib/index.js";

const root = process.cwd();
const raw = JSON.parse(await readFile(join(root, "data", "migration", "catalog.raw.json"), "utf8"));
const outputRoot = join(root, "public", "products", "variants");
const jobs = [];

const sourceCandidates = (url) => [...new Set([
  url.replace("/small/thumb_", "/big/"),
  url.replace("/small/thumb_", "/big/thumb_"),
  url.replace("/small/", "/big/").replace("/thumb_", "/"),
  url.replace("/thumb_", "/"),
  url,
])];

const maxVariants = Math.max(...raw.products.map((product) => (product.variants || []).length));
for (let index = 1; index < maxVariants; index += 1) {
  for (const product of raw.products) {
    const variant = product.variants?.[index];
    if (!variant?.image) continue;
    jobs.push({ productId: product.id, variantId: variant.id, urls: sourceCandidates(variant.image) });
  }
}

let cursor = 0;
let completed = 0;
let skipped = 0;
let failed = 0;

async function download(job) {
  const directory = join(outputRoot, job.productId);
  const target = join(directory, `${job.variantId}.webp`);
  try {
    if ((await stat(target)).size > 1_000) {
      skipped += 1;
      return;
    }
  } catch { /* File does not exist yet. */ }

  for (const url of job.urls) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
        if (!response.ok) continue;
        const input = Buffer.from(await response.arrayBuffer());
        const output = await sharp(input)
          .rotate()
          .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 84, effort: 2 })
          .toBuffer();
        await mkdir(directory, { recursive: true });
        await writeFile(target, output);
        completed += 1;
        if ((completed + skipped) % 100 === 0) console.log(`Variant images: ${completed + skipped}/${jobs.length}`);
        return;
      } catch { /* Try the source again, then fall back to its thumbnail. */ }
    }
  }
  failed += 1;
}

async function worker() {
  while (cursor < jobs.length) {
    const job = jobs[cursor];
    cursor += 1;
    await download(job);
  }
}

await mkdir(outputRoot, { recursive: true });
await Promise.all(Array.from({ length: 48 }, () => worker()));
console.log(`Variant images finished: ${completed} downloaded, ${skipped} existing, ${failed} failed`);
