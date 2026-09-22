"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { ADMIN_TOKEN_SESSION_KEY } from "@/components/AdminAccessGate";
import { ArgentinaMap } from "@/components/ArgentinaMap";
import { BackButton } from "@/components/BackButton";
import { FullscreenButton } from "@/components/FullscreenButton";
import { KioskRotationButton } from "@/components/KioskRotationButton";
import { KioskRotationProvider } from "@/components/KioskRotationProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { MapFilterControls } from "@/components/MapFilterControls";
import { filterMapPoints, MapFiltersPanel } from "@/components/MapFiltersPanel";
import { MapEditorScreen } from "@/components/MapEditorScreen";
import { PointModal } from "@/components/PointModal";
import { UIScaleRoot } from "@/components/UIScaleProvider";
import { useMapPoints } from "@/hooks/useMapPoints";
import type { MapFilters, MapMode, MapPoint } from "@/types/map";

function subscribeToAdminSession(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getAdminSessionSnapshot() {
  try {
    return typeof window !== "undefined" && Boolean(window.sessionStorage.getItem(ADMIN_TOKEN_SESSION_KEY));
  } catch {
    return false;
  }
}

function MapViewerScreen() {
  const { copy } = useLanguage();
  const { points, catalog, isHydrated } = useMapPoints();
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<MapFilters>({ targetWeeds: [], provinces: [], localities: [] });
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);
  const hasAdminSession = useSyncExternalStore(subscribeToAdminSession, getAdminSessionSnapshot, () => false);
  const closePoint = useCallback(() => setSelectedPoint(null), []);
  const visiblePoints = catalog.filtersEnabled ? filterMapPoints(points, appliedFilters) : points;

  return (
    <main className="map-screen">
      <header className="map-header">
        {hasAdminSession ? <BackButton /> : <span className="map-header-spacer" aria-hidden="true" />}
        <div className="map-title">
          <div>
            <p className="map-title-eyebrow">{copy.interactiveMap}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="map-title-brand map-title-brand-empera" src="/brand/empera-logo-blanco-full.png" alt="Empera" draggable={false} />
          </div>
        </div>
        <div className="map-header-actions">
          <KioskRotationButton />
          <FullscreenButton />
        </div>
      </header>

      <section className="map-workspace" aria-label={copy.mapAria}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="map-workspace-brand" src="/brand/sumitomo-logo-horizontal-neg.png" alt="Sumitomo Chemical" draggable={false} />
        <ArgentinaMap
          mode="view"
          points={visiblePoints}
          leadingControl={catalog.filtersEnabled ? (
            <MapFilterControls filters={appliedFilters} onOpen={() => setIsFilterPanelOpen(true)} />
          ) : undefined}
          onPointSelect={setSelectedPoint}
        />
        {catalog.filtersEnabled && (
          <>
            {isFilterPanelOpen && (
              <MapFiltersPanel
                points={points}
                targetWeeds={catalog.targetWeeds}
                appliedFilters={appliedFilters}
                onCancel={() => setIsFilterPanelOpen(false)}
                onChange={(filters) => {
                  setAppliedFilters(filters);
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
  return (
    <UIScaleRoot>
      <KioskRotationProvider>
        {mode === "edit" ? <MapEditorScreen /> : <MapViewerScreen />}
      </KioskRotationProvider>
    </UIScaleRoot>
  );
}
