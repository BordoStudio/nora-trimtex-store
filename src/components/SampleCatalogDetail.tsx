"use client";

import Image from "next/image";
import { BookOpen, Check, Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { useDispatch } from "react-redux";
import type { Product } from "@/data/catalog";
import { flyToCart } from "@/lib/flyToCart";
import { notifyCartAddition } from "@/lib/cart-notifications";
import { getDictionary, type Locale } from "@/lib/i18n";
import { addSample, setCartOpen } from "@/store/cartSlice";
import { ImageZoomButton, ImageZoomMark, ImageZoomViewer, zoomLabels } from "@/components/ImageZoomViewer";
import { openContactChat } from "@/lib/contact-chat";

const copy = {
  ru: {
    eyebrow: "КАТАЛОГ ОБРАЗЦОВ",
    intro: "Полная раскладка коллекции",
    body: "Листайте страницы каталога, чтобы увидеть сочетания изделий, доступные цвета и артикулы в одной раскладке.",
    pages: "страниц",
    add: "Добавить каталог",
    added: "Каталог добавлен",
    open: "Открыть страницу",
    close: "Закрыть",
    layout: "РАСКЛАДКА КАТАЛОГА",
  },
  uk: {
    eyebrow: "КАТАЛОГ ЗРАЗКІВ",
    intro: "Повна розкладка колекції",
    body: "Гортайте сторінки каталогу, щоб побачити поєднання виробів, доступні кольори й артикули в одній розкладці.",
    pages: "сторінок",
    add: "Додати каталог",
    added: "Каталог додано",
    open: "Відкрити сторінку",
    close: "Закрити",
    layout: "РОЗКЛАДКА КАТАЛОГУ",
  },
  de: {
    eyebrow: "MUSTERKATALOG",
    intro: "Vollständige Kollektionsübersicht",
    body: "Blättern Sie durch die Katalogseiten, um Artikelkombinationen, verfügbare Farben und Artikelnummern in einer Übersicht zu sehen.",
    pages: "Seiten",
    add: "Katalog hinzufügen",
    added: "Katalog hinzugefügt",
    open: "Seite öffnen",
    close: "Schließen",
    layout: "KATALOGÜBERSICHT",
  },
  en: {
    eyebrow: "SAMPLE CATALOGUE",
    intro: "Complete collection layout",
    body: "Browse the catalogue pages to see product combinations, available colours and article numbers together in one layout.",
    pages: "pages",
    add: "Add catalogue",
    added: "Catalogue added",
    open: "Open page",
    close: "Close",
    layout: "CATALOGUE LAYOUT",
  },
} satisfies Record<Locale, Record<string, string>>;

export function SampleCatalogDetail({ product, locale, pages }: { product: Product; locale: Locale; pages: string[] }) {
  const dispatch = useDispatch();
  const t = getDictionary(locale);
  const l = copy[locale];
  const variant = product.variants[0] || { id: `${product.id}-default`, image: product.image };
  const [added, setAdded] = useState(false);
  const [openedPage, setOpenedPage] = useState<string>();
  const viewerPages = [product.image, ...pages].filter((page, index, all) => all.indexOf(page) === index);
  const openedIndex = openedPage ? Math.max(0, viewerPages.indexOf(openedPage)) : 0;
  const moveOpenedPage = (direction: number) => setOpenedPage(viewerPages[(openedIndex + direction + viewerPages.length) % viewerPages.length]);

  const add = () => {
    flyToCart(document.querySelector(".sample-catalog-cover img"), product.image);
    dispatch(addSample({
      lineId: `${product.id}:${variant.id}`,
      id: product.id,
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      categoryId: product.categoryId,
      image: product.image,
      variantId: variant.id,
      priceUsd: product.priceUsd,
      tradePriceHidden: product.tradePriceHidden,
    }));
    void notifyCartAddition({ productId: product.id, sku: product.sku, slug: product.slug, variantId: variant.id }, locale);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1_400);
  };

  return <>
    <section className="sample-catalog-hero">
      <div className="sample-catalog-cover">
        <Image src={product.image} alt={product.name} fill priority quality={95} sizes="(max-width: 760px) 92vw, 38vw" />
        <ImageZoomButton label={zoomLabels[locale].zoomIn} onClick={() => setOpenedPage(product.image)} />
      </div>
      <div className="sample-catalog-hero-copy">
        <p className="eyebrow">{l.eyebrow}</p>
        <h1>{product.sku}</h1>
        <h2>{l.intro}</h2>
        <p>{l.body}</p>
        <div className="sample-catalog-summary"><BookOpen /><span>{pages.length} {l.pages}</span></div>
        {product.availability === "on_request" ? <button type="button" className="product-availability availability-chat-button is-on_request" onClick={() => openContactChat(product.sku)}><strong>{t.product.availability}:</strong> {t.product.availabilityOnRequest}</button> : <p className={`product-availability is-${product.availability}`}><strong>{t.product.availability}:</strong> {product.availability === "in_stock" ? t.product.inStock : product.availability === "low_stock" ? t.product.lowStock : t.product.preorder}</p>}
        <div className="product-actions">
          <button className="button primary" onClick={add}>{added ? <Check /> : <Plus />}{added ? l.added : l.add}</button>
          <button className="button outline" onClick={() => dispatch(setCartOpen(true))}><ShoppingBag />{t.nav.samples}</button>
        </div>
      </div>
    </section>

    <section className="sample-layout-section">
      <div className="sample-layout-heading">
        <p className="eyebrow">{l.layout}</p>
        <span>{product.sku} · {pages.length} {l.pages}</span>
      </div>
      <div className="sample-layout-pages">
        {pages.map((page, index) => <button key={page} className="sample-layout-page" type="button" onClick={() => setOpenedPage(page)} aria-label={`${l.open} ${index + 1}`}>
          {/* Source pages use many different aspect ratios; native dimensions preserve the exact catalogue layout. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page} alt={`${product.sku} — ${l.layout.toLocaleLowerCase(locale)} ${index + 1}`} loading={index < 2 ? "eager" : "lazy"} />
          <ImageZoomMark label={String(index + 1).padStart(2, "0")} />
        </button>)}
      </div>
    </section>

    <ImageZoomViewer
      src={openedPage || product.image}
      alt={product.sku}
      open={Boolean(openedPage)}
      onClose={() => setOpenedPage(undefined)}
      labels={zoomLabels[locale]}
      onPrevious={viewerPages.length > 1 ? () => moveOpenedPage(-1) : undefined}
      onNext={viewerPages.length > 1 ? () => moveOpenedPage(1) : undefined}
      previousSrc={viewerPages.length > 1 ? viewerPages[(openedIndex - 1 + viewerPages.length) % viewerPages.length] : undefined}
      nextSrc={viewerPages.length > 1 ? viewerPages[(openedIndex + 1) % viewerPages.length] : undefined}
      counter={viewerPages.length > 1 ? `${openedIndex + 1} / ${viewerPages.length}` : undefined}
    />
  </>;
}
