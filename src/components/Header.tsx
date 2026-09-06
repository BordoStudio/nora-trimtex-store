"use client";

import Image from "next/image";
import { usePanelFocus } from "@/lib/usePanelFocus";
import Link from "next/link";
import { ArrowRight, ChevronDown, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { Product } from "@/data/catalog";
import { categoryIds } from "@/data/categories";
import type { RootState } from "@/store";
import { setCartOpen } from "@/store/cartSlice";
import { locales, type Locale, getDictionary } from "@/lib/i18n";
import { designerCopy } from "@/lib/designer-copy";
import { AccountPanel } from "@/components/AccountPanel";
import { BrandLogo } from "@/components/BrandLogo";

type HeaderPanel = "catalog" | "search" | "mobile" | "account" | null;

export function Header({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const pathname = usePathname();
  const [activePanel, setActivePanel] = useState<HeaderPanel>(null);
  const [mobileCatalogOpen, setMobileCatalogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchState, setSearchState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [results, setResults] = useState<Product[]>([]);
  const count = useSelector((state: RootState) => state.cart.items.reduce((sum, item) => sum + item.quantity, 0));
  const dispatch = useDispatch();
  const catalogOpen = activePanel === "catalog";
  const searchOpen = activePanel === "search";
  const mobileOpen = activePanel === "mobile";
  const accountOpen = activePanel === "account";
  usePanelFocus(activePanel === "search" ? ".search-panel" : activePanel === "account" ? ".account-panel" : activePanel === "mobile" ? ".mobile-menu" : ".mega-menu", Boolean(activePanel));
  const a11y = {
    ru: { home: "Главная Nora TrimTex", navigation: "Основная навигация", language: "Язык", account: "Войти", login: "Войти", menu: "Меню", close: "Закрыть", dialog: "Вход в аккаунт" },
    uk: { home: "Головна Nora TrimTex", navigation: "Основна навігація", language: "Мова", account: "Увійти", login: "Увійти", menu: "Меню", close: "Закрити", dialog: "Вхід в акаунт" },
    de: { home: "Nora TrimTex Startseite", navigation: "Hauptnavigation", language: "Sprache", account: "Anmelden", login: "Anmelden", menu: "Menü", close: "Schließen", dialog: "Anmeldung" },
    en: { home: "Nora TrimTex home", navigation: "Main navigation", language: "Language", account: "Log in", login: "Log in", menu: "Menu", close: "Close", dialog: "Log in" },
  }[locale];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setActivePanel(null);
      setMobileCatalogOpen(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    const controller = new AbortController();
    const value = query.trim();
    const timer = window.setTimeout(async () => {
      if (value.length < 2) { setResults([]); setSearchState("idle"); return; }
      setSearchState("loading");
      try {
        const response = await fetch(`/api/search?locale=${locale}&q=${encodeURIComponent(value)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Search failed");
        const payload = await response.json() as { data: Product[] };
        setResults(payload.data); setSearchState("ready");
      } catch { if (!controller.signal.aborted) { setResults([]); setSearchState("error"); } }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [locale, query]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActivePanel(null);
        setMobileCatalogOpen(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  useEffect(() => {
    if (!activePanel) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [activePanel]);

  const toggleCatalog = () => {
    setActivePanel((panel) => panel === "catalog" ? null : "catalog");
  };

  const localeLabels: Record<Locale, string> = { ru: "РУС", uk: "УКР", de: "DE", en: "EN" };
  const localePath = (item: Locale) => `/${item}${pathname.replace(/^\/(en|de|uk|ru)/, "")}`;
  const closePanel = () => setActivePanel(null);
  const closeMobile = () => { closePanel(); setMobileCatalogOpen(false); };

  return <>
    <header className="site-header">
      <Link className="brand" href={`/${locale}`} aria-label={a11y.home}>
        <BrandLogo />
      </Link>
      <nav className="main-nav" aria-label={a11y.navigation}>
        <Link href={`/${locale}`} aria-current={pathname === `/${locale}` ? "page" : undefined}>{t.nav.home}</Link>
        <button type="button" className={catalogOpen ? "nav-trigger active" : "nav-trigger"} onClick={toggleCatalog} aria-expanded={catalogOpen}> {t.nav.catalog}<ChevronDown size={13} /></button>
        <Link href={`/${locale}/about`} aria-current={pathname === `/${locale}/about` ? "page" : undefined}>{t.nav.story}</Link>
        <Link href={`/${locale}/designers`}>{designerCopy[locale].label}</Link>
      </nav>
      <div className="header-actions">
        <button type="button" className="search-trigger" aria-label={t.nav.search} aria-expanded={searchOpen} onClick={() => setActivePanel("search")}><Search size={18} /><span>{t.nav.search}</span></button>
        <div className="locale-switcher" aria-label={a11y.language}>
          {locales.map((item) => <Link key={item} aria-current={item === locale ? "page" : undefined} title={item.toUpperCase()} className={item === locale ? "active" : ""} href={localePath(item)}>{localeLabels[item]}</Link>)}
        </div>
        <button type="button" className="account-button" onClick={() => setActivePanel("account")} aria-label={a11y.account} aria-haspopup="dialog" aria-expanded={accountOpen}><UserRound size={18} /><span className="account-label">{a11y.login}</span></button>
        <button type="button" className="bag-button" data-cart-target onClick={() => { setActivePanel(null); dispatch(setCartOpen(true)); }} aria-label={t.nav.samples}><ShoppingBag size={19} /><span>{count}</span></button>
        <button type="button" className="menu-button" onClick={() => { setActivePanel((panel) => panel === "mobile" ? null : "mobile"); setMobileCatalogOpen(false); }} aria-expanded={mobileOpen} aria-controls="mobile-navigation" aria-label={a11y.menu}>{mobileOpen ? <X /> : <Menu />}</button>
      </div>
    </header>

    {catalogOpen && <div className="header-layer" onClick={closePanel}>
      <section role="dialog" aria-modal="true" aria-label={t.nav.catalog} className="mega-menu" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="mega-close" onClick={closePanel} aria-label={a11y.close}><X size={18} /></button><div className="mega-intro"><h2>{t.nav.catalog}</h2><p>{t.catalog.body}</p><Link onClick={closePanel} href={`/${locale}/catalog`}>{t.home.viewAll}<ArrowRight size={16} /></Link></div>
        <div className="mega-links"><small>{locale === "ru" ? "КИСТИ И БАХРОМА" : locale === "uk" ? "КИТИЦІ ТА БАХРОМА" : locale === "de" ? "QUASTEN UND FRANSEN" : "TASSELS AND FRINGES"}</small>{categoryIds.slice(0, 5).map((id) => <Link onClick={closePanel} key={id} href={`/${locale}/catalog?category=${id}`}>{t.categories[id]}</Link>)}</div>
        <div className="mega-links"><small>{locale === "ru" ? "ШНУРЫ, КРЮЧКИ И ДЕКОР" : locale === "uk" ? "ШНУРИ, ГАЧКИ Й ДЕКОР" : locale === "de" ? "KORDELN, HAKEN UND DEKOR" : "CORDS, HOOKS AND DECOR"}</small>{categoryIds.slice(5).map((id) => <Link onClick={closePanel} key={id} href={`/${locale}/catalog?category=${id}`}>{t.categories[id]}</Link>)}</div>
      </section>
    </div>}

    {searchOpen && <div className="search-layer" onClick={closePanel}>
      <section className="search-panel" role="dialog" aria-modal="true" aria-label={t.nav.search} onClick={(event) => event.stopPropagation()}>
        <div className="search-panel-head"><Search /><input autoFocus aria-label={t.catalog.search} value={query} onChange={(event) => { setQuery(event.target.value); setResults([]); setSearchState(event.target.value.trim().length < 2 ? "idle" : "loading"); }} placeholder={t.catalog.search} /><button type="button" onClick={closePanel} aria-label={a11y.close}><X /></button></div>
        <div className="search-results">{(query.trim().length < 2 || searchState !== "ready" || results.length === 0) && <p className="search-status" role="status">{{ru: {idle: "Введите артикул или название — от 2 символов", loading: "Ищем в коллекции…", ready: "Ничего не найдено. Попробуйте другой артикул или название.", error: "Поиск временно недоступен. Попробуйте ещё раз."}, uk: {idle: "Введіть артикул або назву — від 2 символів", loading: "Шукаємо в колекції…", ready: "Нічого не знайдено. Спробуйте інший запит.", error: "Пошук тимчасово недоступний."}, de: {idle: "Artikelnummer oder Name — mindestens 2 Zeichen", loading: "Kollektion wird durchsucht…", ready: "Keine Treffer. Versuchen Sie einen anderen Suchbegriff.", error: "Die Suche ist vorübergehend nicht verfügbar."}, en: {idle: "Enter an item code or name — at least 2 characters", loading: "Searching the collection…", ready: "No results. Try another item code or name.", error: "Search is temporarily unavailable. Please try again."}}[locale][query.trim().length < 2 ? "idle" : searchState]}</p>}{results.map((product) => <Link onClick={closePanel} key={product.id} href={`/${locale}/product/${product.slug}`}><div><Image src={product.image} alt={product.name} fill sizes="70px" /></div><span><small>{t.categories[product.categoryId]}</small><strong>{product.sku}</strong><p>{product.name}</p></span><ArrowRight /></Link>)}</div>
      </section>
    </div>}

    {accountOpen && <div className="search-layer" onClick={closePanel}><AccountPanel locale={locale} onClose={closePanel} /></div>}

    {mobileOpen && <nav id="mobile-navigation" className="mobile-menu" aria-label={a11y.navigation}>
      <Link onClick={closeMobile} href={`/${locale}`}>{t.nav.home}<ArrowRight /></Link>
      <button type="button" className={mobileCatalogOpen ? "mobile-catalog-trigger active" : "mobile-catalog-trigger"} onClick={(event) => { event.stopPropagation(); setMobileCatalogOpen((open) => !open); }} aria-expanded={mobileCatalogOpen}>{t.nav.catalog}<ChevronDown /></button>
      {mobileCatalogOpen && <div className="mobile-category-list">
        <Link onClick={closeMobile} href={`/${locale}/catalog`}>{t.catalog.all}<ArrowRight size={15} /></Link>
        {categoryIds.map((id) => <Link onClick={closeMobile} key={id} href={`/${locale}/catalog?category=${id}`}>{t.categories[id]}<ArrowRight size={15} /></Link>)}
      </div>}
      <Link onClick={closeMobile} href={`/${locale}/about`}>{t.nav.story}<ArrowRight /></Link>
      <Link onClick={closeMobile} href={`/${locale}/designers`}>{designerCopy[locale].label}<ArrowRight /></Link>
      <Link className="mobile-register-link" onClick={closeMobile} href={`/${locale}/account/register`}>{t.nav.trade}<ArrowRight /></Link>
      <button type="button" onClick={() => { setMobileCatalogOpen(false); setActivePanel("search"); }}><Search />{t.nav.search}<ArrowRight /></button>
      <div className="mobile-locales" aria-label={a11y.language}>{locales.map((item) => <Link onClick={closeMobile} key={item} aria-current={item === locale ? "page" : undefined} className={item === locale ? "active" : ""} href={localePath(item)}>{localeLabels[item]}</Link>)}</div>
    </nav>}
  </>;
}
