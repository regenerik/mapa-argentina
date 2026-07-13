"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useControls } from "react-zoom-pan-pinch";
import { useKioskRotation } from "@/components/KioskRotationProvider";
import { useLanguage } from "@/components/LanguageProvider";

type ZoomAction = (step?: number, animationTime?: number, animationType?: "easeOut" | "linear") => void;

function HoldZoomButton({
  action,
  label,
  children,
}: {
  action: ZoomAction;
  label: string;
  children: React.ReactNode;
}) {
  const delayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPressed = useRef(false);
  const didRepeat = useRef(false);

  function clearTimers() {
    if (delayTimer.current) clearTimeout(delayTimer.current);
    if (repeatTimer.current) clearInterval(repeatTimer.current);
    delayTimer.current = null;
    repeatTimer.current = null;
  }

  useEffect(() => clearTimers, []);

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.preventDefault();
    clearTimers();
    isPressed.current = true;
    didRepeat.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);

    delayTimer.current = setTimeout(() => {
      didRepeat.current = true;
      action(0.08, 110, "linear");
      repeatTimer.current = setInterval(() => action(0.08, 110, "linear"), 165);
    }, 360);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!isPressed.current) return;

    isPressed.current = false;
    clearTimers();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!didRepeat.current) action(0.22, 180, "easeOut");
  }

  function handlePointerCancel() {
    isPressed.current = false;
    clearTimers();
  }

  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={(event) => {
        if (event.detail === 0) action(0.22, 180, "easeOut");
      }}
    >
      {children}
    </button>
  );
}

export function MapControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const { isRotated, toggleRotation } = useKioskRotation();
  const { copy } = useLanguage();

  return (
    <div className="map-controls" aria-label={copy.mapControls}>
      <HoldZoomButton action={zoomIn} label={copy.zoomIn}>+</HoldZoomButton>
      <HoldZoomButton action={zoomOut} label={copy.zoomOut}>-</HoldZoomButton>
      <button className="reset-control" type="button" onClick={() => resetTransform()} aria-label={copy.resetView}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6M4 4v4.6h4.6" /></svg>
      </button>
      <button className="rotation-control" type="button" onClick={toggleRotation} aria-label={isRotated ? copy.restoreRotation : copy.rotateInterface}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {isRotated ? (
            <path d="M19 7a8 8 0 1 0 1.7 8.7M19 7v5h-5" />
          ) : (
            <path d="M5 7a8 8 0 1 1-1.7 8.7M5 7v5h5" />
          )}
        </svg>
      </button>
    </div>
  );
}
