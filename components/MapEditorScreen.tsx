"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminAccessGate, ADMIN_TOKEN_SESSION_KEY } from "@/components/AdminAccessGate";
import { ArgentinaMap } from "@/components/ArgentinaMap";
import { BackButton } from "@/components/BackButton";
import { FullscreenButton } from "@/components/FullscreenButton";
import { PointEditorPanel, type PointDraft, type TimelineDuration } from "@/components/PointEditorPanel";
import { useMapPoints } from "@/hooks/useMapPoints";
import { deleteCloudinaryAssets, getCloudinaryPublicId, type CloudinaryAsset } from "@/lib/cloudinary";
import { removeMapPoint, upsertMapPoint } from "@/lib/mapPointsRepository";
import type { MapPoint, MapPointImage, TimelineDay } from "@/types/map";

const TIMELINE_DAYS: TimelineDay[] = ["1", "7", "15", "30", "60", "120"];

function emptyDraft(): PointDraft {
  return { id: null, title: "", description: "", coordinates: null, thumbnailUrl: "", images: {}, imagePublicIds: {}, duration: "120" };
}

function pointToDraft(point: MapPoint): PointDraft {
  const images = Object.fromEntries(point.images.map((image) => [image.day, image.imageUrl])) as Partial<Record<TimelineDay, string>>;
  const imagePublicIds = Object.fromEntries(point.images.map((image) => [image.day, image.publicId || getCloudinaryPublicId(image.imageUrl) || undefined])) as Partial<Record<TimelineDay, string>>;
  const highestDay = Math.max(...point.images.map((image) => Number(image.day)), 30);
  const duration: TimelineDuration = highestDay <= 15 ? "15" : highestDay <= 30 ? "30" : highestDay <= 60 ? "60" : "120";
  return {
    ...point,
    thumbnailPublicId: point.thumbnailPublicId || getCloudinaryPublicId(point.thumbnailUrl) || undefined,
    images,
    imagePublicIds,
    duration,
  };
}

function draftToPoint(draft: PointDraft): MapPoint {
  const allowedDays = TIMELINE_DAYS.filter((day) => Number(day) <= Number(draft.duration));
  const images = allowedDays
    .map((day): MapPointImage | null => draft.images[day]
      ? { day, imageUrl: draft.images[day], publicId: draft.imagePublicIds[day] }
      : null)
    .filter((image): image is MapPointImage => image !== null);

  return {
    id: draft.id || `point-${crypto.randomUUID()}`,
    title: draft.title.trim(),
    description: draft.description.trim(),
    coordinates: draft.coordinates!,
    thumbnailUrl: draft.thumbnailUrl,
    thumbnailPublicId: draft.thumbnailPublicId,
    images: images.length > 0 ? images : [{ day: "1", imageUrl: draft.thumbnailUrl, publicId: draft.thumbnailPublicId }],
  };
}

function pointAssetIds(point: MapPoint): string[] {
  return [
    point.thumbnailPublicId || getCloudinaryPublicId(point.thumbnailUrl),
    ...point.images.map((image) => image.publicId || getCloudinaryPublicId(image.imageUrl)),
  ].filter((publicId): publicId is string => Boolean(publicId));
}

