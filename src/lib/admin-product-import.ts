import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { accountRequest, relay } from "@/lib/account-api";

const CHINA_ORIGIN = "http://www.chinatrimming.cn";
const MAX_IMAGES = 24;

export type ProductDraft = {
  id: string;
  sku: string;
  categoryId: string;
  status: "draft" | "active";
  names: Record<"ru" | "uk" | "de" | "en", string>;
  descriptions?: Partial<Record<"ru" | "uk" | "de" | "en", string>>;
  primaryImageKey: string;
  media: Array<{ key: string; alt: ProductDraft["names"]; sortOrder: number }>;
  variants: Array<{ id: string; optionValues: Record<string, string>; mediaKeys: string[]; stock: { tracked: boolean; available: number } }>;
  partnerPriceUsd?: number;
  isNew: boolean;
  attributes: Record<string, string | number | boolean>;
};

export type ChinaListingProduct = {
  familyId: string;
  url: string;
  sku: string;
  originalName: string;
  variants: Array<{ id: string; imageUrl: string }>;
};

type ChinaSession = { request: (url: string, init?: RequestInit) => Promise<Response> };

const decodeHtml = (value = "") => value
  .replaceAll("&amp;", "&")
  .replaceAll("&quot;", '"')
  .replaceAll("&#39;", "'")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const highResolutionUrl = (value: string) => {
  const url = new URL(value, CHINA_ORIGIN);
  url.pathname = url.pathname.replace(/\/thumb_([^/]+)$/, "/$1");
  return url.href;
};

