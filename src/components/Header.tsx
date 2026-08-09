"use client";

import Image from "next/image";
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
import { AccountPanel } from "@/components/AccountPanel";
import { BrandLogo } from "@/components/BrandLogo";

export function Header({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const pathname = usePathname();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileCatalogOpen, setMobileCatalogOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const count = useSelector((state: RootState) => state.cart.items.reduce((sum, item) => sum + item.quantity, 0));
  const dispatch = useDispatch();
  const a11y = {
    ru: { home: "Главная Nora TrimTex", navigation: "Основная навигация", language: "Язык", account: "Войти", login: "Войти", menu: "Меню", close: "Закрыть", dialog: "Вход в аккаунт" },
    uk: { home: "Головна Nora TrimTex", navigation: "Основна навігація", language: "Мова", account: "Увійти", login: "Увійти", menu: "Меню", close: "Закрити", dialog: "Вхід в акаунт" },
    de: { home: "Nora TrimTex Startseite", navigation: "Hauptnavigation", language: "Sprache", account: "Anmelden", login: "Anmelden", menu: "Menü", close: "Schließen", dialog: "Anmeldung" },
    en: { home: "Nora TrimTex home", navigation: "Main navigation", language: "Language", account: "Log in", login: "Log in", menu: "Menu", close: "Close", dialog: "Log in" },
  }[locale];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCatalogOpen(false);
      setSearchOpen(false);
      setMobileOpen(false);
      setMobileCatalogOpen(false);
      setAccountOpen(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    const controller = new AbortController();
    const value = query.trim();
    const timer = window.setTimeout(async () => {
      if (value.length < 2) { setResults([]); return; }
      try {
        const response = await fetch(`/api/search?locale=${locale}&q=${encodeURIComponent(value)}`, { signal: controller.signal });
        const payload = await response.json() as { data: Product[] };
        setResults(payload.data);
      } catch { if (!controller.signal.aborted) setResults([]); }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [locale, query]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCatalogOpen(false);
        setSearchOpen(false);
        setMobileOpen(false);
        setMobileCatalogOpen(false);
        setAccountOpen(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  useEffect(() => {
    const modalOpen = catalogOpen || searchOpen || mobileOpen || accountOpen;
    if (!modalOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [accountOpen, catalogOpen, mobileOpen, searchOpen]);

  const toggleCatalog = () => {
    setCatalogOpen((open) => !open);
    setSearchOpen(false);
    setAccountOpen(false);
  };

  const localeLabels: Record<Locale, string> = { ru: "РУС", uk: "УКР", de: "DE", en: "EN" };
  const localePath = (item: Locale) => `/${item}${pathname.replace(/^\/(en|de|uk|ru)/, "")}`;
  const closeMobile = () => { setMobileOpen(false); setMobileCatalogOpen(false); };

  return <>
    <header className="site-header">
      <Link className="brand" href={`/${locale}`} aria-label={a11y.home}>
        <BrandLogo />
      </Link>
      <nav className="main-nav" aria-label={a11y.navigation}>
        <Link href={`/${locale}`}>{t.nav.home}</Link>
        <button type="button" className={catalogOpen ? "nav-trigger active" : "nav-trigger"} onClick={toggleCatalog} aria-expanded={catalogOpen}> {t.nav.catalog}<ChevronDown size={13} /></button>
        <Link href={`/${locale}/about`}>{t.nav.story}</Link>
        <Link href={`/${locale}/account/register`}><UserRound size={13} />{t.nav.trade}</Link>
      </nav>
      <div className="header-actions">
        <button type="button" className="search-trigger" aria-label={t.nav.search} onClick={() => { setSearchOpen(true); setCatalogOpen(false); setAccountOpen(false); }}><Search size={18} /><span>{t.nav.search}</span></button>
        <div className="locale-switcher" aria-label={a11y.language}>
          {locales.map((item) => <Link key={item} aria-current={item === locale ? "page" : undefined} title={item.toUpperCase()} className={item === locale ? "active" : ""} href={localePath(item)}>{localeLabels[item]}</Link>)}
        </div>
        <button type="button" className="account-button" onClick={() => { setAccountOpen(true); setCatalogOpen(false); setSearchOpen(false); }} aria-label={a11y.account}><UserRound size={18} /><span className="account-label">{a11y.login}</span></button>
        <button type="button" className="bag-button" data-cart-target onClick={() => dispatch(setCartOpen(true))} aria-label={t.nav.samples}><ShoppingBag size={19} /><span>{count}</span></button>
        <button type="button" className="menu-button" onClick={() => { setMobileOpen((open) => !open); setCatalogOpen(false); setSearchOpen(false); setAccountOpen(false); }} aria-expanded={mobileOpen} aria-label={a11y.menu}>{mobileOpen ? <X /> : <Menu />}</button>
      </div>
    </header>

    {catalogOpen && <div className="header-layer" onClick={() => setCatalogOpen(false)}>
      <section className="mega-menu" onClick={(event) => event.stopPropagation()}>
        <div className="mega-intro"><span>{t.nav.catalog}</span><h2>968</h2><p>{t.catalog.body}</p><Link onClick={() => setCatalogOpen(false)} href={`/${locale}/catalog`}>{t.home.viewAll}<ArrowRight size={16} /></Link></div>
        <div className="mega-links"><small>{locale === "ru" ? "КИСТИ И БАХРОМА" : locale === "uk" ? "КИТИЦІ ТА БАХРОМА" : locale === "de" ? "QUASTEN UND FRANSEN" : "TASSELS AND FRINGES"}</small>{categoryIds.slice(0, 5).map((id) => <Link onClick={() => setCatalogOpen(false)} key={id} href={`/${locale}/catalog?category=${id}`}>{t.categories[id]}</Link>)}</div>
        <div className="mega-links"><small>{locale === "ru" ? "ШНУРЫ, КРЮЧКИ И ДЕКОР" : locale === "uk" ? "ШНУРИ, ГАЧКИ Й ДЕКОР" : locale === "de" ? "KORDELN, HAKEN UND DEKOR" : "CORDS, HOOKS AND DECOR"}</small>{categoryIds.slice(5).map((id) => <Link onClick={() => setCatalogOpen(false)} key={id} href={`/${locale}/catalog?category=${id}`}>{t.categories[id]}</Link>)}</div>
        <Link className="mega-feature" onClick={() => setCatalogOpen(false)} href={`/${locale}/product/mb8164y-single-tassel-tieback`}><div><Image src="/products/1678.jpg?v=2" alt={t.categories["tassels-large"]} fill sizes="280px" /></div><span>{locale === "ru" ? "ВЫБОР NORA · 2026" : locale === "uk" ? "ВИБІР NORA · 2026" : locale === "de" ? "NORA AUSWAHL · 2026" : "NORA EDIT · 2026"}</span><strong>MB8164Y</strong></Link>
      </section>
    </div>}

    {searchOpen && <div className="search-layer" onClick={() => setSearchOpen(false)}>
      <section className="search-panel" role="dialog" aria-modal="true" aria-label={t.nav.search} onClick={(event) => event.stopPropagation()}>
        <div className="search-panel-head"><Search /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.catalog.search} /><button type="button" onClick={() => setSearchOpen(false)} aria-label={a11y.close}><X /></button></div>
        <div className="search-results">{query && results.length === 0 && <p>—</p>}{results.map((product) => <Link onClick={() => setSearchOpen(false)} key={product.id} href={`/${locale}/product/${product.slug}`}><div><Image src={product.image} alt={product.name} fill sizes="70px" /></div><span><small>{t.categories[product.categoryId]}</small><strong>{product.sku}</strong><p>{product.name}</p></span><ArrowRight /></Link>)}</div>
      </section>
    </div>}

    {accountOpen && <div className="search-layer" onClick={() => setAccountOpen(false)}><AccountPanel locale={locale} onClose={() => setAccountOpen(false)} /></div>}

    {mobileOpen && <div className="mobile-menu" aria-label={a11y.navigation}>
      <div className="mobile-menu-heading"><span>{t.nav.catalog}</span><small>{localeLabels[locale]}</small></div>
      <Link onClick={closeMobile} href={`/${locale}`}>{t.nav.home}<ArrowRight /></Link>
      <button type="button" className={mobileCatalogOpen ? "mobile-catalog-trigger active" : "mobile-catalog-trigger"} onClick={(event) => { event.stopPropagation(); setMobileCatalogOpen((open) => !open); }} aria-expanded={mobileCatalogOpen}>{t.nav.catalog}<ChevronDown /></button>
      {mobileCatalogOpen && <div className="mobile-category-list">
        <Link onClick={closeMobile} href={`/${locale}/catalog`}>{t.catalog.all}<ArrowRight size={15} /></Link>
        {categoryIds.map((id) => <Link onClick={closeMobile} key={id} href={`/${locale}/catalog?category=${id}`}>{t.categories[id]}<ArrowRight size={15} /></Link>)}
      </div>}
      <Link onClick={closeMobile} href={`/${locale}/about`}>{t.nav.story}<ArrowRight /></Link>
      <button type="button" className="mobile-login-link" onClick={() => { closeMobile(); setAccountOpen(true); }}><UserRound />{a11y.login}<ArrowRight /></button>
      <Link className="mobile-register-link" onClick={closeMobile} href={`/${locale}/account/register`}><UserRound />{t.nav.trade}<ArrowRight /></Link>
      <button type="button" onClick={() => { closeMobile(); setSearchOpen(true); }}><Search />{t.nav.search}<ArrowRight /></button>
      <div className="mobile-locales" aria-label={a11y.language}>{locales.map((item) => <Link onClick={closeMobile} key={item} aria-current={item === locale ? "page" : undefined} className={item === locale ? "active" : ""} href={localePath(item)}>{localeLabels[item]}</Link>)}</div>
    </div>}
  </>;
}
