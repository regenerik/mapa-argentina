"use client";

import { useCallback, useState } from "react";
import { ArgentinaMap } from "@/components/ArgentinaMap";
import { BackButton } from "@/components/BackButton";
import { FullscreenButton } from "@/components/FullscreenButton";
import { MapEditorScreen } from "@/components/MapEditorScreen";
import { PointModal } from "@/components/PointModal";
import { useMapPoints } from "@/hooks/useMapPoints";
import type { MapMode, MapPoint } from "@/types/map";

function MapViewerScreen() {
  const { points, isHydrated } = useMapPoints();
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const closePoint = useCallback(() => setSelectedPoint(null), []);

  return (
    <main className="map-screen">
      <header className="map-header">
        <BackButton />
        <div className="map-title">
          <span className="status-dot" />
          <div><p>Mapa interactivo</p><h1>Argentina productiva</h1></div>
        </div>
        <FullscreenButton />
      </header>

      <section className="map-workspace" aria-label="Mapa de la República Argentina">
        <ArgentinaMap mode="view" points={points} onPointSelect={setSelectedPoint} />
        {!isHydrated && (
          <div className="map-points-loading" role="status" aria-live="polite">
            <span className="map-loading-spinner" aria-hidden="true" />
            <strong>Cargando puntos...</strong>
          </div>
        )}
        <div className="map-hint">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 11V7a2 2 0 0 1 4 0v4-6a2 2 0 0 1 4 0v6-3a2 2 0 0 1 4 0v7c0 3.3-2.7 6-6 6h-1.2a6 6 0 0 1-4.2-1.8L4 14.6A2 2 0 0 1 6.8 12L8 13.2V11Z" /></svg>
          <span>Arrastrá para mover · Pellizcá para acercar</span>
        </div>
      </section>
      {selectedPoint && <PointModal point={selectedPoint} onClose={closePoint} />}
    </main>
  );
}

export function MapScreen({ mode }: { mode: MapMode }) {
  return mode === "edit" ? <MapEditorScreen /> : <MapViewerScreen />;
}
