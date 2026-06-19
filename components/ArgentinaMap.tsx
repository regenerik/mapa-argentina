"use client";

import { useRef, type MouseEvent, type PointerEvent } from "react";
import { geoArea, geoCentroid, geoContains, geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { TransformComponent, TransformWrapper, useTransformEffect, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import provincesData from "@/data/argentina-provinces.json";
import { MapControls } from "@/components/MapControls";
import { MapPoint as MapPointMarker } from "@/components/MapPoint";
import type { MapMode, MapPoint, ProvinceLabel } from "@/types/map";

const WIDTH = 800;
const HEIGHT = 1040;

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

  useTransformEffect(({ state }) => {
    const compensatedScale = 1 / Math.pow(state.scale, 0.82);
    layerRef.current?.querySelectorAll<SVGGElement>(".map-point-scale").forEach((marker) => {
      marker.setAttribute("transform", `scale(${compensatedScale})`);
    });
  });

  return (
    <g ref={layerRef} className="map-points" aria-label="Puntos del mapa">
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
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<[number, number] | null>(null);
  const pointerMoved = useRef(false);

  function keepCountryVisible(ref: ReactZoomPanPinchRef) {
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
      ref.setTransform(
        ref.state.positionX + correctionX,
        ref.state.positionY + correctionY,
        ref.state.scale,
        180,
        "easeOut",
      );
    }
  }

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

    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return;
    const svgPoint = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const coordinates = projection.invert?.([svgPoint.x, svgPoint.y]);
    if (!coordinates || !geoContains(mapGeometry, coordinates)) return;
    onMapSelect([Number(coordinates[0].toFixed(6)), Number(coordinates[1].toFixed(6))]);
  }

  return (
    <div ref={containerRef} className="map-container" data-mode={mode} onContextMenu={(event) => event.preventDefault()}>
      <TransformWrapper
        initialScale={1}
        minScale={0.9}
        maxScale={7}
        centerOnInit
        limitToBounds={false}
        smooth={false}
        wheel={{ step: 0.22 }}
        pinch={{ step: 5 }}
        doubleClick={{ mode: "zoomIn", step: 0.7 }}
        panning={{ velocityDisabled: false, allowRightClickPan: true }}
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
            aria-labelledby="map-svg-title map-svg-description"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onClick={handleMapClick}
          >
            <title id="map-svg-title">Mapa político de Argentina</title>
            <desc id="map-svg-description">Mapa interactivo con las provincias argentinas y sus nombres.</desc>
            <defs>
              <linearGradient id="province-fill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#1687b7" />
                <stop offset="1" stopColor="#075678" />
              </linearGradient>
              <filter id="country-shadow" x="-30%" y="-20%" width="160%" height="150%">
                <feDropShadow dx="0" dy="14" stdDeviation="18" floodColor="#000817" floodOpacity=".7" />
              </filter>
              <pattern id="map-grid" width="56" height="56" patternUnits="userSpaceOnUse">
                <path d="M56 0H0V56" fill="none" stroke="#5ea8c8" strokeOpacity=".07" strokeWidth="1" />
              </pattern>
            </defs>

            <rect width={WIDTH} height={HEIGHT} fill="url(#map-grid)" />
            <text className="ocean-label" x="680" y="610" transform="rotate(90 680 610)">OCÉANO ATLÁNTICO SUR</text>

            <g className="province-layer" filter="url(#country-shadow)">
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
