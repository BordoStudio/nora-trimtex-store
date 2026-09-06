export function flyToCart(source: Element | null, image: string) {
  const target = document.querySelector<HTMLElement>("[data-cart-target]");
  if (!source || !target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const size = Math.min(180, Math.max(88, from.width * 0.38));
  const sourceImage = source instanceof HTMLImageElement ? source : source.querySelector<HTMLImageElement>("img");
  const flyer = sourceImage?.cloneNode(false) as HTMLImageElement | undefined || document.createElement("img");
  flyer.src = sourceImage?.currentSrc || new URL(image || "/brand/product-placeholder.svg", window.location.origin).href;
  flyer.alt = "";
  flyer.removeAttribute("srcset");
  flyer.removeAttribute("sizes");
  Object.assign(flyer.style, {
    position: "fixed",
    left: `${from.left + from.width / 2 - size / 2}px`,
    top: `${from.top + from.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    objectFit: "cover",
    borderRadius: "20px",
    border: "2px solid rgba(175,135,71,.9)",
    background: "#fffaf2",
    boxShadow: "0 24px 60px rgba(73,48,32,.34),0 0 0 8px rgba(241,225,197,.68)",
    pointerEvents: "none",
    zIndex: "250",
    willChange: "transform,opacity",
  });
  document.body.appendChild(flyer);
  window.setTimeout(() => flyer.remove(), 1_400);
  flyer.onerror = () => { flyer.src = new URL("/brand/product-placeholder.svg", window.location.origin).href; };
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const animation = flyer.animate([
    { transform: "translate3d(0,0,0) rotate(0deg) scale(1)", opacity: 1, offset: 0 },
    { transform: `translate3d(${dx * .18}px,${dy * .07 - 44}px,0) rotate(-3deg) scale(1.04)`, opacity: 1, offset: .2 },
    { transform: `translate3d(${dx * .62}px,${dy * .44 - 72}px,0) rotate(4deg) scale(.68)`, opacity: 1, offset: .68 },
    { transform: `translate3d(${dx * .88}px,${dy * .82 - 18}px,0) rotate(1deg) scale(.34)`, opacity: .96, offset: .88 },
    { transform: `translate3d(${dx}px,${dy}px,0) rotate(0deg) scale(.08)`, opacity: .18, offset: 1 },
  ], { duration: 920, easing: "cubic-bezier(.18,.72,.18,1)", fill: "forwards" });
  animation.onfinish = () => {
    flyer.remove();
    target.animate([
      { transform: "scale(1)" },
      { transform: "scale(1.18)", offset: .38 },
      { transform: "scale(.96)", offset: .7 },
      { transform: "scale(1)" },
    ], { duration: 480, easing: "cubic-bezier(.2,.8,.2,1)" });
    const ring = document.createElement("span");
    Object.assign(ring.style, {
      position: "fixed",
      left: `${to.left + to.width / 2 - 12}px`,
      top: `${to.top + to.height / 2 - 12}px`,
      width: "24px",
      height: "24px",
      border: "2px solid #b88b45",
      borderRadius: "50%",
      pointerEvents: "none",
      zIndex: "251",
    });
    document.body.appendChild(ring);
    const ringAnimation = ring.animate([
      { transform: "scale(.35)", opacity: .9 },
      { transform: "scale(2.2)", opacity: 0 },
    ], { duration: 520, easing: "ease-out" });
    ringAnimation.onfinish = () => ring.remove();
    ringAnimation.oncancel = () => ring.remove();
  };
  animation.oncancel = () => flyer.remove();
}
