"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ImageLightbox } from "@/components/ImageLightbox";
import { TimelineSlider } from "@/components/TimelineSlider";
import type { MapPoint } from "@/types/map";

export function PointModal({ point, onClose }: { point: MapPoint; onClose: () => void }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const selectedImage = point.images[selectedIndex];

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
        <button ref={closeButtonRef} className="point-modal-close" type="button" onClick={onClose} aria-label="Cerrar detalle">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>

        <div className="point-modal-main">
          <button className="point-modal-image" type="button" onClick={() => setIsImageOpen(true)} aria-label={`Ampliar imagen de ${point.title}, día ${selectedImage.day}`}>
            <Image key={selectedImage.imageUrl} src={selectedImage.imageUrl} alt={`${point.title}, día ${selectedImage.day}`} fill sizes="(max-width: 700px) 90vw, 50vw" unoptimized priority />
            <div className="point-image-badge">Día {selectedImage.day}</div>
            <span className="point-image-expand" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5" /></svg>
            </span>
          </button>
          <div className="point-modal-copy">
            <p>Seguimiento productivo</p>
            <h2 id="point-modal-title">{point.title}</h2>
            <div className="point-modal-rule" />
            <p className="point-description">{point.description}</p>
            <div className="point-meta">
              <span>{point.images.length}</span>
              <small>registros temporales</small>
            </div>
          </div>
        </div>

        <TimelineSlider key={point.id} images={point.images} selectedIndex={selectedIndex} onChange={setSelectedIndex} />
      </section>
      {isImageOpen && <ImageLightbox imageUrl={selectedImage.imageUrl} alt={`${point.title}, día ${selectedImage.day}`} onClose={() => setIsImageOpen(false)} />}
    </div>
  );
}
