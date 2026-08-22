import type { MapCatalog, MapPoint, MapPointImage } from "@/types/map";

const STORAGE_KEY = "argentina-map-points-v3";
const CATALOG_STORAGE_KEY = "argentina-map-catalog-v1";
export const MAP_POINTS_UPDATED_EVENT = "map-points-updated";
export const MAP_CATALOG_UPDATED_EVENT = "map-catalog-updated";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function normalizeImage(image: Partial<MapPointImage>, index: number): MapPointImage | null {
  if (!image?.imageUrl) return null;
  const parsedDay = Number(image.daysFromBase ?? image.day ?? index);
  const daysFromBase = Number.isFinite(parsedDay) && parsedDay >= 0 ? parsedDay : index;
  return {
    day: String(daysFromBase),
    daysFromBase,
    title: image.title ? String(image.title) : "",
    imageUrl: image.imageUrl,
    publicId: image.publicId,
    isBase: Boolean(image.isBase),
    previewPosition: normalizePreviewSettings(image.previewPosition),
  };
}

function normalizePreviewPosition(position: unknown) {
  if (!position || typeof position !== "object") return undefined;
  const source = position as { x?: unknown; y?: unknown; zoom?: unknown };
  const x = Number(source.x);
  const y = Number(source.y);
  const zoom = Number(source.zoom);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(zoom)) return undefined;
  return {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
    zoom: Math.min(2.6, Math.max(1, zoom)),
  };
}

function normalizePreviewSettings(settings: unknown): MapPointImage["previewPosition"] {
  if (!settings || typeof settings !== "object") return undefined;
  const source = settings as { desktop?: unknown; mobile?: unknown };
  const desktop = normalizePreviewPosition(source.desktop);
  const mobile = normalizePreviewPosition(source.mobile);
  if (!desktop && !mobile) return undefined;
  return { desktop, mobile };
}

function normalizeImages(point: MapPoint): MapPointImage[] {
  const images = (Array.isArray(point.images) ? point.images : [])
    .map(normalizeImage)
    .filter((image): image is MapPointImage => image !== null)
    .sort((a, b) => a.daysFromBase - b.daysFromBase);

  if (!point.thumbnailUrl) return images;

  const thumbnailIndex = images.findIndex((image) => image.imageUrl === point.thumbnailUrl);
  if (thumbnailIndex >= 0) {
    images[thumbnailIndex] = { ...images[thumbnailIndex], publicId: images[thumbnailIndex].publicId || point.thumbnailPublicId, isBase: true };
    return images.sort((a, b) => a.daysFromBase - b.daysFromBase);
  }

  return [
    { day: "0", daysFromBase: 0, title: "", imageUrl: point.thumbnailUrl, publicId: point.thumbnailPublicId, isBase: true },
    ...images,
  ];
}

export function normalizePoint(point: MapPoint): MapPoint {
  const images = normalizeImages(point);
  return {
    ...point,
    targetWeeds: Array.isArray(point.targetWeeds) ? point.targetWeeds.filter(Boolean).map(String) : [],
    province: point.province ? String(point.province) : "",
    locality: point.locality ? String(point.locality) : "",
    advisor: point.advisor ? String(point.advisor) : "",
    dose: point.dose ? String(point.dose) : "",
    images,
  };
}

function notifyPointSubscribers() {
  window.dispatchEvent(new CustomEvent(MAP_POINTS_UPDATED_EVENT));
}

function notifyCatalogSubscribers() {
  window.dispatchEvent(new CustomEvent(MAP_CATALOG_UPDATED_EVENT));
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
  notifyPointSubscribers();
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

export function getMapCatalog(): MapCatalog {
  if (!canUseStorage()) return { targetWeeds: [], filtersEnabled: false };

  try {
    const stored = window.localStorage.getItem(CATALOG_STORAGE_KEY);
    if (!stored) return { targetWeeds: [], filtersEnabled: false };
    const parsed = JSON.parse(stored) as Partial<MapCatalog>;
    return {
      targetWeeds: Array.isArray(parsed.targetWeeds) ? parsed.targetWeeds.filter(Boolean).map(String) : [],
      filtersEnabled: Boolean(parsed.filtersEnabled),
    };
  } catch {
    return { targetWeeds: [], filtersEnabled: false };
  }
}

export function saveMapCatalog(catalog: Partial<MapCatalog>): MapCatalog {
  const normalized = {
    targetWeeds: Array.isArray(catalog.targetWeeds) ? catalog.targetWeeds.filter(Boolean).map(String) : [],
    filtersEnabled: Boolean(catalog.filtersEnabled),
  };
  if (!canUseStorage()) return normalized;
  window.localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(normalized));
  notifyCatalogSubscribers();
  return normalized;
}
