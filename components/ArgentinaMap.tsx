"use client";

import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent } from "react";
import { geoArea, geoCentroid, geoContains, geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { TransformComponent, TransformWrapper, useTransformEffect, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import provincesData from "@/data/argentina-provinces.json";
import { useKioskRotation } from "@/components/KioskRotationProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { MapControls } from "@/components/MapControls";
import { MapPoint as MapPointMarker } from "@/components/MapPoint";
import { useUIScale } from "@/components/UIScaleProvider";
import { getMapResetTransform } from "@/lib/mapViewTransform";
import type { MapMode, MapPoint, ProvinceLabel } from "@/types/map";

const WIDTH = 800;
const HEIGHT = 1040;
const MIN_SCALE = 0.9;
const MAX_SCALE = 7;
const WHEEL_STEP = 0.22;

type ProvinceFeature = {
  type: "Feature";
  properties: { name: string };
  geometry: GeoJSON.Geometry;
};

function withoutAntarcticSector(feature: ProvinceFeature): ProvinceFeature {
  if (feature.properties.name !== "Tierra del Fuego" || feature.geometry.type !== "MultiPolygon") {
    return feature;
  }

  return {
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates: feature.geometry.coordinates.filter((polygon) =>
        polygon.some((ring) => ring.some(([, latitude]) => latitude > -60)),
      ),
    },
  };
}

function normalizeRingDirection(feature: ProvinceFeature): ProvinceFeature {
  if (
    feature.geometry.type !== "Polygon" ||
    geoArea(feature as unknown as GeoPermissibleObjects) <= Math.PI * 2
  ) {
    return feature;
  }

  return {
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates: feature.geometry.coordinates.map((ring) => [...ring].reverse()),
    },
  };
}

const provinces = (provincesData.features as ProvinceFeature[])
  .filter((feature) => Boolean(feature.properties.name))
  .map(withoutAntarcticSector)
  .map(normalizeRingDirection);
const mapGeometry = {
  type: "FeatureCollection",
  features: provinces,
} as unknown as GeoPermissibleObjects;
const projection = geoMercator().fitExtent([[122, 46], [678, 986]], mapGeometry);
const pathGenerator = geoPath(projection);

function projectCoordinates(coordinates: [number, number]) {
  const position = projection(coordinates);
  if (!position) return null;
  return [Number(position[0].toFixed(3)), Number(position[1].toFixed(3))] as const;
}

const labelOverrides: Record<string, Partial<ProvinceLabel>> = {
  "Buenos Aires": { coordinates: [-60.4, -36.4] },
  Cordoba: { name: "Córdoba" },
  "Entre Rios": { name: "Entre Ríos", shortName: "Entre Ríos" },
  Neuquen: { name: "Neuquén" },
  "Rio Negro": { name: "Río Negro" },
  Tucuman: { name: "Tucumán", offset: [8, -3] },
  "Tierra del Fuego": { shortName: "T. del Fuego", offset: [22, 0] },
  "Santiago del Estero": { shortName: "Sgo. del Estero" },
};

function getLabel(feature: ProvinceFeature): ProvinceLabel {
  const override = labelOverrides[feature.properties.name];
  const centroid = geoCentroid(feature as unknown as GeoPermissibleObjects) as [number, number];
  return {
    name: override?.name ?? feature.properties.name,
    shortName: override?.shortName,
    coordinates: override?.coordinates ?? centroid,
    offset: override?.offset,
  };
}

function MapPointLayer({ points, onPointSelect, selectedPointId }: { points: MapPoint[]; onPointSelect?: (point: MapPoint) => void; selectedPointId?: string }) {
  const layerRef = useRef<SVGGElement>(null);
  const { copy } = useLanguage();

  useTransformEffect(({ state }) => {
    const compensatedScale = 1 / Math.pow(state.scale, 0.82);
    layerRef.current?.querySelectorAll<SVGGElement>(".map-point-scale").forEach((marker) => {
      marker.setAttribute("transform", `scale(${compensatedScale})`);
    });
  });

  return (
    <g ref={layerRef} className="map-points" aria-label={copy.mapPoints}>
      {points.map((point) => {
        const position = projectCoordinates(point.coordinates);
        if (!position) return null;
        return <MapPointMarker key={point.id} point={point} position={position} onSelect={onPointSelect} selected={point.id === selectedPointId} />;
      })}
    </g>
  );
}

