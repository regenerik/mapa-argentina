import { getMapPoints, initializeMapPoints, saveMapPoints } from "@/lib/mapPointsStorage";
import type { MapPoint } from "@/types/map";

export interface PersistenceResult {
  points: MapPoint[];
  synced: boolean;
  error?: string;
}

async function remoteRequest(body: Record<string, unknown>) {
  const response = await fetch("/api/map-points", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json() as { error?: string };
  if (!response.ok) throw new Error(result.error || "No se pudo sincronizar con Google Sheets.");
}

export async function loadMapPoints(defaultPoints: MapPoint[], signal?: AbortSignal): Promise<PersistenceResult> {
  const localPoints = initializeMapPoints(defaultPoints);
  try {
    const response = await fetch("/api/map-points", { cache: "no-store", signal });
    const result = await response.json() as { points?: MapPoint[]; error?: string };
    if (!response.ok || !Array.isArray(result.points)) throw new Error(result.error || "Respuesta remota inválida.");
    return { points: saveMapPoints(result.points), synced: true };
  } catch (error) {
    return { points: localPoints, synced: false, error: error instanceof Error ? error.message : undefined };
  }
}

export async function upsertMapPoint(point: MapPoint): Promise<PersistenceResult> {
  const points = saveMapPoints([...getMapPoints().filter((current) => current.id !== point.id), point]);
  try {
    await remoteRequest({ action: "upsert", point });
    return { points, synced: true };
  } catch (error) {
    return { points, synced: false, error: error instanceof Error ? error.message : undefined };
  }
}

export async function removeMapPoint(pointId: string): Promise<PersistenceResult> {
  const points = saveMapPoints(getMapPoints().filter((point) => point.id !== pointId));
  try {
    await remoteRequest({ action: "delete", id: pointId });
    return { points, synced: true };
  } catch (error) {
    return { points, synced: false, error: error instanceof Error ? error.message : undefined };
  }
}
