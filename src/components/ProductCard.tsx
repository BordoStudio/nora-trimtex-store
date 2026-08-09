"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { useDispatch } from "react-redux";
import type { Product } from "@/data/catalog";
import { addSample } from "@/store/cartSlice";
import { formatColourways, getDictionary, type Locale } from "@/lib/i18n";
import { flyToCart } from "@/lib/flyToCart";
import { notifyCartAddition } from "@/lib/cart-notifications";
import { ImageZoomButton, ImageZoomViewer, zoomLabels } from "@/components/ImageZoomViewer";

export function ProductCard({ product, locale }: { product: Product; locale: Locale }) {
  const t = getDictionary(locale);
  const dispatch = useDispatch();
  const [added, setAdded] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const add = (event: MouseEvent<HTMLButtonElement>) => {
    const variant = product.variants[0];
    flyToCart(event.currentTarget.closest(".product-card")?.querySelector(".product-image-wrap img") || null, variant?.image || product.image);
    dispatch(addSample({ lineId: `${product.id}:${variant?.id || "default"}`, id: product.id, sku: product.sku, name: product.name, slug: product.slug, categoryId: product.categoryId, image: variant?.image || product.image, variantId: variant?.id, priceUsd: product.priceUsd, tradePriceHidden: product.tradePriceHidden }));
    void notifyCartAddition({ productId: product.id, sku: product.sku, slug: product.slug, variantId: variant?.id }, locale);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };

  return <article className="product-card">
    <div className="product-image-wrap">
      <Link className="product-image-link" href={`/${locale}/product/${product.slug}`} aria-label={`${product.sku} — ${product.name}`}>
        <Image src={product.image} alt={product.name} fill sizes="(max-width: 700px) 50vw, 25vw" quality={90} />
      </Link>
      <ImageZoomButton className="is-card" label={zoomLabels[locale].zoomIn} onClick={() => setZoomed(true)} />
      {product.isNew && <span className="new-badge">{t.product.new}</span>}
      <button className="sample-button" onClick={add} aria-label={t.product.add}>{added ? <Check size={18} /> : <Plus size={18} />}</button>
    </div>
    <Link className="product-meta" href={`/${locale}/product/${product.slug}`}>
      <div><small>{t.categories[product.categoryId]}</small><h3>{product.sku}</h3></div>
      <span>{formatColourways(locale, product.variantCount)}</span>
    </Link>
    <Link className="original-name" href={`/${locale}/product/${product.slug}`}>{product.name}</Link>
    <p className={`product-stock is-${product.availability}`}>{product.availability === "in_stock" ? t.product.inStock : product.availability === "low_stock" ? t.product.lowStock : product.availability === "preorder" ? t.product.preorder : t.product.availabilityOnRequest}{product.availableQuantity !== undefined ? ` · ${product.availableQuantity}` : ""}</p>
    <p className="product-price">{product.tradePriceHidden ? t.product.partnerPrice : product.priceUsd !== undefined ? `${t.product.priceFrom} $${product.priceUsd.toFixed(2)} / ${["tassels-large", "tassels-small", "holdbacks", "home", "samples"].includes(product.categoryId) ? t.product.each : t.product.meter}` : t.product.priceOnRequest}</p>
    <ImageZoomViewer src={product.image} alt={`${product.sku} — ${product.name}`} open={zoomed} onClose={() => setZoomed(false)} labels={zoomLabels[locale]} />
  </article>;
}
