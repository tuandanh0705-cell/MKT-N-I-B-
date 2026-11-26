"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface DemoImageLightboxProps {
  images: string[];
  activeIndex: number | null;
  title?: string;
  onClose: () => void;
  onChangeIndex: (nextIndex: number) => void;
}

function getHighResLightboxUrl(src: string): string {
  if (/drive\.google\.com\/thumbnail\?/i.test(src) && src.includes("sz=w1000")) {
    return src.replace("sz=w1000", "sz=w2000");
  }
  return src;
}

export function DemoImageLightbox({
  images,
  activeIndex,
  title,
  onClose,
  onChangeIndex,
}: DemoImageLightboxProps) {
  const [zoomed, setZoomed] = useState(false);

  const isOpen =
    activeIndex !== null &&
    images.length > 0 &&
    activeIndex >= 0 &&
    activeIndex < images.length;

  useEffect(() => {
    if (!isOpen || activeIndex === null) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === "ArrowLeft" && images.length > 1) {
        e.preventDefault();
        setZoomed(false);
        onChangeIndex((activeIndex! - 1 + images.length) % images.length);
      } else if (e.key === "ArrowRight" && images.length > 1) {
        e.preventDefault();
        setZoomed(false);
        onChangeIndex((activeIndex! + 1) % images.length);
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, activeIndex, images.length, onClose, onChangeIndex]);

  if (!isOpen || activeIndex === null || typeof document === "undefined") {
    return null;
  }

  const currentSrc = images[activeIndex];
  const highResSrc = getHighResLightboxUrl(currentSrc);
  const isExternalHttp = /^https?:\/\//i.test(currentSrc);

  function goPrev() {
    if (images.length <= 1 || activeIndex === null) return;
    setZoomed(false);
    onChangeIndex((activeIndex - 1 + images.length) % images.length);
  }

  function goNext() {
    if (images.length <= 1 || activeIndex === null) return;
    setZoomed(false);
    onChangeIndex((activeIndex + 1) % images.length);
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh phóng to"
      className="fixed inset-0 z-[9999] flex flex-col bg-slate-950/92 backdrop-blur-sm select-none"
      onClick={() => {
        setZoomed(false);
        onClose();
      }}
    >
      {/* Top Toolbar */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 text-white bg-gradient-to-b from-black/60 to-transparent shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="rounded-full bg-white/15 border border-white/20 px-3 py-1 text-xs font-extrabold tracking-wide shrink-0">
            Ảnh {activeIndex + 1} / {images.length}
          </span>
          {title && (
            <span className="text-xs sm:text-sm font-semibold text-white/85 truncate">
              {title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setZoomed((z) => !z)}
            title={zoomed ? "Thu về vừa màn hình" : "Phóng to để đọc chữ rõ hơn"}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 px-3 py-1.5 text-xs font-bold text-white cursor-pointer transition"
          >
            {zoomed ? (
              <>
                <ZoomOut className="w-4 h-4" />
                <span className="hidden sm:inline">Vừa khung</span>
              </>
            ) : (
              <>
                <ZoomIn className="w-4 h-4" />
                <span className="hidden sm:inline">Phóng to</span>
              </>
            )}
          </button>

          {isExternalHttp && (
            <a
              href={highResSrc}
              target="_blank"
              rel="noopener noreferrer"
              title="Mở ảnh ở tab mới"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 px-3 py-1.5 text-xs font-bold text-white transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tab gốc</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => {
              setZoomed(false);
              onClose();
            }}
            aria-label="Đóng xem ảnh"
            title="Đóng (Esc)"
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 hover:bg-rose-500 border border-white/20 text-white cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Centered Image Stage */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center p-3 sm:p-6 overflow-auto">
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Ảnh trước"
            title="Ảnh trước (←)"
            className="fixed left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/60 hover:bg-black/85 border border-white/25 text-white flex items-center justify-center shadow-xl cursor-pointer transition"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <div
          onClick={(e) => e.stopPropagation()}
          className={`flex items-center justify-center ${
            zoomed ? "min-w-fit min-h-fit p-4" : "max-w-full max-h-full"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={highResSrc}
            alt={title ? `${title} — Ảnh ${activeIndex + 1}` : `Ảnh demo ${activeIndex + 1}`}
            onClick={() => setZoomed((z) => !z)}
            className={`rounded-xl shadow-2xl bg-black/30 transition-all duration-200 ${
              zoomed
                ? "max-w-none w-auto max-h-none cursor-zoom-out"
                : "max-w-[92vw] max-h-[78vh] w-auto h-auto object-contain cursor-zoom-in"
            }`}
          />
        </div>

        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Ảnh tiếp theo"
            title="Ảnh tiếp theo (→)"
            className="fixed right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/60 hover:bg-black/85 border border-white/25 text-white flex items-center justify-center shadow-xl cursor-pointer transition"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip (khi có từ 2 ảnh trở lên) */}
      {images.length > 1 && (
        <div
          className="px-4 py-3 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-center gap-2 overflow-x-auto shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((src, idx) => {
            const active = idx === activeIndex;
            return (
              <button
                key={`${src.slice(0, 40)}-${idx}`}
                type="button"
                onClick={() => {
                  setZoomed(false);
                  onChangeIndex(idx);
                }}
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                  active
                    ? "border-amber-400 scale-105 shadow-lg opacity-100"
                    : "border-white/25 opacity-60 hover:opacity-95"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>,
    document.body
  );
}
