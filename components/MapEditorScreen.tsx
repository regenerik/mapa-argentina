"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminAccessGate, ADMIN_TOKEN_SESSION_KEY } from "@/components/AdminAccessGate";
import { ArgentinaMap } from "@/components/ArgentinaMap";
import { BackButton } from "@/components/BackButton";
import { FullscreenButton } from "@/components/FullscreenButton";
import { KioskRotationButton } from "@/components/KioskRotationButton";
import { useLanguage } from "@/components/LanguageProvider";
import { PointEditorPanel, type PhotoDraft, type PointDraft } from "@/components/PointEditorPanel";
import { useMapPoints } from "@/hooks/useMapPoints";
import { deleteCloudinaryAssets, getCloudinaryPublicId, type CloudinaryAsset } from "@/lib/cloudinary";
import { removeMapPoint, updateFiltersEnabled, upsertMapPoint, verifyAdminToken } from "@/lib/mapPointsRepository";
import type { MapPoint, MapPointImage } from "@/types/map";

function newPhoto(isBase = false): PhotoDraft {
  return { id: `photo-${crypto.randomUUID()}`, imageUrl: "", publicId: undefined, daysFromBase: isBase ? "0" : "", isBase };
}

function basePhotos(): PhotoDraft[] {
  return [newPhoto(true), newPhoto(), newPhoto(), newPhoto()];
}

function emptyDraft(): PointDraft {
  return {
    id: null,
    title: "",
    description: "",
    coordinates: null,
    thumbnailUrl: "",
    thumbnailPublicId: undefined,
    photos: basePhotos(),
    targetWeeds: [],
    province: "",
    locality: "",
    advisor: "",
    dose: "",
  };
}

function pointToDraft(point: MapPoint): PointDraft {
  const sortedImages = [...point.images].sort((a, b) => a.daysFromBase - b.daysFromBase);
  const photos = sortedImages.length > 0
    ? sortedImages.map((image, index) => ({
      id: `photo-${point.id}-${index}-${image.daysFromBase}`,
      imageUrl: image.imageUrl,
      publicId: image.publicId || getCloudinaryPublicId(image.imageUrl) || undefined,
      daysFromBase: String(image.daysFromBase),
      isBase: index === 0,
    }))
    : [{
      id: `photo-${point.id}-base`,
      imageUrl: point.thumbnailUrl,
      publicId: point.thumbnailPublicId || getCloudinaryPublicId(point.thumbnailUrl) || undefined,
      daysFromBase: "0",
      isBase: true,
    }];

  return {
    id: point.id,
    title: point.title,
    description: point.description,
    coordinates: point.coordinates,
    thumbnailUrl: point.thumbnailUrl,
    thumbnailPublicId: point.thumbnailPublicId || getCloudinaryPublicId(point.thumbnailUrl) || undefined,
    photos,
    targetWeeds: point.targetWeeds || [],
    province: point.province || "",
    locality: point.locality || "",
    advisor: point.advisor || "",
    dose: point.dose || "",
  };
}

function draftToPoint(draft: PointDraft): MapPoint {
  const photos = draft.photos
    .map((photo, index) => ({
      ...photo,
      daysFromBase: index === 0 ? "0" : photo.daysFromBase,
    }))
    .filter((photo) => photo.imageUrl);

  const images = photos
    .map((photo): MapPointImage => {
      const daysFromBase = Math.max(0, Math.round(Number(photo.daysFromBase) || 0));
      return {
        day: String(daysFromBase),
        daysFromBase,
        imageUrl: photo.imageUrl,
        publicId: photo.publicId,
      };
    })
    .sort((a, b) => a.daysFromBase - b.daysFromBase);

  const baseImage = images[0];

  return {
    id: draft.id || `point-${crypto.randomUUID()}`,
    title: draft.title.trim(),
    description: draft.description.trim(),
    coordinates: draft.coordinates!,
    thumbnailUrl: baseImage.imageUrl,
    thumbnailPublicId: baseImage.publicId,
    images,
    targetWeeds: draft.targetWeeds,
    province: draft.province,
    locality: draft.locality.trim(),
    advisor: draft.advisor.trim(),
    dose: draft.dose.trim(),
  };
}

function pointAssetIds(point: MapPoint): string[] {
  return [
    point.thumbnailPublicId || getCloudinaryPublicId(point.thumbnailUrl),
    ...point.images.map((image) => image.publicId || getCloudinaryPublicId(image.imageUrl)),
  ].filter((publicId): publicId is string => Boolean(publicId));
}

