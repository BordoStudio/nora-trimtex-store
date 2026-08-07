import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "data/catalog.sample-pages.source.json");
const outputPath = path.join(root, "data/catalog.sample-pages.json");
const publicRoot = path.join(root, "public/products/sample-pages");
const origin = "http://www.chinatrimming.cn";
const source = JSON.parse(await readFile(sourcePath, "utf8"));
const localPages = {};

await mkdir(publicRoot, { recursive: true });

async function download(catalogId, sourceUrl, index) {
  const extension = path.extname(new URL(sourceUrl, origin).pathname) || ".jpg";
  const fileName = `${String(index + 1).padStart(2, "0")}${extension.toLowerCase()}`;
  const directory = path.join(publicRoot, catalogId);
  const destination = path.join(directory, fileName);
  await mkdir(directory, { recursive: true });

  const response = await fetch(new URL(sourceUrl, origin), {
    headers: { "user-agent": "Mozilla/5.0 Nora TrimTex catalogue importer" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`${response.status} ${sourceUrl}`);
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
  return `/products/sample-pages/${catalogId}/${fileName}`;
}

for (const [catalogId, pages] of Object.entries(source)) {
  const downloaded = [];
  for (let index = 0; index < pages.length; index += 6) {
    const batch = pages.slice(index, index + 6);
    downloaded.push(...await Promise.all(
      batch.map((url, batchIndex) => download(catalogId, url, index + batchIndex)),
    ));
  }
  localPages[`sample-${catalogId}`] = downloaded;
  console.log(`${catalogId}: ${downloaded.length} pages`);
}

await writeFile(outputPath, `${JSON.stringify(localPages, null, 2)}\n`, "utf8");
console.log(`Imported ${Object.values(localPages).flat().length} catalogue pages.`);