export function MapEditorScreen() {
  const { points } = useMapPoints();
  const [draft, setDraft] = useState<PointDraft | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [isAccessReady, setIsAccessReady] = useState(false);
  const pendingUploads = useRef(new Set<string>());
  const adminTokenRef = useRef("");

  useEffect(() => {
    const accessTimer = window.setTimeout(() => {
      const savedToken = window.sessionStorage.getItem(ADMIN_TOKEN_SESSION_KEY) || "";
      adminTokenRef.current = savedToken;
      setAdminToken(savedToken);
      setIsAccessReady(true);
    }, 0);
    return () => window.clearTimeout(accessTimer);
  }, []);

  const discardPendingUploads = useCallback(async (keepalive = false) => {
    const publicIds = [...pendingUploads.current];
    if (publicIds.length === 0 || !adminTokenRef.current) return;
    pendingUploads.current.clear();
    try {
      await deleteCloudinaryAssets(publicIds, adminTokenRef.current, keepalive);
    } catch (error) {
      if (!keepalive) publicIds.forEach((publicId) => pendingUploads.current.add(publicId));
      throw error;
    }
  }, []);

  useEffect(() => () => {
    const publicIds = [...pendingUploads.current];
    pendingUploads.current.clear();
    if (publicIds.length > 0 && adminTokenRef.current) {
      void deleteCloudinaryAssets(publicIds, adminTokenRef.current, true).catch(() => undefined);
    }
  }, []);

  const displayedPoints = useMemo(() => {
    if (!draft?.coordinates) return points;
    const preview: MapPoint = {
      id: draft.id || "draft-point",
      title: draft.title || "Nuevo punto",
      description: draft.description,
      coordinates: draft.coordinates,
      thumbnailUrl: draft.thumbnailUrl,
      images: [],
    };
    return [...points.filter((point) => point.id !== draft.id), preview];
  }, [draft, points]);

  function reportCleanupError(error: unknown) {
    setMessage(error instanceof Error ? error.message : "No se pudieron limpiar las imágenes sin guardar.");
  }

  function startNewPoint() {
    void discardPendingUploads().catch(reportCleanupError);
    setDraft(emptyDraft());
    setIsPlacing(true);
    setMessage("");
  }

  function selectPoint(point: MapPoint) {
    if (point.id === "draft-point") return;
    void discardPendingUploads().catch(reportCleanupError);
    const source = points.find((current) => current.id === point.id) || point;
    setDraft(pointToDraft(source));
    setIsPlacing(false);
    setMessage("");
  }

  function selectLocation(coordinates: [number, number]) {
    if (!draft) {
      setDraft({ ...emptyDraft(), coordinates });
      setIsPlacing(false);
      return;
    }
    if (isPlacing || !draft.coordinates) {
      setDraft({ ...draft, coordinates });
      setIsPlacing(false);
    }
  }

  async function saveDraft(nextDraft: PointDraft) {
    if (!nextDraft.coordinates || !nextDraft.thumbnailUrl) return;
    setIsSaving(true);
    setMessage("");
    try {
      const point = draftToPoint(nextDraft);
      const result = await upsertMapPoint(point, adminToken);
      const referencedIds = new Set(pointAssetIds(point));
      const unusedUploads = [...pendingUploads.current].filter((publicId) => !referencedIds.has(publicId));
      pendingUploads.current.clear();

      let cleanupWarning = "";
      try {
        await deleteCloudinaryAssets(unusedUploads, adminToken);
      } catch {
        cleanupWarning = " No se pudieron limpiar algunas imágenes descartadas.";
      }

      setDraft(pointToDraft(point));
      setIsPlacing(false);
      const savedMessage = nextDraft.id ? "Cambios guardados" : "Punto creado";
      const remoteWarning = result.warning ? ` ${result.warning}` : "";
      setMessage((result.synced ? `${savedMessage} y sincronizado.` : `${savedMessage} localmente. Google Sheets pendiente.`) + remoteWarning + cleanupWarning);
    } finally {
      setIsSaving(false);
    }
  }

  async function removePoint(pointId: string) {
    const point = points.find((current) => current.id === pointId);
    if (!window.confirm(`¿Eliminar ${point?.title || "este punto"}? Esta acción no se puede deshacer.`)) return;
    setIsSaving(true);
    try {
      const result = await removeMapPoint(pointId, adminToken);
      setDraft(null);
      setIsPlacing(false);
      const remoteWarning = result.warning ? ` ${result.warning}` : "";
      setMessage((result.synced ? "Punto eliminado y sincronizado." : "Punto eliminado localmente. Google Sheets pendiente.") + remoteWarning);
    } finally {
      setIsSaving(false);
    }
  }

  function cancelEditing() {
    void discardPendingUploads().catch(reportCleanupError);
    setDraft(null);
    setIsPlacing(false);
    setMessage("");
  }

  function authorize(token: string) {
    adminTokenRef.current = token;
    setAdminToken(token);
  }

  return (
    <main className="map-screen editor-screen">
      <header className="map-header">
        <BackButton />
        <div className="map-title">
          <span className="status-dot" />
          <div><p>Modo edición</p><h1>Edición de puntos</h1></div>
        </div>
        <FullscreenButton />
      </header>

      {!isAccessReady ? (
        <div className="admin-access-loading" role="status"><span className="map-loading-spinner" />Preparando acceso...</div>
      ) : !adminToken ? (
        <AdminAccessGate onAuthorized={authorize} />
      ) : (
        <div className="editor-layout">
          <section className="map-workspace editor-map" aria-label="Mapa editable de la República Argentina">
            <ArgentinaMap
              mode="edit"
              points={displayedPoints}
              onPointSelect={selectPoint}
              onMapSelect={selectLocation}
              selectedPointId={draft?.id || (draft?.coordinates ? "draft-point" : undefined)}
            />
            <div className={`map-hint editor-map-hint${isPlacing ? " is-active" : ""}`}>
              <span>{isPlacing ? "Tocá una provincia para ubicar el punto" : "Tocá el mapa para crear · Tocá un punto para editar"}</span>
            </div>
          </section>

          <PointEditorPanel
            points={points}
            draft={draft}
            isPlacing={isPlacing}
            isSaving={isSaving}
            message={message}
            onDraftChange={setDraft}
            onNew={startNewPoint}
            onSelect={selectPoint}
            onRelocate={() => setIsPlacing(true)}
            onAssetUploaded={(asset: CloudinaryAsset) => pendingUploads.current.add(asset.publicId)}
            onSave={saveDraft}
            onDelete={removePoint}
            onCancel={cancelEditing}
          />
        </div>
      )}
    </main>
  );
}
