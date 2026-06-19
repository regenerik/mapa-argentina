"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { MapPointImage } from "@/types/map";

interface TimelineSliderProps {
  images: MapPointImage[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export function TimelineSlider({ images, selectedIndex, onChange }: TimelineSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastIndex = Math.max(images.length - 1, 0);
  const progress = lastIndex === 0 ? 0 : (selectedIndex / lastIndex) * 100;

  function selectIndex(index: number) {
    const boundedIndex = Math.max(0, Math.min(index, lastIndex));
    onChange(boundedIndex);
  }

  function selectFromPosition(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    selectIndex(Math.round(ratio * lastIndex));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    selectFromPosition(event.clientX);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (isDragging) selectFromPosition(event.clientX);
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      selectIndex(selectedIndex - 1);
    }
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      selectIndex(selectedIndex + 1);
    }
    if (event.key === "Home") selectIndex(0);
    if (event.key === "End") selectIndex(lastIndex);
  }

  return (
    <div className="timeline" aria-label="Evolución temporal">
      <div className="timeline-heading">
        <span>Evolución del cultivo</span>
        <strong>Día {images[selectedIndex].day}</strong>
      </div>
      <div
        ref={trackRef}
        className={`timeline-track${isDragging ? " is-dragging" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <div className="timeline-line" />
        <div className="timeline-progress" style={{ width: `${progress}%` }} />
        {images.map((image, index) => {
          const left = lastIndex === 0 ? 0 : (index / lastIndex) * 100;
          return (
            <span
              key={image.day}
              className={`timeline-mark${index <= selectedIndex ? " is-past" : ""}`}
              style={{ left: `${left}%` }}
              aria-hidden="true"
            />
          );
        })}
        <button
          className="timeline-handle"
          type="button"
          role="slider"
          aria-label="Día de la evolución"
          aria-valuemin={0}
          aria-valuemax={lastIndex}
          aria-valuenow={selectedIndex}
          aria-valuetext={`Día ${images[selectedIndex].day}`}
          onKeyDown={handleKeyDown}
          style={{ left: `${progress}%` }}
        />
      </div>
      <div className="timeline-endpoints" aria-hidden="true">
        <span>Día {images[0].day}</span>
        {images.length > 1 && <span>Día {images[lastIndex].day}</span>}
      </div>
    </div>
  );
}