const categoryFor = (name: string) => {
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

const categoryNames: Record<string, ProductDraft["names"]> = {
  "tassels-large": { en: "Large tassel", de: "Große Quaste", uk: "Велика китиця", ru: "Большая кисть" },
  "tassels-small": { en: "Small tassel", de: "Kleine Quaste", uk: "Мала китиця", ru: "Малая кисть" },
  "tassel-trim": { en: "Tassel trim", de: "Quastenborte", uk: "Бахрома з китицями", ru: "Бахрома с кистями" },
  "decorative-tapes": { en: "Border or braid", de: "Bordüre oder Borte", uk: "Бордюр або тасьма", ru: "Бордюр или тесьма" },
  fringe: { en: "Decorative fringe", de: "Dekorfranse", uk: "Декоративна бахрома", ru: "Декоративная бахрома" },
  "cord-fringe": { en: "Cord fringe", de: "Kordelfranse", uk: "Шнурова бахрома", ru: "Шнуровая бахрома" },
  cords: { en: "Decorative cord", de: "Dekorkordel", uk: "Декоративний шнур", ru: "Декоративный шнур" },
  holdbacks: { en: "Wall hook or rosette", de: "Wandhaken oder Rosette", uk: "Настінний гачок або розетка", ru: "Настенный крючок или розетка" },
  home: { en: "Home accent", de: "Wohnaccessoire", uk: "Декор для дому", ru: "Декор для дома" },
  samples: { en: "Sample set", de: "Musterset", uk: "Комплект зразків", ru: "Комплект образцов" },
};

const localizedNames = (categoryId: string, sku: string): ProductDraft["names"] => {
  const base = categoryNames[categoryId] || categoryNames["decorative-tapes"]!;
  return { en: `${base.en} ${sku}`, de: `${base.de} ${sku}`, uk: `${base.uk} ${sku}`, ru: `${base.ru} ${sku}` };
};

export function parseChinaListing(html: string): ChinaListingProduct[] {
  const anchorPattern = /<a\s+id="link2_(\d+)"\s+href="([^"]+)"\s+class="pgwtxt">\s*<p[^>]*title="([^"]*)"[^>]*>[\s\S]*?<\/p>\s*<h3>([\s\S]*?)<\/h3>/g;
  const products: ChinaListingProduct[] = [];
  for (const match of html.matchAll(anchorPattern)) {
    const familyId = match[1];
    const blockStart = html.lastIndexOf('<div class="product">', match.index);
    const block = html.slice(Math.max(0, blockStart), match.index);
    const variants: ChinaListingProduct["variants"] = [];
    const seen = new Set<string>();
    const imagePattern = new RegExp(`img\\s+id="img_(\\d+)_${familyId}"[^>]+(?:src="([^"]+)"[^>]*bigimg="([^"]+)"|bigimg="([^"]+)"[^>]*src="([^"]+)")`, "g");
    for (const imageMatch of block.matchAll(imagePattern)) {
      const id = imageMatch[1];
      const source = imageMatch[3] || imageMatch[4] || imageMatch[2] || imageMatch[5];
      if (!source || seen.has(id)) continue;
      seen.add(id);
      variants.push({ id, imageUrl: highResolutionUrl(source) });
    }
    const sku = decodeHtml(match[4]).toUpperCase();
    if (!sku) continue;
    products.push({ familyId, url: new URL(match[2], CHINA_ORIGIN).href, sku, originalName: decodeHtml(match[3]), variants });
  }
  return products;
}

function parseChinaDetail(html: string, sourceUrl: string): ChinaListingProduct {
  const titleMatch = html.match(/<div class="detail-info">[\s\S]*?<h2>([\s\S]*?)<\/h2>\s*<p>([\s\S]*?)<\/p>/);
  const familyMatch = html.match(/hidProductId[^>]+value="(\d+)"/) || html.match(/link2_(\d+)/);
  const goodsMatch = html.match(/id="hidMainGoodsId"\s+value="(\d+)"/) || sourceUrl.match(/show-(\d+)\.html/);
  const originalName = decodeHtml(titleMatch?.[1]);
  const sku = decodeHtml(titleMatch?.[2]).toUpperCase();
  if (!sku || !goodsMatch?.[1]) throw new Error("Не удалось прочитать артикул на странице китайского сайта.");
  const variants: ChinaListingProduct["variants"] = [];
  const seen = new Set<string>();
  const variantPattern = /hidColor_no[^>]+value="([^"]*)"[\s\S]{0,1800}?hidId[^>]+value="(\d+)"[\s\S]{0,2400}?id="img_url"\s+value="([^"]+)"/g;
  for (const match of html.matchAll(variantPattern)) {
    if (seen.has(match[2])) continue;
    seen.add(match[2]);
    variants.push({ id: match[2], imageUrl: highResolutionUrl(match[3]) });
  }
  if (!variants.length) {
    const image = html.match(/<img\s+class="first_show"\s+src="([^"]+)"/);
    if (image?.[1]) variants.push({ id: goodsMatch[1], imageUrl: highResolutionUrl(image[1]) });
  }
  if (!variants.length) throw new Error("На странице товара не найдено изображение.");
  return { familyId: familyMatch?.[1] || goodsMatch[1], url: sourceUrl, sku, originalName, variants };
}

async function cloudflareEnv() {
  return (await getCloudflareContext({ async: true })).env;
}

export async function requireAdminAccess(): Promise<Response | null> {
  const response = await accountRequest("/api/v1/admin/products?q=__admin_check__", {}, true);
  return response.ok ? null : relay(response);
}

export async function existingProductSkus(): Promise<Set<string>> {
  const response = await accountRequest("/api/v1/admin/products", {}, true);
  if (!response.ok) throw new Error(`Каталог недоступен (${response.status}).`);
  const payload = await response.json() as { data?: { items?: Array<{ sku?: string }> } };
  return new Set((payload.data?.items || []).map((item) => String(item.sku || "").toUpperCase()).filter(Boolean));
}

export async function createBackendProduct(product: ProductDraft): Promise<Response> {
  return accountRequest("/api/v1/admin/products", { method: "POST", body: JSON.stringify(product) }, true);
}

