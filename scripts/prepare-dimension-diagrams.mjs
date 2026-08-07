import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js";

const [inputArg, outputArg = "public/products/dimensions"] = process.argv.slice(2);
if (!inputArg) {
  throw new Error("Usage: node scripts/prepare-dimension-diagrams.mjs <ocr-clean-directory> [output-directory]");
}

const inputDirectory = resolve(inputArg);
const outputDirectory = resolve(outputArg);
const photoOnly = new Set(["1100.jpg", "1101.jpg", "1293.jpg", "1326.jpg", "1327.jpg", "1328.jpg", "1383.jpg", "1512.jpg", "1580.jpg", "1581.jpg", "1613.jpg", "1614.jpg"]);
const files = (await readdir(inputDirectory)).filter((name) => name.endsWith(".jpg") && !photoOnly.has(name));

for (const file of files) {
  const input = join(inputDirectory, file);
  const output = join(outputDirectory, file);
  const { data, info } = await sharp(input).autoOrient().raw().toBuffer({ resolveWithObject: true });

  const top = Math.min(180, Math.floor(info.height * 0.16));
  const bottom = Math.min(1000, Math.floor(info.height * 0.75));
  const height = Math.max(300, bottom - top);
  const cropped = await sharp(data, { raw: info })
    .extract({ left: 0, top, width: info.width, height })
    .toBuffer();
  const diagram = await sharp(cropped, { raw: { width: info.width, height, channels: info.channels } })
    .trim({ background: "#ffffff", threshold: 10 })
    .resize({ width: 1060, height: 1260, fit: "contain", withoutEnlargement: false, background: "#ffffff" })
    .extend({ top: 70, bottom: 70, left: 70, right: 70, background: "#ffffff" })
    .jpeg({ quality: 96, chromaSubsampling: "4:4:4" })
    .toBuffer();

  await sharp(diagram).toFile(output);
  console.log(`${file}: prepared clean dimension diagram`);
}
