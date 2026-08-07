import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

const BASE_URL = "http://www.chinatrimming.cn";
const account = process.env.CHINA_ACCOUNT;
const password = process.env.CHINA_PASSWORD;

if (!account || !password) {
  throw new Error("Set CHINA_ACCOUNT and CHINA_PASSWORD before running the importer.");
}

const dataDir = join(process.cwd(), "data", "migration");
const imageDir = join(dataDir, "assets");
const outputPath = join(dataDir, "catalog.raw.json");
await mkdir(dataDir, { recursive: true });
await mkdir(imageDir, { recursive: true });

const decode = (value = "") =>
  value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const absoluteUrl = (value) => new URL(value, BASE_URL).href;

const categoryFor = (name) => {
  if (/壁钩|挂钩/.test(name)) return "holdbacks";
  if (/家居|抱枕|窗帘|靠垫|圣诞|花环/.test(name)) return "home";
  if (/毛边/.test(name)) return "fringe";
  if (/绳排须|排须/.test(name)) return "cord-fringe";
  if (/绳编|牙绳|包绳/.test(name)) return "cords";
  if (/装饰带|窄带|带子|提花|刺绣|织带/.test(name)) return "decorative-tapes";
  if (/小吊穗|圆盘|盘扣|两头穗/.test(name)) return "tassels-small";
  if (/大穗|挂球|吊球|绑带/.test(name)) return "tassels-large";
  if (/花边|绒球|勒丝珠|珠子|扎穗|穗球|蕾丝/.test(name)) return "tassel-trim";
  return "decorative-tapes";
};

const collectCookies = (headers, jar) => {
  const values = typeof headers.getSetCookie === "function"
    ? headers.getSetCookie()
    : [headers.get("set-cookie")].filter(Boolean);

  for (const value of values) {
    const pair = value.split(";", 1)[0];
    const equals = pair.indexOf("=");
    if (equals > 0) jar.set(pair.slice(0, equals), pair.slice(equals + 1));
  }
};

const cookieHeader = (jar) =>
  [...jar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");

const jar = new Map();

const request = async (url, options = {}) => {
  let lastError;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const headers = new Headers(options.headers);
    if (jar.size) headers.set("cookie", cookieHeader(jar));

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        redirect: "manual",
        signal: AbortSignal.timeout(60_000),
      });
      collectCookies(response.headers, jar);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < 4) {
        console.warn(`Retrying ${url} (${attempt}/4)`);
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
      }
    }
  }

  throw lastError;
};

const loginBody = new URLSearchParams({
  username: account,
  password,
  remember: "0",
  duid: "ff9147e6a564cd34",
});

const loginResponse = await request(
  `${BASE_URL}/tools/submit_ajax.ashx?action=user_login_${Date.now()}`,
  {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body: loginBody,
  },
);

const loginText = await loginResponse.text();
let loginResult;
try {
  loginResult = JSON.parse(loginText);
} catch {
  throw new Error(`Unexpected login response: ${loginText.slice(0, 200)}`);
}

if (String(loginResult.status) !== "1") {
  throw new Error(`Catalog login failed: ${loginResult.msg || "unknown error"}`);
}

const firstResponse = await request(`${BASE_URL}/commodity.html`);
const firstHtml = await firstResponse.text();

if (/请输入手机号|user_login_/.test(firstHtml)) {
  throw new Error("Login succeeded, but the catalog session was not retained.");
}

const pageLinks = [...firstHtml.matchAll(/href="([^"]*\/commodity\/[^"/]+\/(\d+)\.html)"/g)];
const totalPages = Math.max(1, ...pageLinks.map((match) => Number(match[2])));
const pageTemplateMatch = pageLinks.find((match) => Number(match[2]) === totalPages) || pageLinks[0];
const pageTemplate = pageTemplateMatch
  ? absoluteUrl(pageTemplateMatch[1]).replace(/\/\d+\.html$/, "/{page}.html")
  : null;

