import type { MapPoint } from "@/types/map";

const STORAGE_KEY = "argentina-map-points-v3";
export const MAP_POINTS_UPDATED_EVENT = "map-points-updated";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function normalizePoint(point: MapPoint): MapPoint {
  const images = Array.isArray(point.images) ? point.images.filter((image) => image.imageUrl) : [];
  return {
    ...point,
    images: images.length > 0 || !point.thumbnailUrl
      ? images
      : [{ day: "1", imageUrl: point.thumbnailUrl }],
  };
}

function notifySubscribers() {
  window.dispatchEvent(new CustomEvent(MAP_POINTS_UPDATED_EVENT));
}

export function getMapPoints(): MapPoint[] {
  if (!canUseStorage()) return [];

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) return [];
    const parsed = JSON.parse(stored) as MapPoint[];
    return Array.isArray(parsed) ? parsed.map(normalizePoint) : [];
  } catch {
    return [];
  }
}

export function initializeMapPoints(defaultPoints: MapPoint[]): MapPoint[] {
  if (!canUseStorage()) return defaultPoints;
  if (window.localStorage.getItem(STORAGE_KEY) !== null) return getMapPoints();
  saveMapPoints(defaultPoints);
  return defaultPoints.map(normalizePoint);
}

export function saveMapPoints(points: MapPoint[]): MapPoint[] {
  const normalized = points.map(normalizePoint);
  if (!canUseStorage()) return normalized;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  notifySubscribers();
  return normalized;
}

export function createMapPoint(point: MapPoint): MapPoint[] {
  return saveMapPoints([...getMapPoints(), normalizePoint(point)]);
}

export function updateMapPoint(point: MapPoint): MapPoint[] {
  return saveMapPoints(getMapPoints().map((current) => current.id === point.id ? normalizePoint(point) : current));
}

export function deleteMapPoint(pointId: string): MapPoint[] {
  return saveMapPoints(getMapPoints().filter((point) => point.id !== pointId));
}
