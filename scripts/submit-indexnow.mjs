import { readFile } from "node:fs/promises";

const host = "noratrim.com";
const key = "a941e64f2b8d4c68a13f7ec9d2e07b51";
const locales = ["ru", "uk", "de", "en"];
const categories = ["tassels-large", "tassels-small", "tassel-trim", "decorative-tapes", "fringe", "cord-fringe", "cords", "holdbacks", "home", "samples"];
const catalogue = [
  ...JSON.parse(await readFile(new URL("../data/catalog.full.json", import.meta.url), "utf8")),
  ...JSON.parse(await readFile(new URL("../data/catalog.samples.json", import.meta.url), "utf8")),
];
const slugs = [...new Set(catalogue.map((product) => product.slug).filter(Boolean))];
const paths = [
  "",
  ...locales.flatMap((locale) => [
    `/${locale}`,
    `/${locale}/catalog`,
    `/${locale}/about`,
    ...categories.map((category) => `/${locale}/catalog?category=${category}`),
    ...slugs.map((slug) => `/${locale}/product/${slug}`),
  ]),
];
const urlList = [...new Set(paths.map((path) => `https://${host}${path}`))];

if (urlList.length > 10_000) throw new Error(`IndexNow batch is too large: ${urlList.length}`);

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList }),
});

if (!response.ok && response.status !== 202) throw new Error(`IndexNow responded with ${response.status}: ${await response.text()}`);
console.log(`IndexNow accepted ${urlList.length} Nora TrimTex URLs (${response.status}).`);
