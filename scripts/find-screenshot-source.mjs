import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js";

const [screenshotArg, imagesArg = "public/products"] = process.argv.slice(2);
if (!screenshotArg) {
  throw new Error("Usage: node scripts/find-screenshot-source.mjs <screenshot> [images-directory]");
}

const screenshot = resolve(screenshotArg);
const imagesRoot = resolve(imagesArg);
const targetWidth = 48;
const targetHeight = 40;
const target = await sharp(screenshot)
  .extract({ left: 25, top: 0, width: 1245, height: 1037 })
  .resize({ width: targetWidth })
  .extract({ left: 0, top: 0, width: targetWidth, height: targetHeight })
  .removeAlpha()
  .raw()
  .toBuffer();

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collect(path);
    return /\.(?:jpe?g|png|webp)$/i.test(entry.name) ? [path] : [];
  }));
  return nested.flat();
}

function distance(candidate) {
  let total = 0;
  for (let index = 0; index < target.length; index += 1) {
    const delta = target[index] - candidate[index];
    total += delta * delta;
  }
  return total / target.length;
}

const files = await collect(imagesRoot);
const best = [];
const concurrency = 24;

for (let offset = 0; offset < files.length; offset += concurrency) {
  await Promise.all(files.slice(offset, offset + concurrency).map(async (path) => {
    try {
      const metadata = await sharp(path).metadata();
      if (!metadata.width || !metadata.height || metadata.width < 400 || metadata.height < 400) return;
      const resizedHeight = Math.round((metadata.height / metadata.width) * targetWidth);
      if (resizedHeight < targetHeight) return;
      const pixels = await sharp(path)
        .resize({ width: targetWidth })
        .extract({ left: 0, top: 0, width: targetWidth, height: targetHeight })
        .removeAlpha()
        .raw()
        .toBuffer();
      best.push({ path, score: distance(pixels), width: metadata.width, height: metadata.height });
      best.sort((a, b) => a.score - b.score);
      if (best.length > 20) best.length = 20;
    } catch {
      // Ignore unreadable assets; the audit will report valid nearest matches.
    }
  }));
}

console.log(JSON.stringify(best, null, 2));
