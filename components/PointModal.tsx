"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ImageLightbox } from "@/components/ImageLightbox";
import { TimelineSlider } from "@/components/TimelineSlider";
import { useLanguage } from "@/components/LanguageProvider";
import type { MapPoint } from "@/types/map";

export function PointModal({ point, onClose }: { point: MapPoint; onClose: () => void }) {
  const { copy } = useLanguage();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const images = point.images.length > 0
    ? [...point.images].sort((a, b) => a.daysFromBase - b.daysFromBase)
    : [{ day: "0", daysFromBase: 0, imageUrl: point.thumbnailUrl, publicId: point.thumbnailPublicId }];
  const selectedImage = images[Math.min(selectedIndex, images.length - 1)];
  const selectedImageLabel = selectedImage.daysFromBase === 0 ? copy.basePhoto : `${copy.day} ${selectedImage.daysFromBase}`;

  useEffect(() => {
    closeButtonRef.current?.focus();
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isImageOpen) onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isImageOpen, onClose]);

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
            <p>{copy.tracking}</p>
            <h2 id="point-modal-title">{point.title}</h2>
            <div className="point-modal-rule" />
            <p className="point-description">{point.description}</p>
            <div className="point-detail-list">
              {point.province && <span><strong>{copy.province}</strong>{point.province}</span>}
              {point.locality && <span><strong>{copy.locality}</strong>{point.locality}</span>}
              {point.advisor && <span><strong>{copy.advisor}</strong>{point.advisor}</span>}
              {point.dose && <span><strong>{copy.dose}</strong>{point.dose}</span>}
              {point.targetWeeds.length > 0 && <span><strong>{copy.targetWeeds}</strong>{point.targetWeeds.join(", ")}</span>}
            </div>
            <div className="point-meta">
              <span>{images.length}</span>
              <small>{copy.temporalRecords}</small>
            </div>
          </div>
        </div>

        <TimelineSlider key={point.id} images={images} selectedIndex={selectedIndex} onChange={setSelectedIndex} />
      </section>
      {isImageOpen && <ImageLightbox imageUrl={selectedImage.imageUrl} alt={`${point.title}, ${selectedImageLabel}`} onClose={() => setIsImageOpen(false)} />}
    </div>
  );
}
