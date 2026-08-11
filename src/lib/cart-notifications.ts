import type { Locale } from "@/lib/i18n";

type CartNotification = {
  productId: string;
  sku: string;
  slug: string;
  variantId?: string;
  variantLabel?: string;
};

function sessionId() {
  const key = "nora-trimtex-session";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(key, created);
  return created;
}

export async function notifyCartAddition(item: CartNotification, locale: Locale) {
  try {
    await fetch("/api/cart-events", {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...item, locale, sessionId: sessionId(), eventId: crypto.randomUUID(), page: window.location.pathname + window.location.search }),
    });
  } catch {
    // The basket must keep working even when a notification provider is unavailable.
  }
}