async function chinaSession(): Promise<ChinaSession> {
  const env = await cloudflareEnv();
  const account = env.CHINA_ACCOUNT;
  const password = env.CHINA_PASSWORD;
  if (!account || !password) throw new Error("Доступ к китайскому сайту ещё не настроен.");
  const jar = new Map<string, string>();
  const collectCookies = (headers: Headers) => {
    const values = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [headers.get("set-cookie")].filter(Boolean) as string[];
    for (const value of values) {
      const pair = value.split(";", 1)[0];
      const index = pair.indexOf("=");
      if (index > 0) jar.set(pair.slice(0, index), pair.slice(index + 1));
    }
  };
  const request = async (url: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    if (jar.size) headers.set("cookie", [...jar].map(([key, value]) => `${key}=${value}`).join("; "));
    const response = await fetch(url, { ...init, headers, redirect: "manual", signal: AbortSignal.timeout(45_000) });
    collectCookies(response.headers);
    return response;
  };
  const login = await request(`${CHINA_ORIGIN}/tools/submit_ajax.ashx?action=user_login_${Date.now()}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body: new URLSearchParams({ username: account, password, remember: "0", duid: "ff9147e6a564cd34" }),
  });
  const result = await login.json() as { status?: number | string; msg?: string };
  if (String(result.status) !== "1") throw new Error(result.msg || "Не удалось войти на китайский сайт.");
  return { request };
}

async function assetBucket() {
  const bucket = (await cloudflareEnv()).PRODUCT_ASSETS;
  if (!bucket) throw new Error("Хранилище изображений не подключено.");
  return bucket;
}

const extensionFor = (contentType: string) => contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : contentType.includes("gif") ? "gif" : "jpg";

async function uploadRemoteImages(folder: string, images: ChinaListingProduct["variants"]) {
  const bucket = await assetBucket();
  const uploaded: Array<{ id: string; key: string }> = [];
  for (const image of images.slice(0, MAX_IMAGES)) {
    const response = await fetch(image.imageUrl, { signal: AbortSignal.timeout(45_000) });
    if (!response.ok) throw new Error(`Не удалось скачать изображение ${image.id} (${response.status}).`);
    const contentType = response.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) throw new Error(`Файл ${image.id} не является изображением.`);
    const body = await response.arrayBuffer();
    if (body.byteLength > 12 * 1024 * 1024) throw new Error(`Изображение ${image.id} больше 12 МБ.`);
    const key = `products/china/${folder}/${image.id}.${extensionFor(contentType)}`;
    await bucket.put(key, body, { httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" }, customMetadata: { source: image.imageUrl } });
    uploaded.push({ id: image.id, key });
  }
  return uploaded;
}

export async function uploadManualImages(productId: string, files: File[]) {
  const bucket = await assetBucket();
  const uploaded: Array<{ id: string; key: string }> = [];
  for (const [index, file] of files.slice(0, MAX_IMAGES).entries()) {
    if (!file.type.startsWith("image/")) throw new Error(`Файл «${file.name}» не является изображением.`);
    if (file.size > 12 * 1024 * 1024) throw new Error(`Файл «${file.name}» больше 12 МБ.`);
    const id = `${index + 1}-${crypto.randomUUID().slice(0, 8)}`;
    const key = `products/admin/${productId}/${id}.${extensionFor(file.type)}`;
    await bucket.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" } });
    uploaded.push({ id, key });
  }
  return uploaded;
}

function productFromChina(source: ChinaListingProduct, uploaded: Array<{ id: string; key: string }>, status: "draft" | "active"): ProductDraft {
  const categoryId = categoryFor(source.originalName);
  const names = localizedNames(categoryId, source.sku);
  const id = `china-${source.familyId}`;
  return {
    id,
    sku: source.sku,
    categoryId,
    status,
    names,
    primaryImageKey: uploaded[0]!.key,
    media: uploaded.map((image, sortOrder) => ({ key: image.key, alt: names, sortOrder })),
    variants: uploaded.map((image) => ({ id: image.id, optionValues: {}, mediaKeys: [image.key], stock: { tracked: false, available: 0 } })),
    isNew: true,
    attributes: { source: "chinatrimming.cn", chinaFamilyId: source.familyId, chinaUrl: source.url, chinaOriginalName: source.originalName },
  };
}

export async function importChinaProductByUrl(value: string, status: "draft" | "active" = "active") {
  const url = new URL(value);
  if (!/^(www\.)?chinatrimming\.cn$/i.test(url.hostname) || !/^\/commodities\/show-\d+\.html$/i.test(url.pathname)) throw new Error("Нужна ссылка вида chinatrimming.cn/commodities/show-123.html");
  const session = await chinaSession();
  const response = await session.request(url.href);
  if (!response.ok) throw new Error(`Китайский сайт вернул ошибку ${response.status}.`);
  const source = parseChinaDetail(await response.text(), url.href);
  if ((await existingProductSkus()).has(source.sku.toUpperCase())) throw new Error(`Товар ${source.sku} уже есть в каталоге.`);
  const uploaded = await uploadRemoteImages(source.familyId, source.variants);
  const product = productFromChina(source, uploaded, status);
  return { source, product, response: await createBackendProduct(product) };
}

export async function scanNewChinaProducts(existingSkus: Set<string>, startPage = 1, pageSize = 20) {
  const session = await chinaSession();
  const first = await session.request(`${CHINA_ORIGIN}/commodity.html`);
  if (!first.ok) throw new Error(`Китайский каталог вернул ошибку ${first.status}.`);
  const firstHtml = await first.text();
  if (/请输入手机号|user_login_/.test(firstHtml)) throw new Error("Китайский сайт не сохранил авторизацию.");
  const pageLinks = [...firstHtml.matchAll(/href="([^"]*\/commodity\/[^"/]+\/(\d+)\.html)"/g)];
  const totalPages = Math.max(1, ...pageLinks.map((match) => Number(match[2])));
  const templateMatch = pageLinks.find((match) => Number(match[2]) === totalPages) || pageLinks[0];
  const template = templateMatch ? new URL(templateMatch[1], CHINA_ORIGIN).href.replace(/\/\d+\.html$/, "/{page}.html") : null;
  if (totalPages > 1 && !template) throw new Error("Не удалось определить страницы китайского каталога.");
  const safeStart = Math.min(Math.max(1, Math.trunc(startPage)), totalPages);
  const safeSize = Math.min(Math.max(1, Math.trunc(pageSize)), 20);
  const endPage = Math.min(totalPages, safeStart + safeSize - 1);
  const pages = new Map<number, string>();
  if (safeStart === 1) pages.set(1, firstHtml);
  let nextPage = safeStart === 1 ? 2 : safeStart;
  const worker = async () => {
    while (nextPage <= endPage) {
      const page = nextPage++;
      const response = await session.request(template!.replace("{page}", String(page)));
      if (!response.ok) throw new Error(`Страница ${page} китайского каталога вернула ошибку ${response.status}.`);
      pages.set(page, await response.text());
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, Math.max(0, endPage - nextPage + 1)) }, () => worker()));
  const bySku = new Map<string, ChinaListingProduct>();
  for (const page of [...pages.keys()].sort((a, b) => a - b)) {
    const html = pages.get(page)!;
    for (const product of parseChinaListing(html)) if (!bySku.has(product.sku)) bySku.set(product.sku, product);
  }
  const discovered = [...bySku.values()];
  const items = discovered
    .filter((product) => !existingSkus.has(product.sku.toUpperCase()))
    .map((product) => ({
      familyId: product.familyId,
      url: product.url,
      sku: product.sku,
      originalName: product.originalName,
      categoryId: categoryFor(product.originalName),
      previewImage: product.variants[0]?.imageUrl || "",
      variantCount: product.variants.length,
    }));
  return { scanned: discovered.length, startPage: safeStart, endPage, totalPages, items };
}