function AdaptiveLabelLayer() {
  const layerRef = useRef<SVGGElement>(null);
  const cabaPosition = projectCoordinates([-58.44, -34.61]);

  useTransformEffect(({ state }) => {
    // Labels grow only slightly with the map, remaining useful at every zoom level.
    const compensatedScale = 1 / Math.pow(state.scale, 0.78);
    layerRef.current?.querySelectorAll<SVGTextElement>("[data-label-size]").forEach((label) => {
      const baseSize = Number(label.dataset.labelSize || 11);
      label.style.fontSize = `${baseSize * compensatedScale}px`;
      label.style.strokeWidth = `${3 * compensatedScale}px`;
    });
  });

  return (
    <g ref={layerRef} className="label-layer" aria-hidden="true">
      {provinces.map((feature) => {
        const label = getLabel(feature);
        const position = projectCoordinates(label.coordinates);
        if (!position) return null;
        const [offsetX = 0, offsetY = 0] = label.offset ?? [];
        return (
          <text key={feature.properties.name} x={position[0] + offsetX} y={position[1] + offsetY} data-label-size="11">
            {label.shortName ?? label.name}
          </text>
        );
      })}
      <g className="caba-label">
        <circle cx={cabaPosition?.[0]} cy={cabaPosition?.[1]} r="4" />
        <text x={(cabaPosition?.[0] ?? 0) + 12} y={(cabaPosition?.[1] ?? 0) + 4} data-label-size="9">CABA</text>
      </g>
    </g>
  );
}

interface ArgentinaMapProps {
  mode: MapMode;
  points: MapPoint[];
  onPointSelect?: (point: MapPoint) => void;
  onMapSelect?: (coordinates: [number, number]) => void;
  selectedPointId?: string;
}

