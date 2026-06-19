"use client";

import { useEffect, useRef } from "react";
import { TransformComponent, TransformWrapper, useControls, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";

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
  const lightboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  function keepImageVisible(ref: ReactZoomPanPinchRef) {
    const image = lightboxRef.current?.querySelector<HTMLImageElement>(".image-lightbox-content img");
    const viewport = lightboxRef.current?.querySelector<HTMLElement>(".image-lightbox-wrapper");
    if (!image || !viewport) return;
    const imageRect = image.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    const minimumVisible = Math.min(120, viewportRect.width * 0.28, viewportRect.height * 0.28);
    let correctionX = 0;
    let correctionY = 0;
    if (imageRect.right < viewportRect.left + minimumVisible) correctionX = viewportRect.left + minimumVisible - imageRect.right;
    if (imageRect.left > viewportRect.right - minimumVisible) correctionX = viewportRect.right - minimumVisible - imageRect.left;
    if (imageRect.bottom < viewportRect.top + minimumVisible) correctionY = viewportRect.top + minimumVisible - imageRect.bottom;
    if (imageRect.top > viewportRect.bottom - minimumVisible) correctionY = viewportRect.bottom - minimumVisible - imageRect.top;
    if (correctionX || correctionY) {
      ref.setTransform(ref.state.positionX + correctionX, ref.state.positionY + correctionY, ref.state.scale, 180, "easeOut");
    }
  }

  return (
    <div ref={lightboxRef} className="image-lightbox" role="dialog" aria-modal="true" aria-label="Imagen ampliada">
      <button ref={closeButtonRef} className="image-lightbox-close" type="button" onClick={onClose} aria-label="Cerrar imagen ampliada">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
      <TransformWrapper
        initialScale={1}
        minScale={0.75}
        maxScale={6}
        centerOnInit
        centerZoomedOut
        limitToBounds
        wheel={{ step: 0.25 }}
        pinch={{ step: 5 }}
        doubleClick={{ mode: "toggle", step: 1.2 }}
        panning={{ velocityDisabled: false }}
        onPanningStop={keepImageVisible}
        onZoomStop={keepImageVisible}
        onPinchStop={keepImageVisible}
      >
        <LightboxControls />
        <TransformComponent wrapperClass="image-lightbox-wrapper" contentClass="image-lightbox-content">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={alt} draggable={false} />
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
