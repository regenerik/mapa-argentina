"use client";

import { useCallback, useEffect, useState } from "react";
import { loadMapPoints } from "@/lib/mapPointsRepository";
import { getMapCatalog, getMapPoints, MAP_CATALOG_UPDATED_EVENT, MAP_POINTS_UPDATED_EVENT } from "@/lib/mapPointsStorage";
import type { MapCatalog, MapPoint } from "@/types/map";

export function useMapPoints() {
  const [points, setPoints] = useState<MapPoint[]>(() => getMapPoints());
  const [catalog, setCatalog] = useState<MapCatalog>(() => getMapCatalog());
  const [isHydrated, setIsHydrated] = useState(false);

  const refresh = useCallback(() => setPoints(getMapPoints()), []);
  const refreshCatalog = useCallback(() => setCatalog(getMapCatalog()), []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const requestTimeout = window.setTimeout(() => controller.abort(), 10_000);

    async function hydrate() {
      try {
        const result = await loadMapPoints([], controller.signal);
        if (!cancelled) {
          setPoints(result.points);
          if (result.catalog) setCatalog(result.catalog);
        }
      } finally {
        window.clearTimeout(requestTimeout);
        if (!cancelled) setIsHydrated(true);
      }
    }

    void hydrate();
    window.addEventListener("storage", refresh);
    window.addEventListener("storage", refreshCatalog);
    window.addEventListener(MAP_POINTS_UPDATED_EVENT, refresh);
    window.addEventListener(MAP_CATALOG_UPDATED_EVENT, refreshCatalog);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(requestTimeout);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("storage", refreshCatalog);
      window.removeEventListener(MAP_POINTS_UPDATED_EVENT, refresh);
      window.removeEventListener(MAP_CATALOG_UPDATED_EVENT, refreshCatalog);
    };
  }, [refresh, refreshCatalog]);

  return { points, catalog, isHydrated, refresh };
}
