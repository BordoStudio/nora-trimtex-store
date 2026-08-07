import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const BASE_URL = "http://www.chinatrimming.cn";
const account = process.env.CHINA_ACCOUNT;
const password = process.env.CHINA_PASSWORD;

if (!account || !password) {
  throw new Error("Set CHINA_ACCOUNT and CHINA_PASSWORD before importing dimension images.");
}

const catalog = JSON.parse(await readFile(join(process.cwd(), "data", "catalog.full.json"), "utf8"));
const outputDir = join(process.cwd(), "public", "products", "dimensions");
const manifestPath = join(process.cwd(), "data", "catalog.dimensions.json");
await mkdir(outputDir, { recursive: true });

const jar = new Map();
const cookieHeader = () => [...jar].map(([key, value]) => `${key}=${value}`).join("; ");
const collectCookies = (headers) => {
  const values = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [headers.get("set-cookie")].filter(Boolean);
  for (const value of values) {
    const pair = value.split(";", 1)[0];
    const equals = pair.indexOf("=");
    if (equals > 0) jar.set(pair.slice(0, equals), pair.slice(equals + 1));
  }
};

async function request(url, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const headers = new Headers(options.headers);
      headers.set("user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36");
      if (jar.size) headers.set("cookie", cookieHeader());
      const response = await fetch(url, { ...options, headers, redirect: "manual", signal: AbortSignal.timeout(20_000) });
      collectCookies(response.headers);
      if (response.status >= 300 && response.status < 400) {
        return request(new URL(response.headers.get("location"), url), options);
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw lastError;
}

const loginResponse = await request(`${BASE_URL}/tools/submit_ajax.ashx?action=user_login_${Date.now()}`, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
  body: new URLSearchParams({ username: account, password, remember: "0", duid: "ff9147e6a564cd34" }),
});
const loginResult = await loginResponse.json();
if (String(loginResult.status) !== "1") throw new Error(`Catalog login failed: ${loginResult.msg || "unknown error"}`);

const products = catalog.filter((product) => ["tassels-large", "tassels-small"].includes(product.categoryId));
const limit = Number(process.env.LIMIT || products.length);
const manifest = {};
try { Object.assign(manifest, JSON.parse(await readFile(manifestPath, "utf8"))); } catch { /* Start a new manifest. */ }

function findDetailImages(html, sku) {
  const tags = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  const candidates = tags.map((tag) => ({
    src: tag.match(/\bsrc=["']([^"']+)["']/i)?.[1],
    alt: tag.match(/\balt=["']([^"']*)["']/i)?.[1] || "",
  })).filter(({ src, alt }) => src && /\/upload\//i.test(src) && /(?:SPU)?[^"']*-D-\d+/i.test(alt));
  const own = candidates.filter(({ alt }) => alt.toUpperCase().includes(sku.toUpperCase()));
  return (own.length ? own : candidates).map(({ src }) => src);
}

function imageDimensions(buffer) {
  if (buffer.subarray(1, 4).toString("ascii") === "PNG") return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    if (!length) break;
    offset += 2 + length;
  }
  return null;
}

for (const [productId, imageKey] of Object.entries(manifest)) {
  try {
    const dimensions = imageDimensions(await readFile(join(process.cwd(), "public", imageKey)));
    if (!dimensions || dimensions.height / dimensions.width < 1.18) delete manifest[productId];
  } catch { delete manifest[productId]; }
}

let imported = 0;
let missing = 0;
const pending = products.slice(0, limit).filter((product) => !manifest[product.id]);

async function importProduct(product) {
  try {
    const variantId = product.variants?.[0]?.id;
    if (!variantId) return;
    const page = await request(`${BASE_URL}/commodities/show-${variantId}.html`);
    const html = await page.text();
    const sources = findDetailImages(html, product.sku);
    if (!sources.length) {
      missing += 1;
      console.warn(`No dimension image: ${product.sku}`);
      return;
    }
    let selected;
    for (const source of sources.toReversed()) {
      const imageUrl = new URL(source, BASE_URL);
      const imageResponse = await request(imageUrl);
      if (!imageResponse.ok) continue;
      const buffer = Buffer.from(await imageResponse.arrayBuffer());
      const dimensions = imageDimensions(buffer);
      if (dimensions && dimensions.height / dimensions.width >= 1.18) {
        selected = { imageUrl, buffer };
        break;
      }
    }
    if (!selected) {
      missing += 1;
      console.warn(`No portrait dimension sheet: ${product.sku}`);
      return;
    }
    const extension = extname(selected.imageUrl.pathname).toLowerCase() || ".jpg";
    const fileName = `${product.id}${extension}`;
    await writeFile(join(outputDir, fileName), selected.buffer);
    manifest[product.id] = `products/dimensions/${fileName}`;
    imported += 1;
    console.log(`Imported ${product.sku} (${imported})`);
  } catch (error) {
    missing += 1;
    console.warn(`Skipped after network error: ${product.sku} (${error instanceof Error ? error.message : "unknown error"})`);
  }
}

const batchSize = Math.max(1, Number(process.env.CONCURRENCY || 12));
for (let index = 0; index < pending.length; index += batchSize) {
  await Promise.all(pending.slice(index, index + batchSize).map(importProduct));
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Saved progress: ${Math.min(index + batchSize, pending.length)}/${pending.length}`);
}

console.log(`Dimension import complete: ${imported} added, ${missing} not found, ${Object.keys(manifest).length} total.`);
