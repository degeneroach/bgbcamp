"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";

type MediaKind = "image" | "video";

export interface GalleryItem {
  src: string;
  alt?: string;
}

type LightboxApi = {
  open: (src: string, alt?: string, kind?: MediaKind) => void;
  /** Opens a set of images with prev/next arrows, starting at `startIndex`. */
  openGallery: (items: GalleryItem[], startIndex: number) => void;
};

const LightboxContext = createContext<LightboxApi | null>(null);

/** Opens the app-wide image/video lightbox. Returns null outside the provider. */
export function useImageLightbox() {
  return useContext(LightboxContext);
}

const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "m4v", "ogv"];

function detectKind(src: string): MediaKind {
  const ext = src.split(/[?#]/)[0].split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXTENSIONS.includes(ext) ? "video" : "image";
}

const MIN_SCALE = 1;
const MAX_SCALE = 6;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function VideoLightbox({
  src,
  onClose,
}: {
  src: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute right-3 top-3 z-10" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        src={src}
        controls
        autoPlay
        playsInline
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] max-w-[92vw] rounded-lg"
      />
      <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/60">
        Esc to close
      </p>
    </div>
  );
}

function Lightbox({
  items,
  index,
  onNavigate,
  onClose,
}: {
  items: GalleryItem[];
  index: number;
  onNavigate: (nextIndex: number) => void;
  onClose: () => void;
}) {
  const { src, alt = "" } = items[index];
  const hasGallery = items.length > 1;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  // Translation measured from the container center, in screen pixels.
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const reset = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  // Zoom toward a point (measured from container center) so it stays put.
  const zoomTo = useCallback(
    (nextScale: number, pointX: number, pointY: number) => {
      setScale((prev) => {
        const clamped = clamp(nextScale, MIN_SCALE, MAX_SCALE);
        const ratio = clamped / prev;
        setTx((prevTx) => pointX - (pointX - prevTx) * ratio);
        setTy((prevTy) => pointY - (pointY - prevTy) * ratio);
        if (clamped === MIN_SCALE) {
          setTx(0);
          setTy(0);
        }
        return clamped;
      });
    },
    [],
  );

  function pointFromEvent(clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: clientX - (rect.left + rect.width / 2),
      y: clientY - (rect.top + rect.height / 2),
    };
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const { x, y } = pointFromEvent(e.clientX, e.clientY);
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    zoomTo(scale * factor, x, y);
  }

  function handleImageClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (dragRef.current?.moved) return; // was a pan, not a click
    const { x, y } = pointFromEvent(e.clientX, e.clientY);
    zoomTo(scale > 1 ? 1 : 2.5, x, y);
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (scale <= 1) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, moved: false };
  }

  function handlePointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
    drag.x = e.clientX;
    drag.y = e.clientY;
    setTx((v) => v + dx);
    setTy((v) => v + dy);
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (dragRef.current) {
      // Let the click handler read `moved`, then clear on next tick.
      const captured = dragRef.current;
      setTimeout(() => {
        if (dragRef.current === captured) dragRef.current = null;
      }, 0);
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer may already be released */
    }
  }

  const goPrev = useCallback(() => {
    if (hasGallery) onNavigate((index - 1 + items.length) % items.length);
  }, [hasGallery, onNavigate, index, items.length]);
  const goNext = useCallback(() => {
    if (hasGallery) onNavigate((index + 1) % items.length);
  }, [hasGallery, onNavigate, index, items.length]);

  // Fresh image, fresh zoom.
  useEffect(() => {
    reset();
  }, [index, reset]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "0") reset();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    }
    document.addEventListener("keydown", onKey);
    // Lock background scroll while open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, reset, goPrev, goNext]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/85 backdrop-blur-sm"
      onClick={onClose}
      onWheel={handleWheel}
      role="dialog"
      aria-modal="true"
    >
      {/* Controls */}
      <div
        className="absolute right-3 top-3 z-10 flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => zoomTo(scale / 1.4, 0, 0)}
          className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => zoomTo(scale * 1.4, 0, 0)}
          className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          aria-label="Reset zoom"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {hasGallery && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/25"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/25"
            aria-label="Next image"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <span className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90">
            {index + 1} / {items.length}
          </span>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={src}
        src={src}
        alt={alt}
        draggable={false}
        onClick={handleImageClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          cursor: scale > 1 ? "grab" : "zoom-in",
          transition: dragRef.current ? "none" : "transform 120ms ease-out",
        }}
        className="max-h-[90vh] max-w-[92vw] touch-none select-none object-contain will-change-transform"
      />

      <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/60">
        {hasGallery ? "← → to switch · " : ""}Scroll or click to zoom · drag to pan · Esc to close
      </p>
    </div>
  );
}

export function ImageLightboxProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<
    | { kind: "video"; src: string }
    | { kind: "image"; items: GalleryItem[]; index: number }
    | null
  >(null);

  const open = useCallback((src: string, alt = "", kind?: MediaKind) => {
    if ((kind ?? detectKind(src)) === "video") {
      setState({ kind: "video", src });
    } else {
      setState({ kind: "image", items: [{ src, alt }], index: 0 });
    }
  }, []);

  const openGallery = useCallback((items: GalleryItem[], startIndex: number) => {
    if (items.length === 0) return;
    setState({
      kind: "image",
      items,
      index: clamp(startIndex, 0, items.length - 1),
    });
  }, []);

  const close = useCallback(() => setState(null), []);

  return (
    <LightboxContext.Provider value={{ open, openGallery }}>
      {children}
      {state &&
        (state.kind === "video" ? (
          <VideoLightbox src={state.src} onClose={close} />
        ) : (
          <Lightbox
            items={state.items}
            index={state.index}
            onNavigate={(index) =>
              setState((prev) => (prev?.kind === "image" ? { ...prev, index } : prev))
            }
            onClose={close}
          />
        ))}
    </LightboxContext.Provider>
  );
}
