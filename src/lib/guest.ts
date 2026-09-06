let memoryGuestId = "";
const guestKey = "nora-trimtex-guest-id";

export function getGuestId() {
  if (typeof window === "undefined") return "";
  let value = memoryGuestId;
  try { value = window.localStorage.getItem(guestKey) || value; } catch { /* Storage may be disabled. */ }
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(value)) {
    // randomUUID is absent in some embedded browsers and insecure contexts.
    if (typeof globalThis.crypto?.randomUUID === "function") value = globalThis.crypto.randomUUID();
    else if (typeof globalThis.crypto?.getRandomValues === "function") {
      value = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, "0")).join("");
    } else return "";
    try { window.localStorage.setItem(guestKey, value); } catch { /* Keep this session usable without storage. */ }
  }
  memoryGuestId = value;
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