export function ArgentinaMap({ mode, points, onPointSelect, onMapSelect, selectedPointId }: ArgentinaMapProps) {
  const { copy } = useLanguage();
  const { scale: uiScale } = useUIScale();
  const { isRotated } = useKioskRotation();
  const containerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const wheelStopTimer = useRef<number | null>(null);
  const pointerStart = useRef<[number, number] | null>(null);
  const pointerMoved = useRef(false);
  const rotatedPan = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startPositionX: number;
    startPositionY: number;
    isDragging: boolean;
  } | null>(null);

  const keepCountryVisible = useCallback((ref: ReactZoomPanPinchRef) => {
    const country = containerRef.current?.querySelector<SVGGElement>(".province-layer");
    const viewport = containerRef.current?.querySelector<HTMLElement>(".map-transform-wrapper");
    if (!country || !viewport) return;

    const countryRect = country.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    const minimumVisible = 56;
    let correctionX = 0;
    let correctionY = 0;

    if (countryRect.right < viewportRect.left + minimumVisible) correctionX = viewportRect.left + minimumVisible - countryRect.right;
    if (countryRect.left > viewportRect.right - minimumVisible) correctionX = viewportRect.right - minimumVisible - countryRect.left;
    if (countryRect.bottom < viewportRect.top + minimumVisible) correctionY = viewportRect.top + minimumVisible - countryRect.bottom;
    if (countryRect.top > viewportRect.bottom - minimumVisible) correctionY = viewportRect.bottom - minimumVisible - countryRect.top;

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

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    pointerStart.current = [event.clientX, event.clientY];
    pointerMoved.current = false;
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!pointerStart.current) return;
    const distance = Math.hypot(event.clientX - pointerStart.current[0], event.clientY - pointerStart.current[1]);
    if (distance > 8) pointerMoved.current = true;
  }

  function handleMapClick(event: MouseEvent<SVGSVGElement>) {
    pointerStart.current = null;
    if (!onMapSelect || pointerMoved.current) return;

    // WebKit can omit a CSS-transformed ancestor from getScreenCTM(). Mapping the
    // rendered SVG viewport manually keeps point placement correct after zoom.
    const rect = event.currentTarget.getBoundingClientRect();
    const viewBox = event.currentTarget.viewBox.baseVal;
    if (!rect.width || !rect.height || !viewBox.width || !viewBox.height) return;
    const renderedWidth = isRotated ? rect.height : rect.width;
    const renderedHeight = isRotated ? rect.width : rect.height;
    const pointerX = isRotated ? event.clientY - rect.top : event.clientX - rect.left;
    const pointerY = isRotated ? rect.right - event.clientX : event.clientY - rect.top;
    const renderedScale = Math.min(renderedWidth / viewBox.width, renderedHeight / viewBox.height);
    const contentLeft = (renderedWidth - viewBox.width * renderedScale) / 2;
    const contentTop = (renderedHeight - viewBox.height * renderedScale) / 2;
    const svgX = viewBox.x + (pointerX - contentLeft) / renderedScale;
    const svgY = viewBox.y + (pointerY - contentTop) / renderedScale;
    const coordinates = projection.invert?.([svgX, svgY]);
    if (!coordinates || !geoContains(mapGeometry, coordinates)) return;
    onMapSelect([Number(coordinates[0].toFixed(6)), Number(coordinates[1].toFixed(6))]);
  }

  function handleRotatedPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!isRotated) return;
    if (event.pointerType === "mouse" && event.button !== 0 && event.button !== 2) return;
    if (event.target instanceof Element && event.target.closest("button, a, input, textarea, select")) return;

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
    if (!pan.isDragging && Math.hypot(deltaX, deltaY) > 4) {
      pan.isDragging = true;
      pointerMoved.current = true;
    }
    if (!pan.isDragging) return;

    event.preventDefault();
    const localDeltaX = -deltaY / uiScale;
    const localDeltaY = deltaX / uiScale;
    ref.setTransform(
      pan.startPositionX + localDeltaX,
      pan.startPositionY + localDeltaY,
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
    if (ref) keepCountryVisible(ref);
  }

  useEffect(() => {
    if (!isRotated) return;

    const resetTimer = window.setTimeout(() => {
      const ref = transformRef.current;
      const wrapper = containerRef.current?.querySelector<HTMLElement>(".map-transform-wrapper");
      if (!ref || !wrapper) return;
      const nextTransform = getMapResetTransform({
        width: wrapper.clientWidth,
        height: wrapper.clientHeight,
        isRotated: true,
        uiScale,
      });
      ref.setTransform(nextTransform.positionX, nextTransform.positionY, nextTransform.scale, 260, "easeOut");
    }, 120);

    return () => window.clearTimeout(resetTimer);
  }, [isRotated, uiScale]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || (uiScale <= 1 && !isRotated)) return;

    function handleScaledWheel(event: WheelEvent) {
      // Let trackpad/browser pinch gestures continue through the library path.
      if (event.ctrlKey) return;

      const ref = transformRef.current;
      const content = ref?.instance.contentComponent;
      if (!ref || !content) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const currentScale = ref.state.scale;
      const nextScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, currentScale + (event.deltaY < 0 ? WHEEL_STEP : -WHEEL_STEP)),
      );
      if (nextScale === currentScale) return;

      const contentRect = content.getBoundingClientRect();
      const mouseX = isRotated
        ? (event.clientY - contentRect.top) / (currentScale * uiScale)
        : (event.clientX - contentRect.left) / (currentScale * uiScale);
      const mouseY = isRotated
        ? (contentRect.right - event.clientX) / (currentScale * uiScale)
        : (event.clientY - contentRect.top) / (currentScale * uiScale);
      const scaleDifference = nextScale - currentScale;
      const nextPositionX = ref.state.positionX - mouseX * scaleDifference;
      const nextPositionY = ref.state.positionY - mouseY * scaleDifference;

      ref.setTransform(nextPositionX, nextPositionY, nextScale, 0, "linear");

      if (wheelStopTimer.current) window.clearTimeout(wheelStopTimer.current);
      wheelStopTimer.current = window.setTimeout(() => keepCountryVisible(ref), 140);
    }

    container.addEventListener("wheel", handleScaledWheel, { capture: true, passive: false });
    return () => {
      container.removeEventListener("wheel", handleScaledWheel, { capture: true });
      if (wheelStopTimer.current) window.clearTimeout(wheelStopTimer.current);
    };
  }, [isRotated, keepCountryVisible, uiScale]);

  return (
    <div
      ref={containerRef}
      className="map-container"
      data-mode={mode}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={handleRotatedPointerDown}
      onPointerMove={handleRotatedPointerMove}
      onPointerUp={handleRotatedPointerEnd}
      onPointerCancel={handleRotatedPointerEnd}
    >
      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        centerOnInit
        limitToBounds={false}
        smooth={false}
        wheel={{ step: WHEEL_STEP }}
        pinch={{ step: 5 }}
        doubleClick={{ mode: "zoomIn", step: 0.7 }}
        panning={{ disabled: isRotated, velocityDisabled: false, allowRightClickPan: true }}
        onPanningStop={keepCountryVisible}
        onZoomStop={keepCountryVisible}
        onPinchStop={keepCountryVisible}
      >
        <MapControls />
        <TransformComponent wrapperClass="map-transform-wrapper" contentClass="map-transform-content">
          <svg
            className={`argentina-map${onMapSelect ? " is-editable" : ""}`}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={copy.mapAria}
            aria-describedby="map-svg-description"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onClick={handleMapClick}
          >
            <desc id="map-svg-description">{copy.mapDescription}</desc>
            <defs>
              <linearGradient id="province-fill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#263946" />
                <stop offset=".55" stopColor="#172a33" />
                <stop offset="1" stopColor="#0f1f27" />
              </linearGradient>
              <pattern id="map-grid" width="56" height="56" patternUnits="userSpaceOnUse">
                <path d="M56 0H0V56" fill="none" stroke="#d2dabc" strokeOpacity=".035" strokeWidth="1" />
              </pattern>
            </defs>

            <rect width={WIDTH} height={HEIGHT} fill="url(#map-grid)" />
            <text className="ocean-label" x="680" y="610" transform="rotate(90 680 610)">{copy.ocean}</text>

            <g className="province-layer">
              {provinces.map((feature) => (
                <path key={feature.properties.name} d={pathGenerator(feature as unknown as GeoPermissibleObjects) ?? undefined} data-province={feature.properties.name} />
              ))}
            </g>

            <AdaptiveLabelLayer />

            <MapPointLayer points={points} onPointSelect={onPointSelect} selectedPointId={selectedPointId} />
          </svg>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
