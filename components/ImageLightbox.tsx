"use client";

import { useEffect, useRef } from "react";
import { TransformComponent, TransformWrapper, useControls } from "react-zoom-pan-pinch";

function LightboxControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="lightbox-controls" aria-label="Controles de imagen">
      <button type="button" onClick={() => zoomIn(0.5)} aria-label="Acercar imagen">+</button>
      <button type="button" onClick={() => zoomOut(0.5)} aria-label="Alejar imagen">−</button>
      <button type="button" onClick={() => resetTransform()} aria-label="Restaurar imagen">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6M4 4v4.6h4.6" /></svg>
      </button>
    </div>
  );
}

export function ImageLightbox({ imageUrl, alt, onClose }: { imageUrl: string; alt: string; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div className="image-lightbox" role="dialog" aria-modal="true" aria-label="Imagen ampliada">
      <button ref={closeButtonRef} className="image-lightbox-close" type="button" onClick={onClose} aria-label="Cerrar imagen ampliada">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
      <TransformWrapper initialScale={1} minScale={0.75} maxScale={6} centerOnInit limitToBounds={false} wheel={{ step: 0.25 }} pinch={{ step: 5 }} doubleClick={{ mode: "toggle", step: 1.2 }} panning={{ velocityDisabled: false }}>
        <LightboxControls />
        <TransformComponent wrapperClass="image-lightbox-wrapper" contentClass="image-lightbox-content">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={alt} draggable={false} />
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
