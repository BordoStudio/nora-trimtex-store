"use client";

import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, X, ZoomIn } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { createPortal } from "react-dom";

type ZoomLabels = {
  close: string;
  zoomIn: string;
  zoomOut: string;
  reset: string;
  previous?: string;
  next?: string;
};

export const zoomLabels = {
  ru: { close: "Закрыть", zoomIn: "Увеличить", zoomOut: "Уменьшить", reset: "Исходный размер", previous: "Предыдущее фото", next: "Следующее фото" },
  uk: { close: "Закрити", zoomIn: "Збільшити", zoomOut: "Зменшити", reset: "Початковий розмір", previous: "Попереднє фото", next: "Наступне фото" },
  de: { close: "Schließen", zoomIn: "Vergrößern", zoomOut: "Verkleinern", reset: "Originalgröße", previous: "Vorheriges Bild", next: "Nächstes Bild" },
  en: { close: "Close", zoomIn: "Zoom in", zoomOut: "Zoom out", reset: "Original size", previous: "Previous image", next: "Next image" },
};

export function ImageZoomMark({ label }: { label: string }) {
  return <span className="image-zoom-mark" aria-hidden="true"><ZoomIn /><span>{label}</span></span>;
}

export function ImageZoomButton({ label, onClick, className = "" }: { label: string; onClick: () => void; className?: string }) {
  return <button className={`image-zoom-button ${className}`} type="button" onClick={(event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  }} aria-label={label} title={label}><ZoomIn /></button>;
}

