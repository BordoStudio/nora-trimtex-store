"use client";

import { useEffect } from "react";

const storageKey = () => `nora-scroll:${location.pathname}${location.search}`;

export function ScrollRestoration() {
  useEffect(() => {
    if (!("scrollRestoration" in history)) return;
    history.scrollRestoration = "manual";
    let frame = 0;
    let restoring = false;

    const save = () => {
      if (restoring) return;
      sessionStorage.setItem(storageKey(), String(Math.max(0, Math.round(window.scrollY))));
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; save(); });
    };
    const restore = () => {
      const value = Number(sessionStorage.getItem(storageKey()));
      if (!Number.isFinite(value) || value <= 0) return;
      restoring = true;
      const html = document.documentElement;
      const previousBehavior = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      [0, 60, 180, 420].forEach((delay, index, all) => window.setTimeout(() => {
        window.scrollTo(0, value);
        if (index === all.length - 1) {
          html.style.scrollBehavior = previousBehavior;
          restoring = false;
        }
      }, delay));
    };
    const onPopState = () => window.setTimeout(restore, 0);
    const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) restore(); };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("popstate", onPopState);
    window.addEventListener("pagehide", save);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      save();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("pagehide", save);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);
  return null;
}
