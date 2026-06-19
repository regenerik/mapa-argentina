import { callGoogleAppsScript } from "@/lib/googleAppsScript";
import { getMapPoints, initializeMapPoints, saveMapPoints } from "@/lib/mapPointsStorage";
import type { MapPoint } from "@/types/map";

export interface PersistenceResult {
  points: MapPoint[];
  synced: boolean;
  error?: string;
  warning?: string;
}

async function remoteRequest(body: Record<string, unknown>, adminToken?: string) {
  return callGoogleAppsScript({ ...body, token: adminToken });
}

export async function loadMapPoints(defaultPoints: MapPoint[], signal?: AbortSignal): Promise<PersistenceResult> {
  const localPoints = initializeMapPoints(defaultPoints);
  try {
    const result = await callGoogleAppsScript({ action: "list" }, { signal });
    if (!Array.isArray(result.points)) throw new Error("Respuesta remota inválida.");
    return { points: saveMapPoints(result.points as MapPoint[]), synced: true };
  } catch (error) {
    return { points: localPoints, synced: false, error: error instanceof Error ? error.message : undefined };
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
  const points = saveMapPoints(getMapPoints().filter((point) => point.id !== pointId));
  try {
    const result = await remoteRequest({ action: "delete", id: pointId }, adminToken);
    return { points, synced: true, warning: result.warning };
  } catch (error) {
    return { points, synced: false, error: error instanceof Error ? error.message : undefined };
  }
}
