"use client";

import { useCallback, useEffect, useRef, type PointerEvent } from "react";
import { TransformComponent, TransformWrapper, useControls, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { useKioskRotation } from "@/components/KioskRotationProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { useUIScale } from "@/components/UIScaleProvider";

function LightboxControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const { copy } = useLanguage();
  return (
    <div className="lightbox-controls" aria-label={copy.imageControls}>
      <button type="button" onClick={() => zoomIn(0.5)} aria-label={copy.imageZoomIn}>+</button>
      <button type="button" onClick={() => zoomOut(0.5)} aria-label={copy.imageZoomOut}>−</button>
      <button type="button" onClick={() => resetTransform()} aria-label={copy.imageReset}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6M4 4v4.6h4.6" /></svg>
      </button>
    </div>
  );
}

export function ImageLightbox({ imageUrl, alt, onClose }: { imageUrl: string; alt: string; onClose: () => void }) {
  const { copy } = useLanguage();
  const { isRotated } = useKioskRotation();
  const { scale: uiScale } = useUIScale();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const rotatedPan = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startPositionX: number;
    startPositionY: number;
    isDragging: boolean;
  } | null>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const keepImageVisible = useCallback((ref: ReactZoomPanPinchRef) => {
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
      const positionCorrectionX = isRotated ? -correctionY / uiScale : correctionX;
      const positionCorrectionY = isRotated ? correctionX / uiScale : correctionY;
      ref.setTransform(
        ref.state.positionX + positionCorrectionX,
        ref.state.positionY + positionCorrectionY,
        ref.state.scale,
        180,
        "easeOut",
      );
    }
  }, [isRotated, uiScale]);

  function handleRotatedPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!isRotated) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest("button")) return;

    const ref = transformRef.current;
    if (!ref) return;
    rotatedPan.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPositionX: ref.state.positionX,
      startPositionY: ref.state.positionY,
      isDragging: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleRotatedPointerMove(event: PointerEvent<HTMLDivElement>) {
    const pan = rotatedPan.current;
    const ref = transformRef.current;
    if (!isRotated || !pan || !ref || pan.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - pan.startClientX;
    const deltaY = event.clientY - pan.startClientY;
    if (!pan.isDragging && Math.hypot(deltaX, deltaY) > 4) pan.isDragging = true;
    if (!pan.isDragging) return;

    event.preventDefault();
    ref.setTransform(
      pan.startPositionX + (-deltaY / uiScale),
      pan.startPositionY + (deltaX / uiScale),
      ref.state.scale,
      0,
      "linear",
    );
  }

  function handleRotatedPointerEnd(event: PointerEvent<HTMLDivElement>) {
    const pan = rotatedPan.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    rotatedPan.current = null;
    const ref = transformRef.current;
    if (ref) keepImageVisible(ref);
  }

  return (
    <div
      ref={lightboxRef}
      className="image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={copy.enlargedImage}
      onPointerDown={handleRotatedPointerDown}
      onPointerMove={handleRotatedPointerMove}
      onPointerUp={handleRotatedPointerEnd}
      onPointerCancel={handleRotatedPointerEnd}
    >
      <button ref={closeButtonRef} className="image-lightbox-close" type="button" onClick={onClose} aria-label={copy.closeEnlargedImage}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={0.75}
        maxScale={6}
        centerOnInit
        centerZoomedOut
        limitToBounds
        wheel={{ step: 0.25 }}
        pinch={{ step: 5 }}
        doubleClick={{ mode: "toggle", step: 1.2 }}
        panning={{ disabled: isRotated, velocityDisabled: false }}
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
