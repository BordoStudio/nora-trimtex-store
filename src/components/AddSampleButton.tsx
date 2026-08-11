"use client";

import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { useDispatch } from "react-redux";
import type { Product } from "@/data/catalog";
import { addSample, setCartOpen } from "@/store/cartSlice";
import { getDictionary, type Locale } from "@/lib/i18n";
import { notifyCartAddition } from "@/lib/cart-notifications";

export function AddSampleButton({ product, locale }: { product: Product; locale: Locale }) {
  const [added, setAdded] = useState(false);
  const dispatch = useDispatch();
  const t = getDictionary(locale);

  const add = () => {
    const variant = product.variants[0];
    dispatch(addSample({ lineId: `${product.id}:${variant?.id || "default"}`, id: product.id, sku: product.sku, name: product.name, slug: product.slug, categoryId: product.categoryId, image: variant?.image || product.image, variantId: variant?.id, priceUsd: product.priceUsd, tradePriceHidden: product.tradePriceHidden }));
    void notifyCartAddition({ productId: product.id, sku: product.sku, slug: product.slug, variantId: variant?.id }, locale);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1_400);
  };

  return <div className="product-actions">
    <button className="button primary" onClick={add}>{added ? <Check /> : <Plus />}{added ? t.product.added : t.product.add}</button>
    <button className="button outline" onClick={() => dispatch(setCartOpen(true))}>{t.nav.samples}</button>
  </div>;
}
