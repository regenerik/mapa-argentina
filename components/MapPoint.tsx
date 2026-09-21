"use client";

import type { KeyboardEvent, PointerEvent } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { getRotatedImageUrl } from "@/lib/imageRotation";
import type { MapPoint as MapPointData } from "@/types/map";

interface MapPointProps {
  point: MapPointData;
  position: readonly [number, number];
  onSelect?: (point: MapPointData) => void;
  selected?: boolean;
}

export function MapPoint({ point, position, onSelect, selected = false }: MapPointProps) {
  const { copy } = useLanguage();
  const isInteractive = Boolean(onSelect);
  const clipId = `point-clip-${point.id}`;
  const thumbnailImage = point.images.find((image) => image.isBase || image.imageUrl === point.thumbnailUrl) || point.images[0];
  const thumbnailUrl = getRotatedImageUrl(point.thumbnailUrl, thumbnailImage?.rotation);

  function selectPoint() {
    onSelect?.(point);
  }

  function handleKeyDown(event: KeyboardEvent<SVGGElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectPoint();
    }
  }

  function stopMapPan(event: PointerEvent<SVGGElement>) {
    if (isInteractive) event.stopPropagation();
  }

  return (
    <g
      className={`map-point-anchor${isInteractive ? " is-interactive" : ""}${selected ? " is-selected" : ""}${point.id === "draft-point" ? " is-draft" : ""}`}
      transform={`translate(${position[0]} ${position[1]})`}
      data-point-id={point.id}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={isInteractive ? `${copy.viewPoint} ${point.title}` : undefined}
      onPointerDown={stopMapPan}
      onClick={(event) => {
        event.stopPropagation();
        selectPoint();
      }}
      onKeyDown={handleKeyDown}
    >
      <defs>
        <clipPath id={clipId}><circle r="25" /></clipPath>
      </defs>
      <g className="map-point-scale">
        <circle className="map-point-glow" r="34" />
        <circle className="map-point-base" r="28" />
        {thumbnailUrl && <image href={thumbnailUrl} x="-25" y="-25" width="50" height="50" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} />}
        <circle className="map-point-ring" r="27" />
        <text y="44">{point.title}</text>
      </g>
    </g>
  );
}
