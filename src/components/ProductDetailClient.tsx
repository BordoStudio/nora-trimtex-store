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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
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
  const detailGallery = [...dimensionGallery, ...technicalGallery].filter((item, index, all) =>
    all.findIndex((entry) => entry.image === item.image) === index,
  );
  const lightboxGallery = [...colourGallery, ...detailGallery];
  const visibleImage = colourGallery[activeImage] || colourGallery[0];
  const viewerImage = lightboxIndex === null ? undefined : lightboxGallery[lightboxIndex];
  const imageLabel = visibleImage ? `${l.colour} ${activeImage + 1}` : product.name;

  const chooseVariant = (id: string) => {
    setSelectedId(id);
    const variant = variants.find((item) => item.id === id);
    const imageIndex = colourGallery.findIndex((item) => item.image === variant?.image);
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

  const moveViewer = (direction: number) => setLightboxIndex((value) => {
    if (value === null) return null;
    return (value + direction + lightboxGallery.length) % lightboxGallery.length;
  });

  return <>
    <section className="product-detail">
      <div className="product-gallery">
        <button className="product-detail-image" onClick={() => setLightboxIndex(activeImage)} aria-label={l.enlarge}>
          <Image src={visibleImage.image} alt={`${product.name} — ${imageLabel}`} fill priority quality={95} sizes="(max-width: 900px) 100vw, 58vw" />
          <ImageZoomMark label={l.enlarge} />
        </button>
        {colourGallery.length > 1 && <div className="gallery-thumbs" aria-label={l.choose}>
          {colourGallery.map((item, index) => <button key={item.id} className={index === activeImage ? "active" : ""} onClick={() => { setActiveImage(index); chooseVariant(item.id); }} aria-label={`${l.colour} ${index + 1}`} title={`${l.colour} ${index + 1}`}>
            <Image src={item.image} alt="" fill sizes="90px" />
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
    {detailGallery.length > 0 && <section className="product-detail-media" aria-label={l.dimensionsPhoto}>
      {detailGallery.map((item, index) => {
        const label = item.kind === "sewing" ? l.sewingPhoto : l.dimensionsPhoto;
        const Icon = item.kind === "sewing" ? Scissors : Ruler;
        return <figure key={item.id}>
          <figcaption><Icon />{label}</figcaption>
          <button onClick={() => setLightboxIndex(colourGallery.length + index)} aria-label={`${l.enlarge}: ${label}`}>
            <Image src={item.image} alt={`${product.name} — ${label}`} width={1400} height={1400} sizes="(max-width: 900px) 100vw, 1200px" quality={95} />
            <ImageZoomMark label={l.enlarge} />
          </button>
        </figure>;
      })}
    </section>}
    <ImageZoomViewer
      src={viewerImage?.image || visibleImage.image}
      alt={`${product.name} — ${viewerImage?.kind === "sewing" ? l.sewingPhoto : viewerImage?.kind === "dimensions" ? l.dimensionsPhoto : imageLabel}`}
      open={lightboxIndex !== null}
      onClose={() => setLightboxIndex(null)}
      labels={zoomLabels[locale]}
      onPrevious={lightboxGallery.length > 1 ? () => moveViewer(-1) : undefined}
      onNext={lightboxGallery.length > 1 ? () => moveViewer(1) : undefined}
      previousSrc={lightboxIndex !== null && lightboxGallery.length > 1 ? lightboxGallery[(lightboxIndex - 1 + lightboxGallery.length) % lightboxGallery.length].image : undefined}
      nextSrc={lightboxIndex !== null && lightboxGallery.length > 1 ? lightboxGallery[(lightboxIndex + 1) % lightboxGallery.length].image : undefined}
      counter={lightboxIndex !== null && lightboxGallery.length > 1 ? `${lightboxIndex + 1} / ${lightboxGallery.length}` : undefined}
    />
  </>;
}
