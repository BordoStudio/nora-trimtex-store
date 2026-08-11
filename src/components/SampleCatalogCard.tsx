"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Check, Layers3, Plus } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { useDispatch } from "react-redux";
import type { Product } from "@/data/catalog";
import type { Locale } from "@/lib/i18n";
import { flyToCart } from "@/lib/flyToCart";
import { notifyCartAddition } from "@/lib/cart-notifications";
import { addSample } from "@/store/cartSlice";
import { ImageZoomButton, ImageZoomViewer, zoomLabels } from "@/components/ImageZoomViewer";

const copy = {
  ru: { book: "Книга образцов", cards: "Карты образцов и бокс", open: "Открыть каталог", add: "Добавить каталог", added: "Добавлено" },
  uk: { book: "Книга зразків", cards: "Карти зразків і бокс", open: "Відкрити каталог", add: "Додати каталог", added: "Додано" },
  de: { book: "Musterbuch", cards: "Musterkarten & Box", open: "Katalog öffnen", add: "Katalog hinzufügen", added: "Hinzugefügt" },
  en: { book: "Sample book", cards: "Sample cards & box", open: "Open catalogue", add: "Add catalogue", added: "Added" },
} satisfies Record<Locale, Record<string, string>>;

export function SampleCatalogCard({ product, locale }: { product: Product; locale: Locale }) {
  const dispatch = useDispatch();
  const [added, setAdded] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const isBook = product.sku.startsWith("Y-DL-");
  const label = isBook ? copy[locale].book : copy[locale].cards;
  const variant = product.variants[0];

  const add = (event: MouseEvent<HTMLButtonElement>) => {
    const image = variant?.image || product.image;
    flyToCart(event.currentTarget.closest(".sample-catalog-card")?.querySelector("img") || null, image);
    dispatch(addSample({
      lineId: `${product.id}:${variant?.id || "default"}`,
      id: product.id,
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      categoryId: product.categoryId,
      image,
      variantId: variant?.id,
      priceUsd: product.priceUsd,
      tradePriceHidden: product.tradePriceHidden,
    }));
    void notifyCartAddition({ productId: product.id, sku: product.sku, slug: product.slug, variantId: variant?.id }, locale);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1_400);
  };

  return <article className={`sample-catalog-card ${isBook ? "is-book" : "is-card-set"}`}>
    <div className="sample-catalog-visual-wrap">
      <Link className="sample-catalog-visual" href={`/${locale}/product/${product.slug}`} aria-label={`${product.sku} — ${product.name}`}>
        <Image src={product.image} alt={product.name} fill sizes="(max-width: 700px) 50vw, 25vw" quality={92} />
        <span className="sample-catalog-type">{isBook ? <BookOpen /> : <Layers3 />}{label}</span>
      </Link>
      <ImageZoomButton className="is-card" label={zoomLabels[locale].zoomIn} onClick={() => setZoomed(true)} />
    </div>
    <div className="sample-catalog-copy">
      <span className="sample-catalog-sku">{product.sku}</span>
      <h3><Link href={`/${locale}/product/${product.slug}`}>{product.name}</Link></h3>
      <div className="sample-catalog-actions">
        <Link href={`/${locale}/product/${product.slug}`}>{copy[locale].open}<ArrowUpRight /></Link>
        <button type="button" onClick={add}>{added ? <Check /> : <Plus />}<span>{added ? copy[locale].added : copy[locale].add}</span></button>
      </div>
    </div>
    <ImageZoomViewer src={product.image} alt={`${product.sku} — ${product.name}`} open={zoomed} onClose={() => setZoomed(false)} labels={zoomLabels[locale]} />
  </article>;
}
