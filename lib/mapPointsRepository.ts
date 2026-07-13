import { callGoogleAppsScript } from "@/lib/googleAppsScript";
import {
  getMapCatalog,
  getMapPoints,
  initializeMapPoints,
  saveMapCatalog,
  saveMapPoints,
} from "@/lib/mapPointsStorage";
import type { MapCatalog, MapPoint } from "@/types/map";

export interface PersistenceResult {
  points: MapPoint[];
  synced: boolean;
  error?: string;
  warning?: string;
  catalog?: MapCatalog;
}

async function remoteRequest(body: Record<string, unknown>, adminToken?: string) {
  return callGoogleAppsScript({ ...body, token: adminToken });
}

function responseCatalog(result: { targetWeeds?: unknown[]; filtersEnabled?: boolean }, fallback: MapCatalog): MapCatalog {
  return {
    targetWeeds: Array.isArray(result.targetWeeds) ? result.targetWeeds.map(String) : fallback.targetWeeds,
    filtersEnabled: typeof result.filtersEnabled === "boolean" ? result.filtersEnabled : fallback.filtersEnabled,
  };
}

export async function loadMapPoints(defaultPoints: MapPoint[], signal?: AbortSignal): Promise<PersistenceResult> {
  const localPoints = initializeMapPoints(defaultPoints);
  const localCatalog = getMapCatalog();
  try {
    const result = await callGoogleAppsScript({ action: "list" }, { signal });
    if (!Array.isArray(result.points)) throw new Error("Respuesta remota invalida.");
    const catalog = saveMapCatalog(responseCatalog(result, localCatalog));
    return { points: saveMapPoints(result.points as MapPoint[]), synced: true, catalog };
  } catch (error) {
    return { points: localPoints, synced: false, error: error instanceof Error ? error.message : undefined, catalog: localCatalog };
  }
}

export async function verifyAdminToken(adminToken: string): Promise<void> {
  await remoteRequest({ action: "authorize" }, adminToken);
}

export async function upsertMapPoint(point: MapPoint, adminToken: string): Promise<PersistenceResult> {
  const points = saveMapPoints([...getMapPoints().filter((current) => current.id !== point.id), point]);
  try {
    const result = await remoteRequest({ action: "upsert", point }, adminToken);
    return { points, synced: true, warning: result.warning };
  } catch (error) {
    return { points, synced: false, error: error instanceof Error ? error.message : undefined };
  }
}

export async function removeMapPoint(pointId: string, adminToken: string): Promise<PersistenceResult> {
  const currentPoints = getMapPoints();
  try {
    const result = await remoteRequest({ action: "delete", id: pointId }, adminToken);
    const points = saveMapPoints(currentPoints.filter((point) => point.id !== pointId));
    return { points, synced: true, warning: result.warning };
  } catch (error) {
    return { points: currentPoints, synced: false, error: error instanceof Error ? error.message : undefined };
  }
}

export async function updateFiltersEnabled(filtersEnabled: boolean, adminToken: string): Promise<MapCatalog> {
  const localCatalog = saveMapCatalog({ ...getMapCatalog(), filtersEnabled });
  try {
    const result = await remoteRequest({ action: "setFiltersEnabled", filtersEnabled }, adminToken);
    return saveMapCatalog(responseCatalog(result, localCatalog));
  } catch {
    return localCatalog;
  }
}