const parseProducts = (html, page) => {
  const anchorPattern = /<a\s+id="link2_(\d+)"\s+href="([^"]+)"\s+class="pgwtxt">\s*<p[^>]*title="([^"]*)"[^>]*>[\s\S]*?<\/p>\s*<h3>([\s\S]*?)<\/h3>/g;
  const products = [];

  for (const match of html.matchAll(anchorPattern)) {
    const familyId = match[1];
    const originalName = decode(match[3]);
    const sku = decode(match[4]);
    const blockStart = html.lastIndexOf('<div class="product">', match.index);
    const block = html.slice(Math.max(0, blockStart), match.index);
    const variants = [];
    const seen = new Set();
    const imagePattern = new RegExp(
      `img\\s+id="img_(\\d+)_${familyId}"[^>]+(?:src="([^"]+)"[^>]*bigimg="([^"]+)"|bigimg="([^"]+)"[^>]*src="([^"]+)")`,
      "g",
    );

    for (const imageMatch of block.matchAll(imagePattern)) {
      const goodsId = imageMatch[1];
      const src = imageMatch[3] || imageMatch[4] || imageMatch[2] || imageMatch[5];
      if (!src || seen.has(goodsId)) continue;
      seen.add(goodsId);
      variants.push({
        id: goodsId,
        image: absoluteUrl(src),
      });
    }

    products.push({
      id: familyId,
      sku,
      originalName,
      category: categoryFor(originalName),
      image: variants[0]?.image || null,
      variants,
      importedFromPage: page,
    });
  }

  return products;
};

const productsById = new Map();
const completedPages = new Set();

if (process.env.RESUME !== "0") {
  try {
    const checkpoint = JSON.parse(await readFile(outputPath, "utf8"));
    for (const product of checkpoint.products || []) productsById.set(product.id, product);
    for (const page of checkpoint.completedPages || []) completedPages.add(page);
    console.log(`Resuming from checkpoint: ${productsById.size} products, ${completedPages.size} pages`);
  } catch {
    // A missing or incomplete checkpoint simply starts a fresh import.
  }
}

const saveCheckpoint = async () => {
  const products = [...productsById.values()];
  const output = {
    importedAt: new Date().toISOString(),
    source: BASE_URL,
    totalPages,
    completedPages: [...completedPages].sort((a, b) => a - b),
    totalProducts: products.length,
    products,
  };
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
};

for (let page = 1; page <= totalPages; page += 1) {
  if (completedPages.has(page)) continue;
  const html = page === 1
    ? firstHtml
    : await (await request(pageTemplate.replace("{page}", String(page)))).text();

  for (const product of parseProducts(html, page)) productsById.set(product.id, product);
  completedPages.add(page);
  await saveCheckpoint();
  console.log(`Imported page ${page}/${totalPages}: ${productsById.size} product families`);
}

const products = [...productsById.values()];

if (process.env.DOWNLOAD_IMAGES === "1") {
  let downloaded = 0;
  for (const product of products) {
    if (!product.image) continue;
    const extension = extname(new URL(product.image).pathname) || ".jpg";
    const fileName = `${product.id}${extension.toLowerCase()}`;
    const localPath = join(imageDir, basename(fileName));
    try {
      await access(localPath);
      product.localImage = `assets/${fileName}`;
      continue;
    } catch {
      // Download files that are not present in the local migration store.
    }
    const imageResponse = await request(product.image);
    if (!imageResponse.ok) continue;
    await writeFile(localPath, Buffer.from(await imageResponse.arrayBuffer()));
    product.localImage = `assets/${fileName}`;
    downloaded += 1;
    if (downloaded % 25 === 0) {
      await saveCheckpoint();
      console.log(`Downloaded ${downloaded} new product images`);
    }
  }
}
await saveCheckpoint();
console.log(`Saved ${products.length} product families to data/migration/catalog.raw.json`);
