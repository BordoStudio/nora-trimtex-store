"use client";

import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { usePathname } from "next/navigation";
import { makeStore } from "@/store";
import { hydrateCart } from "@/store/cartSlice";
import { getGuestId, guestHeaders } from "@/lib/guest";

export function Providers({ children }: { children: React.ReactNode }) {
  const [store] = useState(makeStore);
  const pathname = usePathname();
  useEffect(() => {
    const guestId = getGuestId();
    const page = `${location.pathname}${location.search}`;
    void fetch("/api/guest/session", {
      method: "POST",
      headers: guestHeaders(page),
      body: JSON.stringify({ guestId, page, locale: pathname.split("/")[1] || "en", referrer: document.referrer }),
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);
  useEffect(() => {
    const cartKey = "nora-trimtex-cart";
    const legacyCartKey = "nora-premium-tex-cart";
    let hydrated = false;
    try {
      const saved = window.localStorage.getItem(cartKey) || window.localStorage.getItem(legacyCartKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          store.dispatch(hydrateCart(parsed));
          hydrated = true;
          window.localStorage.setItem(cartKey, JSON.stringify(parsed));
        }
      }
      if (window.localStorage.getItem(cartKey)) window.localStorage.removeItem(legacyCartKey);
    } catch { /* Ignore a malformed or unavailable local store. */ }
    void fetch("/api/account/cart", { headers: guestHeaders() }).then(async (response) => {
      if (!response.ok) return;
      const remote = (await response.json())?.data?.items;
      if (Array.isArray(remote) && remote.length > 0 && !hydrated) store.dispatch(hydrateCart(remote));
    }).catch(() => undefined);
    let syncTimer: number | undefined;
    return store.subscribe(() => {
      const safeItems = store.getState().cart.items.map((item) => {
        const safeItem = { ...item, tradePriceHidden: true };
        delete safeItem.priceUsd;
        return safeItem;
      });
      window.localStorage.setItem(cartKey, JSON.stringify(safeItems));
      window.clearTimeout(syncTimer);
      syncTimer = window.setTimeout(() => { void fetch("/api/account/cart", { method: "PUT", headers: guestHeaders(), body: JSON.stringify({ items: safeItems, locale: location.pathname.split("/")[1] || "en" }) }); }, 500);
    });
  }, [store]);
  return <Provider store={store}>{children}</Provider>;
}
