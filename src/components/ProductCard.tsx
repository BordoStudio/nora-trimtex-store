"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/data/catalog";
import { formatColourways, getDictionary, type Locale } from "@/lib/i18n";
import { ImageZoomButton, ImageZoomViewer, zoomLabels } from "@/components/ImageZoomViewer";

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
      <span className={`product-stock is-${product.availability}`}>{product.availability === "in_stock" ? t.product.inStock : product.availability === "low_stock" ? t.product.lowStock : product.availability === "preorder" ? t.product.preorder : t.product.availabilityOnRequest}{product.availableQuantity !== undefined ? ` · ${product.availableQuantity}` : ""}</span>
      <span className="product-price">{product.tradePriceHidden ? t.product.partnerPrice : product.priceUsd !== undefined ? `${t.product.priceFrom} $${product.priceUsd.toFixed(2)} / ${["tassels-large", "tassels-small", "holdbacks", "home", "samples"].includes(product.categoryId) ? t.product.each : t.product.meter}` : t.product.priceOnRequest}</span>
    </Link>
    <ImageZoomButton className="is-card" label={zoomLabels[locale].zoomIn} onClick={() => setZoomed(true)} />
    <ImageZoomViewer src={product.image} alt={`${product.sku} — ${product.name}`} open={zoomed} onClose={() => setZoomed(false)} labels={zoomLabels[locale]} />
  </article>;
}
