"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

export function CatalogClient({ locale, initialProducts, hasDesignerAccess = false }: { locale: Locale; initialProducts: Product[]; hasDesignerAccess?: boolean }) {
  const t = getDictionary(locale);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const router = useRouter();
  const urlParams = useSearchParams();
  const requestedCategory = urlParams.get("category");
  const urlCategory: CategoryId | "all" = categoryIds.includes(requestedCategory as CategoryId) ? requestedCategory as CategoryId : "all";
  const urlSort: "catalog" | "sku" = urlParams.get("sort") === "sku" ? "sku" : "catalog";
  const updateLocation = (key: string, value: string) => {
    const url = new URL(window.location.href);
    if (value === "all" || (key === "sort" && value === "catalog")) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
    router.push(`${url.pathname}${url.search}`, { scroll: false });
    setVisibleCount(36);
  };
  const [sampleType, setSampleType] = useState<"all" | "books" | "cards">("all");
  const category = urlCategory;
  const sort = urlSort;
  const [visibleCount, setVisibleCount] = useState(36);
  useEffect(() => {
    const value = query.trim();
    const controller = new AbortController();
    if (value.length < 2) {
      return () => controller.abort();
    }
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?locale=${locale}&limit=36&q=${encodeURIComponent(value)}`, { signal: controller.signal });
        if (!response.ok) return;
        const payload = await response.json() as { data: Product[] };
        setSearchResults(payload.data);
      } catch {
        if (!controller.signal.aborted) setSearchResults([]);
      }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [locale, query]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const source = normalized.length >= 2 ? searchResults : initialProducts;
    const products = source
      .filter((product) => category === "all" || product.categoryId === category)
      .filter((product) => !normalized || `${product.sku} ${product.name}`.toLowerCase().includes(normalized))
      .filter((product) => category !== "samples" || sampleType === "all" || (sampleType === "books" ? product.sku.startsWith("Y-DL-") : product.sku.startsWith("YK-DL-")));
    return sort === "sku" ? [...products].sort((a, b) => a.sku.localeCompare(b.sku)) : products;
  }, [category, initialProducts, query, sampleType, searchResults, sort]);

  const isSamples = category === "samples";

  return <>
    <div className="catalog-toolbar">
      <label className="search-field"><Search size={18} /><input value={query} aria-label={t.catalog.search} onChange={(e) => { setQuery(e.target.value); setVisibleCount(36); }} placeholder={isSamples ? sampleCopy[locale].search : t.catalog.search} /></label>
      <label className="sort-field"><SlidersHorizontal size={17} /><span>{t.catalog.sort}</span><select value={sort} onChange={(e) => updateLocation("sort", e.target.value)}><option value="catalog">{t.catalog.catalogOrder}</option><option value="sku">{t.catalog.sku}</option></select></label>
    </div>
    <label className="mobile-category-select"><span>{{ru:"Категория",uk:"Категорія",de:"Kategorie",en:"Category"}[locale]}</span><select value={category} onChange={(event) => updateLocation("category", event.target.value)}><option value="all">{t.catalog.all}</option>{categoryIds.map(id => <option key={id} value={id}>{t.categories[id]}</option>)}</select></label>
    <div className="category-filter"><button aria-pressed={category === "all"} className={category === "all" ? "active" : ""} onClick={() => updateLocation("category", "all")}>{t.catalog.all}</button>{categoryIds.map((id) => <button key={id} aria-pressed={category === id} className={category === id ? "active" : ""} onClick={() => updateLocation("category", id)}>{t.categories[id]}</button>)}</div>
    {isSamples && <div className="sample-catalog-tabs" aria-label={t.categories.samples}>
      <button className={sampleType === "all" ? "active" : ""} onClick={() => setSampleType("all")}>{sampleCopy[locale].all}</button>
      <button className={sampleType === "books" ? "active" : ""} onClick={() => setSampleType("books")}>{sampleCopy[locale].books}</button>
      <button className={sampleType === "cards" ? "active" : ""} onClick={() => setSampleType("cards")}>{sampleCopy[locale].cards}</button>
    </div>}
    <div className="result-count" role="status" aria-live="polite"><span>{filtered.length} {isSamples ? sampleCopy[locale].results : t.catalog.results}</span><span>{category === "all" ? t.catalog.all : t.categories[category]}</span></div>
    {filtered.length === 0 && <div className="catalog-empty"><h2>{{ru:"Ничего не найдено",uk:"Нічого не знайдено",de:"Keine Ergebnisse",en:"No results found"}[locale]}</h2><p>{{ru:"Попробуйте другой артикул или сбросьте фильтры.",uk:"Спробуйте інший артикул або скиньте фільтри.",de:"Versuchen Sie eine andere Artikelnummer oder setzen Sie die Filter zurück.",en:"Try another item code or reset your filters."}[locale]}</p><button className="button outline" onClick={() => { setQuery(""); setSampleType("all"); updateLocation("category", "all"); }}>{{ru:"Сбросить фильтры",uk:"Скинути фільтри",de:"Filter zurücksetzen",en:"Reset filters"}[locale]}</button></div>}
    {isSamples
      ? <div className="sample-catalog-grid">{filtered.slice(0, visibleCount).map((product) => <SampleCatalogCard key={product.id} product={product} locale={locale} hasDesignerAccess={hasDesignerAccess} />)}</div>
      : <div className="product-grid">{filtered.slice(0, visibleCount).map((product) => <ProductCard key={product.id} product={product} locale={locale} hasDesignerAccess={hasDesignerAccess} />)}</div>}
    {visibleCount < filtered.length && <div className="center"><button className="button outline" onClick={() => setVisibleCount((count) => count + 36)}>{t.catalog.loadMore}</button></div>}
  </>;
}
