"use client";

import { useCallback, useEffect, useState } from "react";
import { loadMapPoints } from "@/lib/mapPointsRepository";
import { getMapPoints, MAP_POINTS_UPDATED_EVENT } from "@/lib/mapPointsStorage";
import type { MapPoint } from "@/types/map";

export function useMapPoints() {
  const [points, setPoints] = useState<MapPoint[]>(() => getMapPoints());
  const [isHydrated, setIsHydrated] = useState(false);

  const refresh = useCallback(() => setPoints(getMapPoints()), []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const requestTimeout = window.setTimeout(() => controller.abort(), 10_000);

    async function hydrate() {
      try {
        const result = await loadMapPoints([], controller.signal);
        if (!cancelled) setPoints(result.points);
      } finally {
        window.clearTimeout(requestTimeout);
        if (!cancelled) setIsHydrated(true);
      }
    }

    void hydrate();
    window.addEventListener("storage", refresh);
    window.addEventListener(MAP_POINTS_UPDATED_EVENT, refresh);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(requestTimeout);
      window.removeEventListener("storage", refresh);
      window.removeEventListener(MAP_POINTS_UPDATED_EVENT, refresh);
    };
  }, [refresh]);

  return { points, isHydrated, refresh };
}
