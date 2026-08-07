import { readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import sharp from "../node_modules/.pnpm/node_modules/sharp/lib/index.js";

const root = process.cwd();
const raw = JSON.parse(await readFile(join(root, "data", "migration", "catalog.raw.json"), "utf8"));
const catalog = JSON.parse(await readFile(join(root, "data", "catalog.full.json"), "utf8"));
const rawById = new Map(raw.products.map((product) => [String(product.id), product]));

const sourceCandidates = (url) => [...new Set([
  url.replace("/small/thumb_", "/big/"),
  url.replace("/small/thumb_", "/big/thumb_"),
  url.replace("/small/", "/big/").replace("/thumb_", "/"),
  url.replace("/thumb_", "/"),
  url,
])];

const jobs = [];
const seen = new Set();
for (const product of catalog) {
  const sourceProduct = rawById.get(String(product.id));
  if (!sourceProduct) continue;
  for (const variant of product.variants) {
    const target = join(root, "public", variant.imageKey);
    if (seen.has(target)) continue;
    seen.add(target);
    let metadata;
    try { metadata = await sharp(target).metadata(); } catch { metadata = undefined; }
    if (metadata && (metadata.width || 0) >= 700 && (metadata.height || 0) >= 700) continue;
    const sourceVariant = sourceProduct.variants?.find((item) => String(item.id) === String(variant.id));
    const sourceUrl = sourceVariant?.image || sourceProduct.image;
    if (sourceUrl) jobs.push({ target, sourceUrl, before: metadata ? `${metadata.width}x${metadata.height}` : "invalid" });
  }
}

let cursor = 0;
let upgraded = 0;
let unavailable = 0;

async function upgrade(job) {
  let best;
  let bestArea = 0;
  for (const url of sourceCandidates(job.sourceUrl)) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) continue;
      const input = Buffer.from(await response.arrayBuffer());
      const metadata = await sharp(input).metadata();
      const area = (metadata.width || 0) * (metadata.height || 0);
      if (area > bestArea) { best = input; bestArea = area; }
      if ((metadata.width || 0) >= 1200 && (metadata.height || 0) >= 1200) break;
    } catch { /* Try the next known source path. */ }
  }
  if (!best || bestArea < 700 * 700) { unavailable += 1; return; }
  const pipeline = sharp(best).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true });
  const output = extname(job.target).toLowerCase() === ".webp"
    ? await pipeline.webp({ quality: 88, effort: 3 }).toBuffer()
    : await pipeline.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  await writeFile(job.target, output);
  upgraded += 1;
  if (upgraded % 50 === 0) console.log(`Upgraded ${upgraded}/${jobs.length} low-resolution images`);
}

async function worker() {
  while (cursor < jobs.length) {
    const job = jobs[cursor++];
    await upgrade(job);
  }
}

console.log(`Found ${jobs.length} referenced images below 700px.`);
await Promise.all(Array.from({ length: 16 }, () => worker()));
console.log(`Finished: ${upgraded} upgraded, ${unavailable} without a larger source.`);
