"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { Product } from "@/data/catalog";
import { categoryIds, type CategoryId } from "@/data/categories";
import { getDictionary, type Locale } from "@/lib/i18n";
import { ProductCard } from "./ProductCard";
import { SampleCatalogCard } from "./SampleCatalogCard";

const sampleCopy = {
  ru: { all: "Все каталоги", books: "Книги образцов", cards: "Карты образцов и боксы", results: "каталогов", search: "Поиск каталога или артикула" },
  uk: { all: "Усі каталоги", books: "Книги зразків", cards: "Карти зразків і бокси", results: "каталогів", search: "Пошук каталогу або артикула" },
  de: { all: "Alle Kataloge", books: "Musterbücher", cards: "Musterkarten & Boxen", results: "Kataloge", search: "Katalog oder Artikel suchen" },
  en: { all: "All catalogues", books: "Sample books", cards: "Sample cards & boxes", results: "catalogues", search: "Search catalogue or article" },
} satisfies Record<Locale, Record<string, string>>;

const subscribeToLocation = (callback: () => void) => {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
};

export function CatalogClient({ locale, initialProducts }: { locale: Locale; initialProducts: Product[] }) {
  const t = getDictionary(locale);
  const [query, setQuery] = useState("");
  const locationSearch = useSyncExternalStore(subscribeToLocation, () => window.location.search, () => "");
  const urlParams = new URLSearchParams(locationSearch);
  const requestedCategory = urlParams.get("category");
  const urlCategory: CategoryId | "all" = categoryIds.includes(requestedCategory as CategoryId) ? requestedCategory as CategoryId : "all";
  const urlSort: "new" | "sku" = urlParams.get("sort") === "sku" ? "sku" : "new";
  const [categoryOverride, setCategoryOverride] = useState<CategoryId | "all" | null>(null);
  const [sortOverride, setSortOverride] = useState<"new" | "sku" | null>(null);
  const [sampleType, setSampleType] = useState<"all" | "books" | "cards">("all");
  const category = categoryOverride ?? urlCategory;
  const sort = sortOverride ?? urlSort;
  const [visibleCount, setVisibleCount] = useState(36);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return initialProducts
      .filter((product) => category === "all" || product.categoryId === category)
      .filter((product) => !normalized || `${product.sku} ${product.name}`.toLowerCase().includes(normalized))
      .filter((product) => category !== "samples" || sampleType === "all" || (sampleType === "books" ? product.sku.startsWith("Y-DL-") : product.sku.startsWith("YK-DL-")))
      .sort((a, b) => sort === "sku" ? a.sku.localeCompare(b.sku) : Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)));
  }, [category, initialProducts, query, sampleType, sort]);

  const isSamples = category === "samples";

  return <>
    <div className="catalog-toolbar">
      <label className="search-field"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={isSamples ? sampleCopy[locale].search : t.catalog.search} /></label>
      <label className="sort-field"><SlidersHorizontal size={17} /><span>{t.catalog.sort}</span><select value={sort} onChange={(e) => setSortOverride(e.target.value as "new" | "sku")}><option value="new">{t.catalog.newest}</option><option value="sku">{t.catalog.sku}</option></select></label>
    </div>
    <div className="category-filter"><button className={category === "all" ? "active" : ""} onClick={() => setCategoryOverride("all")}>{t.catalog.all}</button>{categoryIds.map((id) => <button key={id} className={category === id ? "active" : ""} onClick={() => setCategoryOverride(id)}>{t.categories[id]}</button>)}</div>
    {isSamples && <div className="sample-catalog-tabs" aria-label={t.categories.samples}>
      <button className={sampleType === "all" ? "active" : ""} onClick={() => setSampleType("all")}>{sampleCopy[locale].all}</button>
      <button className={sampleType === "books" ? "active" : ""} onClick={() => setSampleType("books")}>{sampleCopy[locale].books}</button>
      <button className={sampleType === "cards" ? "active" : ""} onClick={() => setSampleType("cards")}>{sampleCopy[locale].cards}</button>
    </div>}
    <div className="result-count"><span>{filtered.length} {isSamples ? sampleCopy[locale].results : t.catalog.results}</span><span>NORA · 01</span></div>
    {isSamples
      ? <div className="sample-catalog-grid">{filtered.slice(0, visibleCount).map((product) => <SampleCatalogCard key={product.id} product={product} locale={locale} />)}</div>
      : <div className="product-grid">{filtered.slice(0, visibleCount).map((product) => <ProductCard key={product.id} product={product} locale={locale} />)}</div>}
    {visibleCount < filtered.length && <div className="center"><button className="button outline" onClick={() => setVisibleCount((count) => count + 36)}>{t.catalog.loadMore}</button></div>}
  </>;
}