export function MapEditorScreen() {
  const { copy } = useLanguage();
  const { points, catalog } = useMapPoints();
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
      if (!savedToken) {
        setIsAccessReady(true);
        return;
      }
      void verifyAdminToken(savedToken)
        .then(() => {
          adminTokenRef.current = savedToken;
          setAdminToken(savedToken);
        })
        .catch(() => {
          window.sessionStorage.removeItem(ADMIN_TOKEN_SESSION_KEY);
          adminTokenRef.current = "";
          setAdminToken("");
        })
        .finally(() => setIsAccessReady(true));
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
      title: draft.title || copy.draftPoint,
      description: draft.description,
      coordinates: draft.coordinates,
      thumbnailUrl: draft.thumbnailUrl,
      thumbnailPublicId: draft.thumbnailPublicId,
      images: draft.thumbnailUrl
        ? [{ day: "0", daysFromBase: 0, imageUrl: draft.thumbnailUrl, publicId: draft.thumbnailPublicId }]
        : [],
      targetWeeds: draft.targetWeeds,
      province: draft.province,
      locality: draft.locality,
      advisor: draft.advisor,
      dose: draft.dose,
    };
    return [...points.filter((point) => point.id !== draft.id), preview];
  }, [copy.draftPoint, draft, points]);

  function reportCleanupError(error: unknown) {
    setMessage(error instanceof Error ? error.message : copy.cleanupFailed);
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
        cleanupWarning = ` ${copy.discardedCleanupWarning}`;
      }

      setDraft(pointToDraft(point));
      setIsPlacing(false);
      const savedMessage = nextDraft.id ? copy.changesSaved : copy.pointCreated;
      const remoteWarning = result.warning ? ` ${result.warning}` : "";
      const saveStatus = result.synced
        ? `${savedMessage} ${copy.synced}`
        : `${savedMessage} ${copy.localOnly} Apps Script: ${result.error || copy.noConnection}.`;
      setMessage(saveStatus + remoteWarning + cleanupWarning);
    } finally {
      setIsSaving(false);
    }
  }

  async function removePoint(pointId: string) {
    const point = points.find((current) => current.id === pointId);
    if (!window.confirm(`${copy.deleteConfirmStart} ${point?.title || copy.deleteConfirmFallback}? ${copy.deleteConfirmEnd}`)) return;
    setIsSaving(true);
    try {
      const result = await removeMapPoint(pointId, adminToken);
      if (!result.synced) {
        setMessage(`${copy.deleteFailed} Apps Script: ${result.error || copy.noConnection}.`);
        return;
      }
      setDraft(null);
      setIsPlacing(false);
      const remoteWarning = result.warning ? ` ${result.warning}` : "";
      setMessage(copy.pointDeleted + remoteWarning);
    } finally {
      setIsSaving(false);
    }
  }

  async function changeFiltersEnabled(enabled: boolean) {
    setMessage("");
    await updateFiltersEnabled(enabled, adminToken);
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
          <div>
            <p>{copy.editMode}</p>
            <h1>{copy.pointEditing}</h1>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="map-title-logo" src="/brand/sumitomo-logo-neg.png" alt="Sumitomo Chemical" draggable={false} />
          </div>
        </div>
        <div className="map-header-actions">
          <KioskRotationButton />
          <FullscreenButton />
        </div>
      </header>

      {!isAccessReady ? (
        <div className="admin-access-loading" role="status"><span className="map-loading-spinner" />{copy.preparingAccess}</div>
      ) : !adminToken ? (
        <AdminAccessGate onAuthorized={authorize} />
      ) : (
        <div className="editor-layout">
          <section className="map-workspace editor-map" aria-label={copy.editableMapAria}>
            <div className="map-sello-watermark" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/sello-contundencia.png" alt="" draggable={false} />
            </div>
            <ArgentinaMap
              mode="edit"
              points={displayedPoints}
              onPointSelect={selectPoint}
              onMapSelect={selectLocation}
              selectedPointId={draft?.id || (draft?.coordinates ? "draft-point" : undefined)}
            />
            <div className={`map-hint editor-map-hint${isPlacing ? " is-active" : ""}`}>
              <span>{isPlacing ? copy.placePointHint : copy.editMapHint}</span>
            </div>
          </section>

          <PointEditorPanel
            points={points}
            draft={draft}
            isPlacing={isPlacing}
            isSaving={isSaving}
            message={message}
            targetWeeds={catalog.targetWeeds}
            filtersEnabled={catalog.filtersEnabled}
            onDraftChange={setDraft}
            onNew={startNewPoint}
            onSelect={selectPoint}
            onRelocate={() => setIsPlacing(true)}
            onAssetUploaded={(asset: CloudinaryAsset) => pendingUploads.current.add(asset.publicId)}
            onSave={saveDraft}
            onDelete={removePoint}
            onCancel={cancelEditing}
            onFiltersEnabledChange={changeFiltersEnabled}
          />
        </div>
      )}
    </main>
  );
}
