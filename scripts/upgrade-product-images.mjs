import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const root = process.cwd();
const rawPath = join(root, "data", "migration", "catalog.raw.json");
const raw = JSON.parse(await readFile(rawPath, "utf8"));
const migrationDir = join(root, "data", "migration", "assets");
const publicDir = join(root, "public", "products", "imported");
const curated = JSON.parse(await readFile(join(root, "data", "catalog.seed.json"), "utf8"));
const curatedIds = new Set(curated.map((product) => product.id));
await mkdir(migrationDir, { recursive: true });
await mkdir(publicDir, { recursive: true });

const jobs = raw.products.filter((product) => product.image && product.localImage);
let completed = 0;
let failed = 0;
let cursor = 0;

const sourceCandidates = (url) => [...new Set([
  url.replace("/small/thumb_", "/big/"),
  url.replace("/small/thumb_", "/big/thumb_"),
  url.replace("/small/", "/big/").replace("/thumb_", "/"),
  url.replace("/thumb_", "/"),
  url,
])];

const download = async (product) => {
  const fileName = basename(product.localImage);
  let response;
  for (const url of sourceCandidates(product.image)) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        response = await fetch(url, { signal: AbortSignal.timeout(45_000) });
        if (response.ok) break;
      } catch {
        response = undefined;
      }
    }
    if (response?.ok) break;
  }
  if (!response?.ok) {
    failed += 1;
    return;
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const writes = [
    writeFile(join(migrationDir, fileName), bytes),
    writeFile(join(publicDir, fileName), bytes),
  ];
  if (curatedIds.has(product.id)) writes.push(writeFile(join(root, "public", "products", fileName), bytes));
  await Promise.all(writes);
  completed += 1;
  if (completed % 25 === 0) console.log(`Upgraded ${completed}/${jobs.length} images`);
};

const worker = async () => {
  while (cursor < jobs.length) {
    const index = cursor;
    cursor += 1;
    await download(jobs[index]);
  }
};

await Promise.all(Array.from({ length: 8 }, () => worker()));
console.log(`Finished: ${completed} upgraded, ${failed} failed`);
