"use client";

import { useEffect } from "react";

/** Keep keyboard navigation inside an open overlay and restore its trigger. */
export function usePanelFocus(selector: string, open: boolean) {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = document.querySelector<HTMLElement>(selector);
    if (!panel) return;
    const focusable = () => Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter((item) => item.getClientRects().length > 0);
    const frame = requestAnimationFrame(() => {
      if (!panel.contains(document.activeElement)) focusable()[0]?.focus();
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("keydown", onKey); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [selector, open]);
}
