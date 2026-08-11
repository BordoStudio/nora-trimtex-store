import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const [cookieJarArg = "/private/tmp/china-specs-cookies.txt", outputArg = "data/catalog.specifications.raw.json"] = process.argv.slice(2);
const catalogPath = resolve("data/catalog.full.json");
const sampleCatalogPath = resolve("data/catalog.samples.json");
const cookieJarPath = resolve(cookieJarArg);
const outputPath = resolve(outputArg);
const origin = "http://www.chinatrimming.cn";
const concurrency = 6;

const decodeHtml = (value = "") => value
  .replace(/<br\s*\/?>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;|&#160;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/\s+/g, " ")
  .trim();

const extractField = (html, label) => {
  const pattern = new RegExp(`<label>\\s*${label}\\s*</label>\\s*<div[^>]*class=["'][^"']*ulinforight[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>`, "i");
  return decodeHtml(html.match(pattern)?.[1] || "");
};

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
  throw new Error(`Authenticated ASP.NET session was not found in ${cookieJarPath}`);
}

const catalog = [
  ...JSON.parse(await readFile(catalogPath, "utf8")),
  ...JSON.parse(await readFile(sampleCatalogPath, "utf8")),
];
let existing = {};
try {
  existing = JSON.parse(await readFile(outputPath, "utf8"));
} catch {
  existing = {};
}

const jobs = catalog
  .map((product) => ({
    product,
    variantId: product.id.startsWith("sample-") ? product.id.slice("sample-".length) : product.variants?.[0]?.id,
  }))
  .filter(({ variantId, product }) => variantId && !existing[product.id]);

let completed = 0;
let cursor = 0;

const save = async () => {
  const ordered = Object.fromEntries(
    Object.entries(existing).sort(([a], [b]) => Number(a) - Number(b)),
  );
  await writeFile(outputPath, `${JSON.stringify(ordered, null, 2)}\n`);
};

const fetchProduct = async ({ product, variantId }) => {
  const url = `${origin}/commodities/show-${variantId}.html`;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Cookie: cookieHeader,
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) NoraTrimTexCatalogImport/1.0",
        },
        redirect: "manual",
      });
      if (response.status === 302) {
        throw new Error(`authentication expired (${response.headers.get("location") || "redirect"})`);
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      return {
        sku: product.sku,
        sourceVariantId: variantId,
        dimensionsZh: extractField(html, "尺寸"),
        compositionZh: extractField(html, "材质"),
      };
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 500));
    }
  }
};

const worker = async () => {
  while (cursor < jobs.length) {
    const jobIndex = cursor;
    cursor += 1;
    const job = jobs[jobIndex];
    try {
      existing[job.product.id] = await fetchProduct(job);
    } catch (error) {
      existing[job.product.id] = {
        sku: job.product.sku,
        sourceVariantId: job.variantId,
        dimensionsZh: "",
        compositionZh: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
    completed += 1;
    if (completed % 25 === 0 || completed === jobs.length) {
      await save();
      console.log(`${completed}/${jobs.length} product specifications imported`);
    }
  }
};

await Promise.all(Array.from({ length: concurrency }, () => worker()));
await save();

const values = Object.values(existing);
console.log(JSON.stringify({
  products: values.length,
  withDimensions: values.filter((item) => item.dimensionsZh).length,
  withComposition: values.filter((item) => item.compositionZh).length,
  errors: values.filter((item) => item.error).length,
}, null, 2));
