"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type WheelEvent } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/components/LanguageProvider";
import type { ImagePreviewPosition, ImagePreviewSettings, ImagePreviewViewport } from "@/types/map";

const DEFAULT_POSITION: ImagePreviewPosition = { x: 50, y: 50, zoom: 1 };
const MIN_ZOOM = 1;
const MAX_ZOOM = 2.6;

const VIEWPORTS: Array<{ id: ImagePreviewViewport; aspect: string; ratio: number }> = [
  { id: "desktop", aspect: "1.26 / 1", ratio: 1.26 },
  { id: "mobile", aspect: "1.58 / 1", ratio: 1.58 },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizePosition(position?: Partial<ImagePreviewPosition>): ImagePreviewPosition {
  return {
    x: clamp(Number(position?.x ?? DEFAULT_POSITION.x), 0, 100),
    y: clamp(Number(position?.y ?? DEFAULT_POSITION.y), 0, 100),
    zoom: clamp(Number(position?.zoom ?? DEFAULT_POSITION.zoom), MIN_ZOOM, MAX_ZOOM),
  };
}

function normalizeSettings(settings?: ImagePreviewSettings): Required<ImagePreviewSettings> {
  const desktop = normalizePosition(settings?.desktop);
  return {
    desktop,
    mobile: normalizePosition(settings?.mobile || desktop),
  };
}

function positionStyle(position: ImagePreviewPosition, imageUrl: string): CSSProperties {
  return {
    backgroundImage: `url("${imageUrl}")`,
    objectPosition: `${position.x}% ${position.y}%`,
    transform: `scale(${position.zoom})`,
    transformOrigin: `${position.x}% ${position.y}%`,
  };
}

function imagePlaneStyle(
  position: ImagePreviewPosition,
  frameSize: { width: number; height: number } | null,
  imageSize: { width: number; height: number } | null,
): CSSProperties {
  if (!frameSize || !imageSize) {
    return {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      objectPosition: `${position.x}% ${position.y}%`,
      transform: `scale(${position.zoom})`,
      transformOrigin: `${position.x}% ${position.y}%`,
    };
  }

  const coverScale = Math.max(frameSize.width / imageSize.width, frameSize.height / imageSize.height) * position.zoom;
  const width = imageSize.width * coverScale;
  const height = imageSize.height * coverScale;
  return {
    width,
    height,
    left: (frameSize.width - width) * (position.x / 100),
    top: (frameSize.height - height) * (position.y / 100),
  };
}

interface ImagePreviewEditorProps {
  imageUrl: string;
  imageTitle: string;
  initialSettings?: ImagePreviewSettings;
  onClose: () => void;
  onSave: (settings: ImagePreviewSettings) => void;
}

export function ImagePreviewEditor({ imageUrl, imageTitle, initialSettings, onClose, onSave }: ImagePreviewEditorProps) {
  const { copy } = useLanguage();
  const [activeViewport, setActiveViewport] = useState<ImagePreviewViewport>("desktop");
  const [positions, setPositions] = useState(() => normalizeSettings(initialSettings));
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startPosition: ImagePreviewPosition;
    bounds: DOMRect;
  } | null>(null);

  const activePosition = positions[activeViewport];
  const activeConfig = VIEWPORTS.find((viewport) => viewport.id === activeViewport) || VIEWPORTS[0];
  const previewLabel = activeViewport === "desktop" ? copy.desktopPreview : copy.mobilePreview;
  const zoomPercent = Math.round(activePosition.zoom * 100);

  useEffect(() => {
    closeButtonRef.current?.focus();
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const updateFrameSize = () => {
      const rect = frame.getBoundingClientRect();
      setFrameSize({ width: rect.width, height: rect.height });
    };
    updateFrameSize();
    const observer = new ResizeObserver(updateFrameSize);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [activeViewport]);

  function updatePosition(updater: (position: ImagePreviewPosition) => ImagePreviewPosition) {
    setPositions((current) => ({
      ...current,
      [activeViewport]: normalizePosition(updater(current[activeViewport])),
    }));
  }

  function changeZoom(delta: number) {
    updatePosition((position) => ({ ...position, zoom: position.zoom + delta }));
  }

  function resetActive() {
    updatePosition(() => DEFAULT_POSITION);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPosition: activePosition,
      bounds,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startClientX;
    const deltaY = event.clientY - drag.startClientY;
    const sensitivity = 100 / Math.max(drag.startPosition.zoom, 1);
    setPositions((current) => ({
      ...current,
      [activeViewport]: normalizePosition({
        ...drag.startPosition,
        x: drag.startPosition.x - (deltaX / drag.bounds.width) * sensitivity,
        y: drag.startPosition.y - (deltaY / drag.bounds.height) * sensitivity,
      }),
    }));
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      dragRef.current = null;
    }
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    changeZoom(event.deltaY < 0 ? 0.06 : -0.06);
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="crop-editor-overlay" role="dialog" aria-modal="true" aria-labelledby="crop-editor-title">
      <section className="crop-editor-modal">
        <header className="crop-editor-header">
          <div className="crop-editor-title">
            <div className="crop-editor-tabs" role="tablist" aria-label={copy.previewViewport}>
              {VIEWPORTS.map((viewport) => (
                <button
                  key={viewport.id}
                  type="button"
                  role="tab"
                  className={activeViewport === viewport.id ? "is-active" : ""}
                  aria-selected={activeViewport === viewport.id}
                  onClick={() => setActiveViewport(viewport.id)}
                >
                  {viewport.id === "desktop" ? copy.desktopPreview : copy.mobilePreview}
                </button>
              ))}
            </div>
            <div>
              <h2 id="crop-editor-title">{copy.editImagePreview}</h2>
              <p>{copy.editImagePreviewCopy}</p>
            </div>
          </div>
          <button ref={closeButtonRef} className="crop-editor-close" type="button" onClick={onClose} aria-label={copy.closeForm}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </header>

        <div className="crop-editor-body">
          <div className="crop-editor-workspace">
            <p className="crop-editor-eyebrow">{copy.adjustVisibleArea}</p>
            <p className="crop-editor-help">{copy.adjustVisibleAreaCopy}</p>
            <div className="crop-editor-canvas">
              <div
                ref={frameRef}
                className="crop-editor-frame"
                style={{ aspectRatio: activeConfig.aspect, "--crop-aspect": activeConfig.ratio } as CSSProperties}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                onWheel={handleWheel}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="crop-editor-image-plane"
                  src={imageUrl}
                  alt={imageTitle}
                  draggable={false}
                  style={imagePlaneStyle(activePosition, frameSize, imageSize)}
                  onLoad={(event) => setImageSize({
                    width: event.currentTarget.naturalWidth,
                    height: event.currentTarget.naturalHeight,
                  })}
                />
                <span className="crop-frame-shade" aria-hidden="true" />
                <span className="crop-grid" aria-hidden="true" />
                <span className="crop-handle is-top-left" aria-hidden="true" />
                <span className="crop-handle is-top-right" aria-hidden="true" />
                <span className="crop-handle is-bottom-left" aria-hidden="true" />
                <span className="crop-handle is-bottom-right" aria-hidden="true" />
              </div>
            </div>

            <div className="crop-editor-controls">
              <button type="button" onClick={() => changeZoom(-0.08)} aria-label={copy.imageZoomOut}>−</button>
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step="0.01"
                value={activePosition.zoom}
                onChange={(event) => updatePosition((position) => ({ ...position, zoom: Number(event.target.value) }))}
                aria-label={copy.zoom}
              />
              <button type="button" onClick={() => changeZoom(0.08)} aria-label={copy.imageZoomIn}>+</button>
              <span>{zoomPercent} %</span>
              <button type="button" onClick={resetActive}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6M4 4v4.6h4.6" /></svg>
                {copy.resetCrop}
              </button>
            </div>
          </div>

          <aside className="crop-editor-preview">
            <p className="crop-editor-eyebrow">{copy.preview}</p>
            <p className="crop-editor-help">{activeViewport === "desktop" ? copy.desktopPreviewCopy : copy.mobilePreviewCopy}</p>
            <div className={`crop-preview-card is-${activeViewport}`}>
              <div className="crop-preview-image" style={{ aspectRatio: activeConfig.aspect }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt={imageTitle} draggable={false} style={positionStyle(activePosition, imageUrl)} />
                <span className="point-image-badge">{copy.basePhoto}</span>
                <span className="point-image-expand" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5" /></svg>
                </span>
              </div>
              <div className="crop-preview-copy">
                <span>{copy.tracking}</span>
                <strong>{previewLabel}</strong>
                <p>{copy.editImagePreviewSample}</p>
              </div>
              {activeViewport === "desktop" && (
                <div className="crop-preview-timeline">
                  <span>{copy.fieldEfficiency}</span>
                  <i />
                </div>
              )}
            </div>
          </aside>
        </div>

        <footer className="crop-editor-footer">
          <button type="button" onClick={onClose}>{copy.cancel}</button>
          <button type="button" onClick={() => onSave(positions)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3v18M3 6h18M8 21h10a3 3 0 0 0 3-3V8M3 16h13a3 3 0 0 0 3-3V3" /></svg>
            {copy.saveCrop}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
