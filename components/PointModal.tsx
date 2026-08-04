"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImageLightbox } from "@/components/ImageLightbox";
import { TimelineSlider } from "@/components/TimelineSlider";
import { useLanguage } from "@/components/LanguageProvider";
import type { MapPoint } from "@/types/map";

function splitWeedLabel(weed: string) {
  const [commonName, ...scientificNameParts] = weed.split(" - ");
  return {
    commonName: commonName.trim(),
    scientificName: scientificNameParts.join(" - ").trim(),
  };
}

export function PointModal({ point, onClose }: { point: MapPoint; onClose: () => void }) {
  const { copy } = useLanguage();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [scrollState, setScrollState] = useState({ canScrollUp: false, canScrollDown: false });
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const copyScrollRef = useRef<HTMLDivElement>(null);
  const images = point.images.length > 0
    ? [...point.images].sort((a, b) => a.daysFromBase - b.daysFromBase)
    : [{ day: "0", daysFromBase: 0, title: "", imageUrl: point.thumbnailUrl, publicId: point.thumbnailPublicId, isBase: true }];
  const selectedImage = images[Math.min(selectedIndex, images.length - 1)];
  const selectedImageDayLabel = `${copy.day} ${selectedImage.daysFromBase}`;
  const selectedImageLabel = selectedImage.title?.trim() || selectedImageDayLabel;

  useEffect(() => {
    closeButtonRef.current?.focus();
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isImageOpen) onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isImageOpen, onClose]);

  const updateScrollState = useCallback(() => {
    const element = copyScrollRef.current;
    if (!element) return;
    const canScroll = element.scrollHeight > element.clientHeight + 2;
    setScrollState({
      canScrollUp: canScroll && element.scrollTop > 4,
      canScrollDown: canScroll && element.scrollTop + element.clientHeight < element.scrollHeight - 4,
    });
  }, []);

  useEffect(() => {
    updateScrollState();
    const element = copyScrollRef.current;
    if (!element) return;
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(element);
    resizeObserver.observe(document.body);
    return () => resizeObserver.disconnect();
  }, [point, selectedIndex, updateScrollState]);

  function scrollCopy(direction: "up" | "down") {
    copyScrollRef.current?.scrollBy({
      top: direction === "up" ? -180 : 180,
      behavior: "smooth",
    });
  }

  return (
    <div className="point-modal-overlay" onPointerDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="point-modal" role="dialog" aria-modal="true" aria-labelledby="point-modal-title">
        <button ref={closeButtonRef} className="point-modal-close" type="button" onClick={onClose} aria-label={copy.closeDetail}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>

        <div className="point-modal-main">
          <button className="point-modal-image" type="button" onClick={() => setIsImageOpen(true)} aria-label={`${copy.enlargeImage} ${point.title}, ${selectedImageLabel}`}>
            <Image key={selectedImage.imageUrl} src={selectedImage.imageUrl} alt={`${point.title}, ${selectedImageLabel}`} fill sizes="(max-width: 700px) 90vw, 50vw" unoptimized priority />
            <div className="point-image-badge">{selectedImageLabel}</div>
            <span className="point-image-expand" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5" /></svg>
            </span>
          </button>
          <div className="point-modal-copy">
            <div ref={copyScrollRef} className="point-modal-copy-scroll" onScroll={updateScrollState}>
              <p>{copy.tracking}</p>
              <h2 id="point-modal-title">{point.title}</h2>
              <div className="point-modal-rule" />
              <p className="point-description">{point.description}</p>
              <div className="point-detail-list">
                {point.province && <span><strong>{copy.province}</strong>{point.province}</span>}
                {point.locality && <span><strong>{copy.locality}</strong>{point.locality}</span>}
                {point.advisor && <span><strong>{copy.advisorShort}</strong>{point.advisor}</span>}
                {point.dose && <span><strong>{copy.dose}</strong>{point.dose}</span>}
                {point.targetWeeds.length > 0 && (
                  <span>
                    <strong>{copy.targetWeeds}</strong>
                    <span className="point-weed-list">
                      {point.targetWeeds.map((weed) => {
                        const { commonName, scientificName } = splitWeedLabel(weed);
                        return (
                          <span key={weed} className="point-weed-item">
                            <span>{commonName}</span>
                            {scientificName && <em>{scientificName}</em>}
                          </span>
                        );
                      })}
                    </span>
                  </span>
                )}
              </div>
            </div>
            {scrollState.canScrollUp && (
              <button className="point-copy-scroll-button is-up" type="button" onClick={() => scrollCopy("up")} aria-label={copy.scrollInfoUp}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 14 6-6 6 6" /></svg>
              </button>
            )}
            {scrollState.canScrollDown && (
              <button className="point-copy-scroll-button is-down" type="button" onClick={() => scrollCopy("down")} aria-label={copy.scrollInfoDown}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 10 6 6 6-6" /></svg>
              </button>
            )}
          </div>
        </div>

        <TimelineSlider key={point.id} images={images} selectedIndex={selectedIndex} onChange={setSelectedIndex} />
      </section>
      {isImageOpen && <ImageLightbox imageUrl={selectedImage.imageUrl} alt={`${point.title}, ${selectedImageLabel}`} onClose={() => setIsImageOpen(false)} />}
    </div>
  );
}
