const guestKey = "nora-trimtex-guest-id";

export function getGuestId() {
  if (typeof window === "undefined") return "";
  let value = window.localStorage.getItem(guestKey) || "";
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(value)) {
    value = crypto.randomUUID();
    window.localStorage.setItem(guestKey, value);
  }
  return value;
}

export function guestHeaders(page = typeof location === "undefined" ? "" : `${location.pathname}${location.search}`) {
  return {
    "content-type": "application/json",
    "x-guest-id": getGuestId(),
    "x-guest-page": page,
    "x-guest-referrer": typeof document === "undefined" ? "" : document.referrer,
  };
}
