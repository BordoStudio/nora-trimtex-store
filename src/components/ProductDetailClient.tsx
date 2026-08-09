"use client";

import Image from "next/image";
import { Box, Check, Layers3, Plus, Ruler, Scissors, ShieldCheck, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { useDispatch } from "react-redux";
import type { Product } from "@/data/catalog";
import { formatColourways, getDictionary, type Locale } from "@/lib/i18n";
import { addSample, setCartOpen } from "@/store/cartSlice";
import { flyToCart } from "@/lib/flyToCart";
import { notifyCartAddition } from "@/lib/cart-notifications";
import { ImageZoomMark, ImageZoomViewer, zoomLabels } from "@/components/ImageZoomViewer";

type DetailCopy = {
  quality: string;
  samples: string;
  description: string;
  collection: string;
  delivery: string;
  deliveryValue: string;
  dimensions: string;
  composition: string;
};

const labels = {
  ru: { choose: "Варианты товара", colour: "Цвет", dimensionsPhoto: "Схема размеров", sewingPhoto: "Схема пошива", enlarge: "Открыть фото", selected: "Выбран", close: "Закрыть", previous: "Предыдущее фото", next: "Следующее фото" },
  uk: { choose: "Варіанти товару", colour: "Колір", dimensionsPhoto: "Схема розмірів", sewingPhoto: "Схема пошиття", enlarge: "Відкрити фото", selected: "Обрано", close: "Закрити", previous: "Попереднє фото", next: "Наступне фото" },
  de: { choose: "Produktvarianten", colour: "Farbe", dimensionsPhoto: "Maßzeichnung", sewingPhoto: "Nähschema", enlarge: "Foto öffnen", selected: "Gewählt", close: "Schließen", previous: "Vorheriges Foto", next: "Nächstes Foto" },
  en: { choose: "Product options", colour: "Colour", dimensionsPhoto: "Dimensions diagram", sewingPhoto: "Sewing diagram", enlarge: "Open image", selected: "Selected", close: "Close", previous: "Previous image", next: "Next image" },
} satisfies Record<Locale, Record<string, string>>;

export function ProductDetailClient({ product, locale, categoryName, copy, initialVariantId }: { product: Product; locale: Locale; categoryName: string; copy: DetailCopy; initialVariantId?: string }) {
  const dispatch = useDispatch();
  const t = getDictionary(locale);
  const l = labels[locale];
  const variants = product.variants.length ? product.variants : [{ id: `${product.id}-default`, image: product.image }];
  const initialIndex = Math.max(0, variants.findIndex((variant) => variant.id === initialVariantId));
  const [selectedId, setSelectedId] = useState(variants[initialIndex].id);
  const [activeImage, setActiveImage] = useState(initialIndex);
  const [lightbox, setLightbox] = useState(false);
  const [added, setAdded] = useState(false);
  const selectedIndex = Math.max(0, variants.findIndex((variant) => variant.id === selectedId));
  const selected = variants[selectedIndex];
  const colourGallery = variants.filter((variant, index, all) => all.findIndex((entry) => entry.image === variant.image) === index).map((variant) => ({ ...variant, kind: "colour" as const }));
  const dimensionGallery = product.dimensionImage
    ? [{ id: `${product.id}-dimensions`, image: product.dimensionImage, kind: "dimensions" as const }]
    : [];
  const technicalGallery = (product.technicalImages || []).map((item, index) => ({
    id: `${product.id}-${item.kind}-${index}`,
    image: item.image,
    kind: item.kind,
  }));
  const gallery = [...colourGallery, ...dimensionGallery, ...technicalGallery];
  const visibleImage = gallery[activeImage] || gallery[0];
  const imageLabel = visibleImage.kind === "dimensions" ? l.dimensionsPhoto : visibleImage.kind === "sewing" ? l.sewingPhoto : `${l.colour} ${activeImage + 1}`;

  const chooseVariant = (id: string) => {
    setSelectedId(id);
    const variant = variants.find((item) => item.id === id);
    const imageIndex = gallery.findIndex((item) => item.kind === "colour" && item.image === variant?.image);
    if (imageIndex >= 0) setActiveImage(imageIndex);
    const url = new URL(window.location.href);
    url.searchParams.set("variant", id);
    window.history.replaceState(window.history.state, "", url);
  };

  const add = () => {
    flyToCart(document.querySelector(".product-detail-image img"), selected.image);
    dispatch(addSample({
      lineId: `${product.id}:${selected.id}`,
      id: product.id,
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      categoryId: product.categoryId,
      image: selected.image,
      variantId: selected.id,
      variantLabel: `${l.colour} ${selectedIndex + 1}`,
      priceUsd: product.priceUsd,
      tradePriceHidden: product.tradePriceHidden,
    }));
    void notifyCartAddition({ productId: product.id, sku: product.sku, slug: product.slug, variantId: selected.id, variantLabel: `${l.colour} ${selectedIndex + 1}` }, locale);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1_400);
  };

  const move = (direction: number) => setActiveImage((value) => (value + direction + gallery.length) % gallery.length);

  return <>
    <section className="product-detail">
      <div className="product-gallery">
        <button className="product-detail-image" onClick={() => setLightbox(true)} aria-label={l.enlarge}>
          <Image src={visibleImage.image} alt={`${product.name} — ${imageLabel}`} fill priority quality={95} sizes="(max-width: 900px) 100vw, 58vw" />
          <ImageZoomMark label={l.enlarge} />
        </button>
        {gallery.length > 1 && <div className="gallery-thumbs" aria-label={l.choose}>
          {gallery.map((item, index) => <button key={item.id} className={`${index === activeImage ? "active" : ""}${item.kind !== "colour" ? " is-dimensions" : ""}`} onClick={() => { setActiveImage(index); if (item.kind === "colour") chooseVariant(item.id); }} aria-label={item.kind === "dimensions" ? l.dimensionsPhoto : item.kind === "sewing" ? l.sewingPhoto : `${l.colour} ${index + 1}`} title={item.kind === "dimensions" ? l.dimensionsPhoto : item.kind === "sewing" ? l.sewingPhoto : `${l.colour} ${index + 1}`}>
            <Image src={item.image} alt="" fill sizes="90px" />
            {item.kind === "dimensions" && <span><Ruler /></span>}
            {item.kind === "sewing" && <span><Scissors /></span>}
          </button>)}
        </div>}
      </div>
      <div className="product-detail-copy">
        <p className="eyebrow">{categoryName}</p>
        <h1>{product.sku}</h1>
        <p className="product-detail-price">{product.tradePriceHidden ? t.product.partnerPrice : product.priceUsd !== undefined ? `${t.product.priceFrom} $${product.priceUsd.toFixed(2)} / ${["tassels-large", "tassels-small", "holdbacks", "home", "samples"].includes(product.categoryId) ? t.product.each : t.product.meter}` : t.product.priceOnRequest}</p>
        <p className={`product-availability is-${product.availability}`}><strong>{t.product.availability}:</strong> {product.availability === "in_stock" ? t.product.inStock : product.availability === "low_stock" ? t.product.lowStock : product.availability === "preorder" ? t.product.preorder : t.product.availabilityOnRequest}{product.availableQuantity !== undefined ? ` · ${product.availableQuantity}` : ""}</p>
        <div className="product-facts"><span><Layers3 />{formatColourways(locale, variants.length)}</span><span><ShieldCheck />{copy.quality}</span><span><Box />{copy.samples}</span></div>
        <p className="product-description">{copy.description}</p>
        <div className="product-actions">
          <button className="button primary" onClick={add}>{added ? <Check /> : <Plus />}{added ? t.product.added : t.product.add}</button>
          <button className="button outline" onClick={() => dispatch(setCartOpen(true))}><ShoppingBag />{t.nav.samples}</button>
        </div>
        <dl className="product-specifications"><div><dt>{copy.dimensions}</dt><dd>{product.dimensions}</dd></div><div><dt>{copy.composition}</dt><dd>{product.composition}</dd></div><div><dt>{copy.collection}</dt><dd>{categoryName}</dd></div><div><dt>{copy.delivery}</dt><dd>{copy.deliveryValue}</dd></div></dl>
      </div>
    </section>
    <ImageZoomViewer
      src={visibleImage.image}
      alt={`${product.name} — ${imageLabel}`}
      open={lightbox}
      onClose={() => setLightbox(false)}
      labels={zoomLabels[locale]}
      onPrevious={gallery.length > 1 ? () => move(-1) : undefined}
      onNext={gallery.length > 1 ? () => move(1) : undefined}
      previousSrc={gallery.length > 1 ? gallery[(activeImage - 1 + gallery.length) % gallery.length].image : undefined}
      nextSrc={gallery.length > 1 ? gallery[(activeImage + 1) % gallery.length].image : undefined}
      counter={gallery.length > 1 ? `${activeImage + 1} / ${gallery.length}` : undefined}
    />
  </>;
}