export function ImageZoomViewer({
  src,
  alt,
  open,
  onClose,
  labels,
  onPrevious,
  onNext,
  previousSrc,
  nextSrc,
  counter,
}: {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
  labels: ZoomLabels;
  onPrevious?: () => void;
  onNext?: () => void;
  previousSrc?: string;
  nextSrc?: string;
  counter?: string;
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState({ x: 0, y: 0 });
  const [settling, setSettling] = useState(false);
  const dragStart = useRef({ pointerX: 0, pointerY: 0, imageX: 0, imageY: 0 });
  const gesture = useRef({ pointerId: -1, startX: 0, startY: 0, active: false });
  const suppressBackdropClick = useRef(false);
  const lastTap = useRef(0);
  const viewportWidth = typeof window === "undefined" ? 0 : window.innerWidth;
  const isSwiping = scale === 1 && (Math.abs(swipeOffset.x) > 0 || Math.abs(swipeOffset.y) > 0 || settling);

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setSwipeOffset({ x: 0, y: 0 });
    setSettling(false);
    gesture.current.active = false;
  }, []);
  const closeViewer = useCallback(() => {
    resetView();
    onClose();
  }, [onClose, resetView]);
  const navigate = useCallback((direction: "previous" | "next", fromDrag = false) => {
    const callback = direction === "next" ? onNext : onPrevious;
    if (!callback || settling) return;
    setScale(1);
    setOffset({ x: 0, y: 0 });
    const finishAt = direction === "next" ? -window.innerWidth : window.innerWidth;
    const begin = () => { setSettling(true); setSwipeOffset({ x: finishAt, y: 0 }); };
    if (fromDrag) begin(); else requestAnimationFrame(begin);
    window.setTimeout(() => {
      callback();
      setSettling(false);
      setSwipeOffset({ x: 0, y: 0 });
    }, 240);
  }, [onNext, onPrevious, settling]);
  const goPrevious = useCallback(() => navigate("previous"), [navigate]);
  const goNext = useCallback(() => navigate("next"), [navigate]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeViewer();
      if (event.key === "ArrowLeft") goPrevious();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "+" || event.key === "=") setScale((value) => Math.min(5, value + 0.35));
      if (event.key === "-") setScale((value) => Math.max(1, value - 0.35));
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [closeViewer, goNext, goPrevious, open]);

  const setZoom = (next: number) => {
    const normalized = Math.max(1, Math.min(5, next));
    setScale(normalized);
    if (normalized === 1) setOffset({ x: 0, y: 0 });
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setZoom(scale + (event.deltaY < 0 ? 0.3 : -0.3));
  };

  const beginDrag = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    if (scale <= 1) {
      gesture.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, active: true };
      return;
    }
    dragStart.current = { pointerX: event.clientX, pointerY: event.clientY, imageX: offset.x, imageY: offset.y };
    setDragging(true);
  };

  const drag = (event: PointerEvent<HTMLDivElement>) => {
    if (scale <= 1 && gesture.current.active && gesture.current.pointerId === event.pointerId) {
      const x = event.clientX - gesture.current.startX;
      const y = event.clientY - gesture.current.startY;
      if (Math.abs(x) > 5 || Math.abs(y) > 5) suppressBackdropClick.current = true;
      setSwipeOffset({ x, y });
      return;
    }
    if (!dragging) return;
    setOffset({
      x: dragStart.current.imageX + event.clientX - dragStart.current.pointerX,
      y: dragStart.current.imageY + event.clientY - dragStart.current.pointerY,
    });
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (scale <= 1 && gesture.current.active && gesture.current.pointerId === event.pointerId) {
      const x = event.clientX - gesture.current.startX;
      const y = event.clientY - gesture.current.startY;
      gesture.current.active = false;
      window.setTimeout(() => { suppressBackdropClick.current = false; }, 0);
      const distance = Math.hypot(x, y);
      if (distance < 12 && (event.target as HTMLElement).closest(".image-zoom-media")) {
        const now = Date.now();
        if (now - lastTap.current < 300) {
          setZoom(scale === 1 ? 2.25 : 1);
          lastTap.current = 0;
        } else {
          lastTap.current = now;
        }
        return;
      }
      if (Math.abs(y) > 85 && Math.abs(y) > Math.abs(x) * 1.05) {
        setSettling(true);
        setSwipeOffset({ x: 0, y: Math.sign(y) * window.innerHeight });
        window.setTimeout(closeViewer, 210);
      }
      else if (Math.abs(x) > 65 && Math.abs(x) > Math.abs(y) * 1.05) {
        navigate(x < 0 ? "next" : "previous", true);
      } else {
        setSettling(true);
        setSwipeOffset({ x: 0, y: 0 });
        window.setTimeout(() => setSettling(false), 200);
      }
      return;
    }
    setDragging(false);
  };

  const cancelDrag = () => {
    gesture.current.active = false;
    setSwipeOffset({ x: 0, y: 0 });
    setDragging(false);
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="image-zoom-overlay" role="dialog" aria-modal="true" aria-label={labels.zoomIn}>
      <div
        className={`image-zoom-stage${scale > 1 ? " is-zoomed" : ""}${dragging ? " is-dragging" : ""}${settling ? " is-settling" : ""}`}
        onClick={(event) => {
          if (suppressBackdropClick.current) { suppressBackdropClick.current = false; return; }
          if (event.target === event.currentTarget) closeViewer();
        }}
        onWheel={handleWheel}
        onPointerDown={(event) => {
          // Navigation/close/toolbar controls must never start a swipe gesture.
          if ((event.target as HTMLElement).closest("button")) return;
          beginDrag(event);
        }}
        onPointerMove={drag}
        onPointerUp={endDrag}
        onPointerCancel={cancelDrag}
      >
        {/* Native images preserve intrinsic dimensions while the viewer pans and scales them. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {isSwiping && previousSrc && <div className="image-zoom-slide is-neighbor" aria-hidden="true" style={{ transform: `translate3d(${-viewportWidth + swipeOffset.x}px, 0, 0)` }}><div className="image-zoom-media"><img src={previousSrc} alt="" draggable={false} /></div></div>}
        <div className="image-zoom-slide is-current" style={{ transform: `translate3d(${scale > 1 ? 0 : swipeOffset.x}px, ${scale > 1 ? 0 : swipeOffset.y}px, 0)`, opacity: scale === 1 ? Math.max(.25, 1 - Math.abs(swipeOffset.y) / 420) : 1 }}>
          <div className="image-zoom-media" onClick={(event) => event.stopPropagation()} onDoubleClick={() => setZoom(scale === 1 ? 2.25 : 1)} style={{ transform: `translate3d(${scale > 1 ? offset.x : 0}px, ${scale > 1 ? offset.y : 0}px, 0) scale(${scale})` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} draggable={false} />
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {isSwiping && nextSrc && <div className="image-zoom-slide is-neighbor" aria-hidden="true" style={{ transform: `translate3d(${viewportWidth + swipeOffset.x}px, 0, 0)` }}><div className="image-zoom-media"><img src={nextSrc} alt="" draggable={false} /></div></div>}
      </div>

      <button className="zoom-close" type="button" onClick={(event) => { event.stopPropagation(); closeViewer(); }} aria-label={labels.close}><X /></button>
      {onPrevious && <button className="zoom-navigation zoom-previous" type="button" onClick={(event) => { event.stopPropagation(); goPrevious(); }} aria-label={labels.previous}><ChevronLeft /></button>}
      {onNext && <button className="zoom-navigation zoom-next" type="button" onClick={(event) => { event.stopPropagation(); goNext(); }} aria-label={labels.next}><ChevronRight /></button>}

      <div className="image-zoom-toolbar" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={() => setZoom(scale - 0.35)} disabled={scale <= 1} aria-label={labels.zoomOut}><Minus /></button>
        <output aria-live="polite">{Math.round(scale * 100)}%</output>
        <button type="button" onClick={() => setZoom(scale + 0.35)} disabled={scale >= 5} aria-label={labels.zoomIn}><Plus /></button>
        <button type="button" onClick={() => setZoom(1)} disabled={scale === 1} aria-label={labels.reset}><RotateCcw /></button>
      </div>
      {counter && <span className="image-zoom-counter">{counter}</span>}
    </div>,
    document.body,
  );
}
