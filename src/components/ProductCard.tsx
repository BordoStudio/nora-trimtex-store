"use client";

import Image from "next/image";
import { CartAddIcon } from "@/components/CartAddIcon";
import { DesignerPriceLink } from "@/components/DesignerPriceLink";
import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { useDispatch } from "react-redux";
import type { Product } from "@/data/catalog";
import { formatColourways, getDictionary, type Locale } from "@/lib/i18n";
import { ImageZoomButton, ImageZoomViewer, zoomLabels } from "@/components/ImageZoomViewer";
import { openContactChat } from "@/lib/contact-chat";
import { addSample } from "@/store/cartSlice";
import { flyToCart } from "@/lib/flyToCart";
import { notifyCartAddition } from "@/lib/cart-notifications";

export function ProductCard({ product, locale, hasDesignerAccess = false }: { product: Product; locale: Locale; hasDesignerAccess?: boolean }) {
  const t = getDictionary(locale);
  const dispatch = useDispatch();
  const [zoomed, setZoomed] = useState(false);
  const [added, setAdded] = useState(false);

  const add = (event: MouseEvent<HTMLButtonElement>) => {
    const variant = product.variants[0];
    const image = variant?.image || product.image;
    flyToCart(event.currentTarget.closest(".product-card")?.querySelector(".product-image-wrap img") || null, image);
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
    <div className="product-card-commerce">
      {product.availability === "on_request"
        ? <button type="button" className="product-stock availability-chat-button is-on_request" onClick={() => openContactChat(product.sku)}>{t.product.availabilityOnRequest}</button>
        : <Link className={`product-stock is-${product.availability}`} href={`/${locale}/product/${product.slug}`}>{product.availability === "in_stock" ? t.product.inStock : product.availability === "low_stock" ? t.product.lowStock : t.product.preorder}{product.availableQuantity !== undefined ? ` · ${product.availableQuantity}` : ""}</Link>}
      {!product.tradePriceHidden && <Link className="product-price" href={`/${locale}/product/${product.slug}`}>{product.priceUsd !== undefined ? `$${product.priceUsd.toFixed(2)} / ${["tassels-large", "tassels-small", "holdbacks", "home", "samples"].includes(product.categoryId) ? t.product.each : t.product.meter}` : t.product.priceOnRequest}</Link>}
    </div>
    <div className="product-card-footer">
      <DesignerPriceLink locale={locale} slug={product.slug} hasAccess={hasDesignerAccess} />
      <button type="button" className={`card-add-button${added ? " is-added" : ""}`} onClick={add} aria-label={added ? t.product.added : t.product.add} aria-live="polite">
        <CartAddIcon added={added} />
      </button>
    </div>
    <ImageZoomButton className="is-card" label={zoomLabels[locale].zoomIn} onClick={() => setZoomed(true)} />
    <ImageZoomViewer src={product.image} alt={`${product.sku} — ${product.name}`} open={zoomed} onClose={() => setZoomed(false)} labels={zoomLabels[locale]} />
  </article>;
}
