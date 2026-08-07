import { readFile, readdir, stat } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { assetHasSize, uploadAsset } from "../storage/r2.js";

const publicDirectory = resolve(process.cwd(), "../public");
const roots = [resolve(publicDirectory, "products"), resolve(publicDirectory, "brand")];
const rootFiles = ["favicon-32.png", "icon-192.png", "icon-512.png"];

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries
    .filter((entry) => !entry.name.startsWith("."))
    .map((entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? walk(path) : Promise.resolve([path]);
    }));
  return nested.flat();
}

const discovered = (await Promise.all(roots.map(walk))).flat();
for (const name of rootFiles) {
  const path = resolve(publicDirectory, name);
  try {
    if ((await stat(path)).isFile()) discovered.push(path);
  } catch {
    // Optional root icon is absent.
  }
}

const assets = discovered
  .map((localPath) => ({
    localPath,
    key: relative(publicDirectory, localPath).split(sep).join("/"),
  }))
  .sort((left, right) => left.key.localeCompare(right.key));

let completed = 0;
let uploaded = 0;
let skipped = 0;
const concurrency = 6;

const contentTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

async function upload(asset: { localPath: string; key: string }) {
  const file = await stat(asset.localPath);
  if (await assetHasSize(asset.key, file.size)) {
    skipped += 1;
    completed += 1;
    return;
  }

  const body = await readFile(asset.localPath);
  const extension = extname(asset.localPath).toLowerCase();
  const contentType = contentTypes[extension] || "application/octet-stream";
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await uploadAsset(asset.key, body, contentType);
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolveDelay) => setTimeout(resolveDelay, 500 * attempt));
    }
  }
  if (lastError) throw lastError;

  uploaded += 1;
  completed += 1;
  if (completed % 100 === 0 || completed === assets.length) {
    console.log(`Processed ${completed}/${assets.length} (uploaded ${uploaded}, unchanged ${skipped})`);
  }
}

for (let index = 0; index < assets.length; index += concurrency) {
  await Promise.all(assets.slice(index, index + concurrency).map(upload));
}

console.log(`R2 sync complete: ${uploaded} uploaded, ${skipped} unchanged, ${assets.length} total`);
