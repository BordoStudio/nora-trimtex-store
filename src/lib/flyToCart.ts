export function flyToCart(source: Element | null, image: string) {
  const target = document.querySelector<HTMLElement>("[data-cart-target]");
  if (!source || !target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const size = Math.min(150, Math.max(72, from.width * 0.24));
  const flyer = document.createElement("img");
  flyer.src = new URL(image || "/brand/product-placeholder.svg", window.location.origin).href;
  flyer.alt = "";
  Object.assign(flyer.style, {
    position: "fixed",
    left: `${from.left + from.width / 2 - size / 2}px`,
    top: `${from.top + from.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    objectFit: "cover",
    borderRadius: "8px",
    boxShadow: "0 18px 45px rgba(14,27,21,.28)",
    pointerEvents: "none",
    zIndex: "250",
    willChange: "transform,opacity",
  });
  document.body.appendChild(flyer);
  flyer.onerror = () => { flyer.src = new URL("/brand/product-placeholder.svg", window.location.origin).href; };
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const animation = flyer.animate([
    { transform: "translate3d(0,0,0) scale(1)", opacity: 1, offset: 0 },
    { transform: `translate3d(${dx * .42}px,${dy * .22 - 48}px,0) scale(.78)`, opacity: .96, offset: .45 },
    { transform: `translate3d(${dx}px,${dy}px,0) scale(.08)`, opacity: .25, offset: 1 },
  ], { duration: 760, easing: "cubic-bezier(.22,.78,.24,1)", fill: "forwards" });
  animation.onfinish = () => {
    flyer.remove();
    target.classList.remove("cart-bump");
    void target.offsetWidth;
    target.classList.add("cart-bump");
    window.setTimeout(() => target.classList.remove("cart-bump"), 520);
  };
  animation.oncancel = () => flyer.remove();
}
