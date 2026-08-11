import { readdir, rename } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js";

const directory = resolve(process.argv[2] || "public/products/technical");
const files = (await readdir(directory)).filter((name) => name.endsWith("-dimensions.jpg"));
let cleaned = 0;

for (const file of files) {
  const path = resolve(directory, file);
  const { data, info } = await sharp(path).raw().toBuffer({ resolveWithObject: true });
  const matchingRows = [];
  const strongLowerRows = [];

  for (let y = Math.floor(info.height * 0.55); y < info.height; y += 1) {
    let darkPixels = 0;
    let visiblePixels = 0;
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      if (data[offset] < 220 && data[offset + 1] < 220 && data[offset + 2] < 220) darkPixels += 1;
      if (data[offset] < 245 && data[offset + 1] < 245 && data[offset + 2] < 245) visiblePixels += 1;
    }
    if (darkPixels / info.width > 0.15) matchingRows.push(y);
    if (y > info.height * 0.65 && visiblePixels / info.width > 0.25) strongLowerRows.push(y);
  }

  const clusters = [];
  for (const row of matchingRows) {
    const last = clusters.at(-1);
    if (last && row === last.end + 1) last.end = row;
    else clusters.push({ start: row, end: row });
  }
  const tableLines = clusters.filter((cluster) => cluster.end - cluster.start <= 7);
  const strongClusters = [];
  for (const row of strongLowerRows) {
    const last = strongClusters.at(-1);
    if (last && row === last.end + 1) last.end = row;
    else strongClusters.push({ start: row, end: row });
  }
  const fallbackLine = strongClusters.find((cluster) => cluster.end - cluster.start <= 8);

  const hasRegularSpacing = tableLines.length >= 3 && tableLines.slice(1, 3).every((line, index) => {
    const previous = tableLines[index];
    const gap = line.start - previous.end;
    return gap >= 45 && gap <= 150;
  });
  if (!hasRegularSpacing && !fallbackLine) continue;
  const firstLine = hasRegularSpacing ? tableLines[0].start : fallbackLine.start;

  const whiteHeight = info.height - Math.max(0, firstLine - 5);
  const withoutTable = await sharp(path)
    .composite([{
      input: {
        create: {
          width: info.width,
          height: whiteHeight,
          channels: 3,
          background: "#ffffff",
        },
      },
      left: 0,
      top: info.height - whiteHeight,
    }])
    .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
    .toBuffer();

  await sharp(withoutTable)
    .trim({ background: "#ffffff", threshold: 9 })
    .resize({ width: 1280, height: 1280, fit: "contain", background: "#ffffff", withoutEnlargement: false })
    .extend({ top: 48, right: 48, bottom: 48, left: 48, background: "#ffffff" })
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
    .toFile(`${path}.tmp`);
  await rename(`${path}.tmp`, path);
  cleaned += 1;
}

console.log(`${cleaned}/${files.length} technical sheets had empty source-table lines removed`);
