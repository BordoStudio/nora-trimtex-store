import { readFile, readdir, stat } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";

const endpoint = process.env.R2_UPLOAD_URL?.replace(/\/$/, "");
const token = process.env.R2_UPLOAD_TOKEN;
if (!endpoint || !token) throw new Error("R2_UPLOAD_URL and R2_UPLOAD_TOKEN are required");

const publicDirectory = resolve(process.cwd(), "public");
const roots = [resolve(publicDirectory, "products"), resolve(publicDirectory, "brand")];
const rootFiles = ["favicon-32.png", "icon-192.png", "icon-512.png"];
const contentTypes = {
  ".avif": "image/avif", ".gif": "image/gif", ".jpeg": "image/jpeg", ".jpg": "image/jpeg",
  ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp",
};

for (let attempt = 1; attempt <= 30; attempt += 1) {
  const ready = await fetch(`${endpoint}/__upload-ready`, {
    headers: { "x-nora-upload-token": token },
  });
  if (ready.status === 204) break;
  if (attempt === 30) throw new Error("R2 upload authorization did not become ready");
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.filter((entry) => !entry.name.startsWith(".")).map((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? walk(path) : Promise.resolve([path]);
  }));
  return nested.flat();
}

const paths = (await Promise.all(roots.map(walk))).flat();
for (const name of rootFiles) {
  const path = resolve(publicDirectory, name);
  try { if ((await stat(path)).isFile()) paths.push(path); } catch { /* optional icon */ }
}

const assets = paths.map((path) => ({
  path,
  key: relative(publicDirectory, path).split(sep).join("/"),
})).sort((left, right) => left.key.localeCompare(right.key));

let complete = 0;
const concurrency = 8;
async function upload(asset) {
  const file = await stat(asset.path);
  const publicUrl = `${endpoint}/${asset.key.split("/").map(encodeURIComponent).join("/")}`;
  const existing = await fetch(publicUrl, { method: "HEAD" });
  if (existing.ok && Number(existing.headers.get("content-length")) === file.size) {
    complete += 1;
    if (complete % 100 === 0 || complete === assets.length) console.log(`Processed ${complete}/${assets.length}`);
    return;
  }
  const body = await readFile(asset.path);
  let response;
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    response = await fetch(`${endpoint}/__upload/${asset.key.split("/").map(encodeURIComponent).join("/")}`, {
      method: "PUT",
      headers: {
        "x-nora-upload-token": token,
        "content-type": contentTypes[extname(asset.path).toLowerCase()] || "application/octet-stream",
      },
      body,
    });
    if (response.ok) break;
    if (attempt < 20) {
      const retryDelay = response.status === 401 ? 1000 : Math.min(attempt * 750, 5000);
      await new Promise((resolveDelay) => setTimeout(resolveDelay, retryDelay));
    }
  }
  if (!response?.ok) throw new Error(`Upload failed (${response?.status}) for ${asset.key}`);
  complete += 1;
  if (complete % 100 === 0 || complete === assets.length) console.log(`Uploaded ${complete}/${assets.length}`);
}

for (let index = 0; index < assets.length; index += concurrency) {
  await Promise.all(assets.slice(index, index + concurrency).map(upload));
}

console.log(`Uploaded ${assets.length} original assets without recompression`);
