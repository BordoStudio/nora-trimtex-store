import { readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "../node_modules/.pnpm/node_modules/sharp/lib/index.js";

const root = process.cwd();
const raw = JSON.parse(await readFile(join(root, "data", "migration", "catalog.raw.json"), "utf8"));
const outputRoot = join(root, "public", "products", "variants");
const cutoff = Date.now() - 2 * 60 * 60 * 1000;
const jobs = [];

const sourceCandidates = (url) => [...new Set([
  url.replace("/small/thumb_", "/big/"),
  url.replace("/small/thumb_", "/big/thumb_"),
  url.replace("/small/", "/big/").replace("/thumb_", "/"),
  url.replace("/thumb_", "/"),
  url,
])];

for (const product of raw.products) {
  for (const variant of product.variants || []) {
    if (!variant?.image) continue;
    const target = join(outputRoot, String(product.id), `${variant.id}.webp`);
    try {
      const info = await stat(target);
      if (info.mtimeMs >= cutoff) {
        jobs.push({ target, urls: sourceCandidates(variant.image) });
      }
    } catch {
      // Missing files are outside this restoration pass.
    }
  }
}

let cursor = 0;
let restored = 0;
let failed = 0;
const failedTargets = [];

async function restore(job) {
  for (const url of job.urls) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) continue;
      const input = Buffer.from(await response.arrayBuffer());
      const output = await sharp(input)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 84, effort: 2 })
        .toBuffer();
      await writeFile(job.target, output);
      restored += 1;
      return;
    } catch {
      // Try the next source candidate.
    }
  }
  failed += 1;
  failedTargets.push(job.target);
}

async function worker() {
  while (cursor < jobs.length) {
    const job = jobs[cursor];
    cursor += 1;
    await restore(job);
  }
}

await Promise.all(Array.from({ length: 24 }, () => worker()));
console.log(`Recent variant restoration: ${restored} restored, ${failed} failed, ${jobs.length} selected.`);
if (failedTargets.length) console.log(failedTargets.join("\n"));
