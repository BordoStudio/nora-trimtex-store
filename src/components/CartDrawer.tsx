"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Minus, PackageOpen, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/store";
import { clearCart, decrementItem, incrementItem, removeSample, setCartOpen } from "@/store/cartSlice";
import { getDictionary, type Locale } from "@/lib/i18n";

export function CartDrawer({ locale, partnerPricingAccess = false }: { locale: Locale; partnerPricingAccess?: boolean }) {
  const { items, open } = useSelector((state: RootState) => state.cart);
  const dispatch = useDispatch();
  const t = getDictionary(locale);
  const copy = {
    ru: { cart: "Корзина", checkout: "Оформление заказа", review: "Ваш заказ", proceed: "Перейти к оформлению", back: "Назад в корзину", kicker: "ЗАКАЗ", continue: "Продолжить покупки", close: "Закрыть", decrease: "Уменьшить количество", increase: "Увеличить количество", remove: "Удалить товар" },
    uk: { cart: "Кошик", checkout: "Оформлення замовлення", review: "Ваше замовлення", proceed: "Перейти до оформлення", back: "Назад до кошика", kicker: "ЗАМОВЛЕННЯ", continue: "Продовжити покупки", close: "Закрити", decrease: "Зменшити кількість", increase: "Збільшити кількість", remove: "Видалити товар" },
    de: { cart: "Warenkorb", checkout: "Bestellung", review: "Ihre Bestellung", proceed: "Zur Bestellung", back: "Zurück zum Warenkorb", kicker: "BESTELLUNG", continue: "Weiter einkaufen", close: "Schließen", decrease: "Menge verringern", increase: "Menge erhöhen", remove: "Artikel entfernen" },
    en: { cart: "Cart", checkout: "Checkout", review: "Your order", proceed: "Continue to checkout", back: "Back to cart", kicker: "ORDER", continue: "Continue shopping", close: "Close", decrease: "Decrease quantity", increase: "Increase quantity", remove: "Remove item" },
  }[locale];
  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", country: "", city: "", address: "", postcode: "", notes: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [orderId, setOrderId] = useState("");
  const pricedSubtotal = partnerPricingAccess ? items.reduce((sum, item) => sum + (item.tradePriceHidden ? 0 : item.priceUsd ?? 0) * item.quantity, 0) : 0;
  const hasUnpricedItems = !partnerPricingAccess || items.some((item) => item.tradePriceHidden || item.priceUsd === undefined);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const formatItems = (count: number) => {
    if (locale === "ru") {
      const lastTwo = count % 100;
      const last = count % 10;
      return `${count} ${lastTwo >= 11 && lastTwo <= 14 ? "товаров" : last === 1 ? "товар" : last >= 2 && last <= 4 ? "товара" : "товаров"}`;
    }
    if (locale === "uk") {
      const lastTwo = count % 100;
      const last = count % 10;
      return `${count} ${lastTwo >= 11 && lastTwo <= 14 ? "товарів" : last === 1 ? "товар" : last >= 2 && last <= 4 ? "товари" : "товарів"}`;
    }
    if (locale === "en") return `${count} ${count === 1 ? "item" : "items"}`;
    return `${count} Artikel`;
  };
  const formatUsd = (value: number) => new Intl.NumberFormat(locale === "de" ? "de-DE" : locale === "uk" ? "uk-UA" : locale === "ru" ? "ru-RU" : "en-US", { style: "currency", currency: "USD" }).format(value);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") dispatch(setCartOpen(false)); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", closeOnEscape); };
  }, [dispatch, open]);

  if (!open) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("sending");
    try {
      const endpoint = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orders` : "/api/orders";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale, customer: form, pricedSubtotalUsd: pricedSubtotal, items: items.map(({ id, sku, name, slug, categoryId, variantId, variantLabel, priceUsd, quantity }) => ({ productId: id, sku, name, slug, categoryId, variantId, variantLabel, unitPriceUsd: priceUsd, quantity })) }),
      });
      if (!response.ok) throw new Error("Request failed");
      const payload = await response.json() as { data: { id: string } };
      setOrderId(payload.data.id);
      setStatus("success");
      dispatch(clearCart());
    } catch {
      setStatus("error");
    }
  };

  const close = () => {
    dispatch(setCartOpen(false));
    setStep("cart");
    if (status === "success") { setStatus("idle"); setOrderId(""); }
  };

  return <div className="drawer-layer" onClick={close}>
    <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label={copy.cart} onClick={(event) => event.stopPropagation()}>
      <div className="drawer-head">{step === "checkout" && status !== "success" ? <button className="drawer-back" onClick={() => setStep("cart")} aria-label={copy.back}><ArrowLeft /></button> : <div className="drawer-kicker">{copy.kicker}</div>}<div className="drawer-title"><small>{step === "cart" ? formatItems(itemCount) : copy.review}</small><h2>{step === "cart" ? copy.cart : copy.checkout}</h2></div><button className="drawer-close" onClick={close} aria-label={copy.close}><X /></button></div>
      {status === "success" ? <div className="order-success"><CheckCircle2 /><p>{t.samples.success}</p><strong>{orderId}</strong><span>{t.samples.successBody}</span><button className="button primary" onClick={close}>{t.samples.continue}</button></div> : <>
        {step === "cart" && (items.length === 0 ? <div className="empty-cart"><PackageOpen /><p>{t.samples.empty}</p><button className="button outline" onClick={close}>{copy.continue}</button></div> : <>
          <div className="drawer-items">{items.map((item) => <div className="drawer-item" key={item.lineId}>
            <Link className="drawer-item-image" href={`/${locale}/product/${item.slug}`} onClick={() => dispatch(setCartOpen(false))}><img src={item.image} alt={item.sku} width="96" height="112" loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/brand/product-placeholder.svg"; }} /></Link>
            <div className="drawer-item-copy"><small>ART. {item.sku}</small><strong>{item.name}</strong>{item.variantLabel && <span className="cart-variant">{item.variantLabel}</span>}<span className="cart-item-price">{!partnerPricingAccess || item.tradePriceHidden ? t.product.partnerPrice : item.priceUsd !== undefined ? `${formatUsd(item.priceUsd)} / ${["tassels-large", "tassels-small", "holdbacks", "home", "samples"].includes(item.categoryId) ? t.product.each : t.product.meter}` : t.product.priceOnRequest}</span><div className="quantity-control"><button type="button" onClick={() => dispatch(decrementItem(item.lineId))} aria-label={copy.decrease}><Minus /></button><b>{item.quantity}</b><button type="button" onClick={() => dispatch(incrementItem(item.lineId))} aria-label={copy.increase}><Plus /></button></div></div>
            <button className="drawer-remove" aria-label={copy.remove} onClick={() => dispatch(removeSample(item.lineId))}><Trash2 size={17} /></button>
          </div>)}</div>
          <div className="cart-summary"><div className="cart-total"><span>{t.samples.subtotal}</span><strong>{formatUsd(pricedSubtotal)}</strong>{hasUnpricedItems && <small>{t.samples.includesOnRequest}</small>}</div><button className="button primary wide" onClick={() => setStep("checkout")}>{copy.proceed}<ArrowRight /></button><button className="cart-continue" onClick={close}>{copy.continue}</button></div>
        </>)}
        {step === "checkout" && items.length > 0 && <form className="drawer-form" onSubmit={submit}>
          <div className="checkout-overview"><span>{formatItems(itemCount)}</span><strong>{formatUsd(pricedSubtotal)}</strong>{hasUnpricedItems && <small>{t.samples.includesOnRequest}</small>}</div>
          <div className="form-row"><input name="name" autoComplete="name" aria-label={t.samples.name} required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={t.samples.name} /><input name="email" autoComplete="email" aria-label={t.samples.email} required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder={t.samples.email} /></div>
          <div className="form-row"><input name="phone" autoComplete="tel" aria-label={t.samples.phone} required type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder={t.samples.phone} /><input name="company" autoComplete="organization" aria-label={t.samples.company} value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder={t.samples.company} /></div>
          <div className="form-row"><input name="country" autoComplete="country-name" aria-label={t.samples.country} required value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} placeholder={t.samples.country} /><input name="city" autoComplete="address-level2" aria-label={t.samples.city} required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder={t.samples.city} /></div>
          <div className="form-row address-row"><input name="address" autoComplete="street-address" aria-label={t.samples.address} required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder={t.samples.address} /><input name="postcode" autoComplete="postal-code" aria-label={t.samples.postcode} required value={form.postcode} onChange={(event) => setForm({ ...form, postcode: event.target.value })} placeholder={t.samples.postcode} /></div>
          <textarea name="notes" aria-label={t.samples.notes} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder={t.samples.notes} rows={3} />
          <p className="quote-note">{t.samples.quoteNote}</p>
          <button type="submit" className="button primary wide" disabled={status === "sending"}>{status === "sending" ? t.samples.sending : t.samples.send}</button>
          {status === "error" && <p className="form-status error">{t.samples.error}</p>}
        </form>}
      </>}
    </aside>
  </div>;
}
