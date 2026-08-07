import { readdir } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import sharp from "../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js";

const [directoryArg, outputArg] = process.argv.slice(2);
if (!directoryArg || !outputArg) {
  throw new Error("Usage: node scripts/create-image-contact-sheet.mjs <images-directory> <output.jpg>");
}

const directory = resolve(directoryArg);
const output = resolve(outputArg);
const files = (await readdir(directory))
  .filter((name) => /\.(?:jpe?g|png|webp)$/i.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

const tileWidth = 180;
const tileHeight = 260;
const imageHeight = 225;
const columns = 8;
const rows = Math.ceil(files.length / columns);
const background = { r: 244, g: 239, b: 230 };
const composites = [];

for (const [index, file] of files.entries()) {
  const thumbnail = await sharp(join(directory, file))
    .resize({ width: tileWidth - 12, height: imageHeight - 8, fit: "contain", background: "#ffffff" })
    .jpeg({ quality: 82 })
    .toBuffer();
  const label = Buffer.from(
    `<svg width="${tileWidth}" height="${tileHeight - imageHeight}">
      <rect width="100%" height="100%" fill="#f4efe6"/>
      <text x="90" y="24" text-anchor="middle" font-family="Arial" font-size="18" fill="#392b22">${basename(file, extname(file))}</text>
    </svg>`,
  );
  const left = (index % columns) * tileWidth;
  const top = Math.floor(index / columns) * tileHeight;
  composites.push({ input: thumbnail, left: left + 6, top: top + 4 });
  composites.push({ input: label, left, top: top + imageHeight });
}

await sharp({
  create: { width: columns * tileWidth, height: rows * tileHeight, channels: 3, background },
})
  .composite(composites)
  .jpeg({ quality: 90 })
  .toFile(output);

console.log(output);
