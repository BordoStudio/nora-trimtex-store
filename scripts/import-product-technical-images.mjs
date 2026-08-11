import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { promisify } from "node:util";
import sharp from "../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js";

const execFileAsync = promisify(execFile);
const argumentsList = process.argv.slice(2);
const cookieJarArg = argumentsList.find((argument) => !argument.startsWith("--")) || "/private/tmp/china-specs-cookies.txt";
const productFilter = argumentsList.find((argument) => argument.startsWith("--product="))?.slice("--product=".length);
const cookieJarPath = resolve(cookieJarArg);
const outputPath = resolve("data/catalog.technical-images.json");
const publicDirectory = resolve("public/products/technical");
const temporaryDirectory = "/private/tmp/nora-technical-images";
const cleanerBinary = "/private/tmp/nora-clean-technical-sheet";
const origin = "http://www.chinatrimming.cn";
const concurrency = 10;

const cookieLines = (await readFile(cookieJarPath, "utf8"))
  .split(/\r?\n/)
  .map((line) => line.startsWith("#HttpOnly_") ? line.slice("#HttpOnly_".length) : line)
  .filter((line) => line && !line.startsWith("#"));
const cookieHeader = cookieLines
  .map((line) => line.split("\t"))
  .filter((columns) => columns.length >= 7)
  .map((columns) => `${columns[5]}=${columns[6]}`)
  .join("; ");

if (!cookieHeader.includes("ASP.NET_SessionId=")) {
  throw new Error(`Authenticated session was not found in ${cookieJarPath}`);
}

await mkdir(publicDirectory, { recursive: true });
await mkdir(temporaryDirectory, { recursive: true });
await execFileAsync("swiftc", [
  resolve("scripts/clean-technical-sheet.swift"),
  "-o",
  cleanerBinary,
], {
  env: {
    ...process.env,
    CLANG_MODULE_CACHE_PATH: "/private/tmp/nora-clang-module-cache",
    SWIFT_MODULECACHE_PATH: "/private/tmp/nora-swift-module-cache",
  },
});

const catalog = [
  ...JSON.parse(await readFile(resolve("data/catalog.full.json"), "utf8")),
  ...JSON.parse(await readFile(resolve("data/catalog.samples.json"), "utf8")),
];
const existingDimensions = JSON.parse(await readFile(resolve("data/catalog.dimensions.json"), "utf8"));
let manifest = {};
try {
  manifest = JSON.parse(await readFile(outputPath, "utf8"));
} catch {
  manifest = {};
}

const absoluteUrl = (url) => url.startsWith("http") ? url : `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
const detailImages = (html) => {
  const block = html.match(/<div\s+class=["']detailtxt["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] || "";
  return [...block.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => absoluteUrl(match[1]))
    .slice(0, 5);
};

const request = async (url) => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Cookie: cookieHeader,
          "User-Agent": "Mozilla/5.0 NoraTrimTexStaticImporter/1.0",
        },
        redirect: "manual",
      });
      if (response.status === 302) throw new Error("authentication expired");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 600));
    }
  }
};

const prepareImage = async (sourcePath, outputFile, kind) => {
  const metadata = await sharp(sourcePath).metadata();
  const top = Math.round((metadata.height || 1000) * 0.14);
  const bottom = Math.round((metadata.height || 1000) * (kind === "dimensions" ? 0.34 : 0.1));
  const croppedHeight = Math.max(240, (metadata.height || 1000) - top - bottom);
  const cropped = await sharp(sourcePath)
    .extract({ left: 0, top, width: metadata.width, height: croppedHeight })
    .toBuffer();
  await sharp(cropped)
    .trim({ background: "#ffffff", threshold: 9 })
    .resize({ width: 1280, height: 1280, fit: "contain", background: "#ffffff", withoutEnlargement: false })
    .extend({ top: 48, right: 48, bottom: 48, left: 48, background: "#ffffff" })
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
    .toFile(outputFile);
};

const saveManifest = async () => {
  const ordered = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })));
  await writeFile(outputPath, `${JSON.stringify(ordered, null, 2)}\n`);
};

const jobs = catalog.filter((product) => !manifest[product.id] && (!productFilter || product.id === productFilter));
let cursor = 0;
let completed = 0;

const processProduct = async (product) => {
  const variantId = product.id.startsWith("sample-") ? product.id.slice(7) : product.variants?.[0]?.id;
  if (!variantId) return [];

  const page = await request(`${origin}/commodities/show-${variantId}.html`);
  const urls = detailImages(await page.text());
  const results = [];
  const kinds = new Set();

  for (let index = 0; index < urls.length && results.length < 2; index += 1) {
    const rawPath = `${temporaryDirectory}/${product.id}-${index + 1}-${basename(new URL(urls[index]).pathname)}`;
    const cleanedPath = `${temporaryDirectory}/${product.id}-${index + 1}-clean.jpg`;
    try {
      const imageResponse = await request(urls[index]);
      await writeFile(rawPath, Buffer.from(await imageResponse.arrayBuffer()));
      const { stdout } = await execFileAsync(cleanerBinary, [rawPath, cleanedPath]);
      const result = JSON.parse(stdout.trim());
      if (result.kind === "irrelevant" || kinds.has(result.kind)) continue;
      if (result.kind === "dimensions" && existingDimensions[product.id]) continue;

      const filename = `${product.id}-${result.kind}.jpg`;
      await prepareImage(cleanedPath, resolve(publicDirectory, filename), result.kind);
      results.push({ kind: result.kind, image: `products/technical/${filename}` });
      kinds.add(result.kind);
    } catch (error) {
      if (error?.code !== 10) {
        console.warn(`${product.sku} image ${index + 1}: ${error instanceof Error ? error.message : error}`);
      }
    } finally {
      await rm(rawPath, { force: true });
      await rm(cleanedPath, { force: true });
    }
  }
  return results;
};

const worker = async () => {
  while (cursor < jobs.length) {
    const index = cursor++;
    const product = jobs[index];
    try {
      manifest[product.id] = await processProduct(product);
    } catch (error) {
      manifest[product.id] = [];
      console.warn(`${product.sku}: ${error instanceof Error ? error.message : error}`);
    }
    completed += 1;
    if (completed % 10 === 0 || completed === jobs.length) {
      await saveManifest();
      console.log(`${completed}/${jobs.length} products checked`);
    }
  }
};

await Promise.all(Array.from({ length: concurrency }, () => worker()));
await saveManifest();

const imported = Object.values(manifest).flat();
console.log(JSON.stringify({
  products: Object.keys(manifest).length,
  diagrams: imported.length,
  dimensions: imported.filter((item) => item.kind === "dimensions").length,
  sewing: imported.filter((item) => item.kind === "sewing").length,
}, null, 2));
