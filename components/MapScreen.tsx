"use client";

import { useCallback, useState } from "react";
import { ArgentinaMap } from "@/components/ArgentinaMap";
import { BackButton } from "@/components/BackButton";
import { FullscreenButton } from "@/components/FullscreenButton";
import { useLanguage } from "@/components/LanguageProvider";
import { MapFilterControls } from "@/components/MapFilterControls";
import { filterMapPoints, hasActiveFilters, MapFiltersPanel } from "@/components/MapFiltersPanel";
import { MapEditorScreen } from "@/components/MapEditorScreen";
import { PointModal } from "@/components/PointModal";
import { useMapPoints } from "@/hooks/useMapPoints";
import type { MapFilters, MapMode, MapPoint } from "@/types/map";

function MapViewerScreen() {
  const { copy } = useLanguage();
  const { points, catalog, isHydrated } = useMapPoints();
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<MapFilters>({ targetWeeds: [], provinces: [] });
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const closePoint = useCallback(() => setSelectedPoint(null), []);
  const visiblePoints = catalog.filtersEnabled ? filterMapPoints(points, appliedFilters) : points;

  function clearFilters() {
    if (!hasActiveFilters(appliedFilters)) return;
    if (!window.confirm(copy.clearFiltersConfirm)) return;
    setAppliedFilters({ targetWeeds: [], provinces: [] });
  }

  return (
    <main className="map-screen">
      <header className="map-header">
        <BackButton />
        <div className="map-title">
          <span className="status-dot" />
          <div><p>{copy.interactiveMap}</p><h1>{copy.productiveArgentina}</h1></div>
        </div>
        <FullscreenButton />
      </header>

      <section className="map-workspace" aria-label={copy.mapAria}>
        <ArgentinaMap mode="view" points={visiblePoints} onPointSelect={setSelectedPoint} />
        {catalog.filtersEnabled && (
          <>
            <MapFilterControls filters={appliedFilters} onOpen={() => setIsFilterPanelOpen(true)} onClear={clearFilters} />
            {isFilterPanelOpen && (
              <MapFiltersPanel
                points={points}
                targetWeeds={catalog.targetWeeds}
                appliedFilters={appliedFilters}
                onCancel={() => setIsFilterPanelOpen(false)}
                onConfirm={(filters) => {
                  setAppliedFilters(filters);
                  setIsFilterPanelOpen(false);
                }}
              />
            )}
          </>
        )}
        {!isHydrated && (
          <div className="map-points-loading" role="status" aria-live="polite">
            <span className="map-loading-spinner" aria-hidden="true" />
            <strong>{copy.loadingPoints}</strong>
          </div>
        )}
        <div className="map-hint">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 11V7a2 2 0 0 1 4 0v4-6a2 2 0 0 1 4 0v6-3a2 2 0 0 1 4 0v7c0 3.3-2.7 6-6 6h-1.2a6 6 0 0 1-4.2-1.8L4 14.6A2 2 0 0 1 6.8 12L8 13.2V11Z" /></svg>
          <span>{copy.mapHint}</span>
        </div>
      </section>
      {selectedPoint && <PointModal point={selectedPoint} onClose={closePoint} />}
    </main>
  );
}

export function MapScreen({ mode }: { mode: MapMode }) {
  return mode === "edit" ? <MapEditorScreen /> : <MapViewerScreen />;
}
