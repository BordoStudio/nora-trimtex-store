"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/data/catalog";
import { formatColourways, getDictionary, type Locale } from "@/lib/i18n";
import { ImageZoomButton, ImageZoomViewer, zoomLabels } from "@/components/ImageZoomViewer";
import { openContactChat } from "@/lib/contact-chat";

export function ProductCard({ product, locale }: { product: Product; locale: Locale }) {
  const t = getDictionary(locale);
  const [zoomed, setZoomed] = useState(false);

  return <article className="product-card">
    <Link className="product-card-link" href={`/${locale}/product/${product.slug}`} aria-label={`${product.sku} — ${product.name}`}>
      <div className="product-image-wrap">
        <Image src={product.image} alt={product.name} fill sizes="(max-width: 700px) 50vw, 25vw" quality={90} />
        {product.isNew && <span className="new-badge">{t.product.new}</span>}
      </div>
      <div className="product-meta">
      <div><small>{t.categories[product.categoryId]}</small><h3>{product.sku}</h3></div>
      <span>{formatColourways(locale, product.variantCount)}</span>
      </div>
      <span className="original-name">{product.name}</span>
    </Link>
    {product.availability === "on_request"
      ? <button type="button" className="product-stock availability-chat-button is-on_request" onClick={() => openContactChat(product.sku)}>{t.product.availabilityOnRequest}</button>
      : <Link className={`product-stock is-${product.availability}`} href={`/${locale}/product/${product.slug}`}>{product.availability === "in_stock" ? t.product.inStock : product.availability === "low_stock" ? t.product.lowStock : t.product.preorder}{product.availableQuantity !== undefined ? ` · ${product.availableQuantity}` : ""}</Link>}
    {!product.tradePriceHidden && <Link className="product-price" href={`/${locale}/product/${product.slug}`}>{product.priceUsd !== undefined ? `${t.product.priceFrom} $${product.priceUsd.toFixed(2)} / ${["tassels-large", "tassels-small", "holdbacks", "home", "samples"].includes(product.categoryId) ? t.product.each : t.product.meter}` : t.product.priceOnRequest}</Link>}
    <ImageZoomButton className="is-card" label={zoomLabels[locale].zoomIn} onClick={() => setZoomed(true)} />
    <ImageZoomViewer src={product.image} alt={`${product.sku} — ${product.name}`} open={zoomed} onClose={() => setZoomed(false)} labels={zoomLabels[locale]} />
  </article>;
}
