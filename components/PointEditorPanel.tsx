"use client";

import { useId, useState, type FormEvent } from "react";
import { ARGENTINA_PROVINCES } from "@/data/province-options";
import { ImagePreviewEditor } from "@/components/ImagePreviewEditor";
import { ImageUploadField } from "@/components/ImageUploadField";
import { useLanguage } from "@/components/LanguageProvider";
import type { CloudinaryAsset } from "@/lib/cloudinary";
import type { ImagePreviewSettings, MapPoint } from "@/types/map";

export interface PhotoDraft {
  id: string;
  title: string;
  imageUrl: string;
  publicId?: string;
  daysFromBase: string;
  isBase?: boolean;
  previewPosition?: ImagePreviewSettings;
}

export interface PointDraft {
  id: string | null;
  title: string;
  description: string;
  coordinates: [number, number] | null;
  thumbnailUrl: string;
  thumbnailPublicId?: string;
  photos: PhotoDraft[];
  targetWeeds: string[];
  province: string;
  locality: string;
  advisor: string;
  dose: string;
}

interface PointEditorPanelProps {
  points: MapPoint[];
  draft: PointDraft | null;
  isPlacing: boolean;
  isSaving: boolean;
  message: string;
  targetWeeds: string[];
  filtersEnabled: boolean;
  onDraftChange: (draft: PointDraft) => void;
  onNew: () => void;
  onSelect: (point: MapPoint) => void;
  onRelocate: () => void;
  onAssetUploaded: (asset: CloudinaryAsset) => void;
  onSave: (draft: PointDraft) => void;
  onDelete: (pointId: string) => void;
  onCancel: () => void;
  onFiltersEnabledChange: (enabled: boolean) => void;
}

function toggleSelection(values: string[], value: string) {
  return values.includes(value) ? values.filter((current) => current !== value) : [...values, value];
}

function ensurePhotoCards(photos: PhotoDraft[]) {
  const next = [...photos];
  while (next.length < 4) {
    next.push({ id: `empty-${next.length}-${crypto.randomUUID()}`, title: "", imageUrl: "", daysFromBase: next.length === 0 ? "0" : "" });
  }
  return next.map((photo, index) => ({ ...photo, title: photo.title || "", isBase: index === 0 }));
}

function uniqueLocalities(points: MapPoint[]) {
  return [...new Set(points.map((point) => point.locality?.trim()).filter((locality): locality is string => Boolean(locality)))]
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}

export function PointEditorPanel(props: PointEditorPanelProps) {
  const { copy } = useLanguage();
  const localityListId = useId();
  const {
    points,
    draft,
    isPlacing,
    isSaving,
    message,
    targetWeeds,
    filtersEnabled,
    onDraftChange,
    onNew,
    onSelect,
    onRelocate,
    onAssetUploaded,
    onSave,
    onDelete,
    onCancel,
    onFiltersEnabledChange,
  } = props;
  const [uploadingSlots, setUploadingSlots] = useState<Set<string>>(new Set());
  const [editingPreviewIndex, setEditingPreviewIndex] = useState<number | null>(null);
  const photos = draft ? ensurePhotoCards(draft.photos) : [];
  const editingPreviewPhoto = editingPreviewIndex !== null ? photos[editingPreviewIndex] : null;
  const sortedPoints = [...points].sort((a, b) => a.title.localeCompare(b.title, "es", { sensitivity: "base" }));
  const localityOptions = uniqueLocalities(points);

  function setUploadBusy(slot: string, busy: boolean) {
    setUploadingSlots((current) => {
      const next = new Set(current);
      if (busy) next.add(slot); else next.delete(slot);
      return next;
    });
  }

  function updatePhoto(index: number, updates: Partial<PhotoDraft>) {
    if (!draft) return;
    const nextPhotos = ensurePhotoCards(draft.photos).map((photo, currentIndex) =>
      currentIndex === index ? { ...photo, ...updates } : photo,
    );
    const basePhoto = nextPhotos[0];
    onDraftChange({
      ...draft,
      photos: nextPhotos,
      thumbnailUrl: basePhoto.imageUrl,
      thumbnailPublicId: basePhoto.publicId,
    });
  }

  function addPhoto() {
    if (!draft) return;
    onDraftChange({
      ...draft,
      photos: [
        ...ensurePhotoCards(draft.photos),
        { id: `photo-${crypto.randomUUID()}`, title: "", imageUrl: "", daysFromBase: "" },
      ],
    });
  }

  function removePhoto(index: number) {
    if (!draft || index === 0) return;
    const nextPhotos = ensurePhotoCards(draft.photos).filter((_, currentIndex) => currentIndex !== index);
    onDraftChange({ ...draft, photos: ensurePhotoCards(nextPhotos) });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (draft) onSave({ ...draft, photos });
  }

  const hasInvalidPhotoDay = photos.some((photo) => {
    if (!photo.imageUrl) return false;
    const value = Number(photo.daysFromBase);
    return !photo.daysFromBase.trim() || !Number.isFinite(value) || value < 0;
  });

  const canSave = Boolean(
    draft?.title.trim() &&
    draft.description.trim() &&
    draft.coordinates &&
    photos[0]?.imageUrl &&
    draft.targetWeeds.length > 0 &&
    draft.province &&
    !hasInvalidPhotoDay &&
    uploadingSlots.size === 0 &&
    !isSaving,
  );

  return (
    <aside className="editor-panel" aria-label={copy.pointAdministration}>
      <div className="editor-panel-header">
        <div className="editor-admin-title"><span>{copy.administration}</span></div>
        <div className="editor-admin-options">
          <div className="editor-admin-option">
            <div>
              <strong>{copy.mapPointsTitle}</strong>
              <small>{copy.mapPointsAdminCopy}</small>
            </div>
            <button className="editor-new-button" type="button" onClick={onNew}>{copy.newPoint}</button>
          </div>
          <div className="editor-admin-option">
            <div>
              <strong>{copy.filtersFeature}</strong>
              <small>{copy.filtersFeatureCopy}</small>
            </div>
            <button
              className={`editor-switch${filtersEnabled ? " is-active" : ""}`}
              type="button"
              role="switch"
              aria-checked={filtersEnabled}
              onClick={() => onFiltersEnabledChange(!filtersEnabled)}
            >
              <span />
            </button>
          </div>
        </div>
      </div>

      {!draft && message && <div className="editor-message" role="status">{message}</div>}

      {!draft ? (
        <div className="editor-empty">
          <div className="editor-empty-icon">+</div>
          <h3>{copy.chooseLocation}</h3>
          <p>{copy.chooseLocationCopy}</p>
          {points.length > 0 && (
            <div className="editor-point-list">
              <span>{copy.savedPoints} · {points.length}</span>
              {sortedPoints.map((point) => (
                <button key={point.id} type="button" onClick={() => onSelect(point)}>
                  <i style={{ backgroundImage: `url("${point.thumbnailUrl}")` }} />
                  <strong>{point.title}</strong>
                  <b>›</b>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <form className="editor-form" onSubmit={submit}>
          <div className="editor-form-title">
            <div><span>{draft.id ? copy.editingPoint : copy.newPointTitle}</span><h3>{draft.title || copy.untitled}</h3></div>
            <button type="button" onClick={onCancel} aria-label={copy.closeForm}>×</button>
          </div>

          <div className={`location-card${isPlacing ? " is-active" : ""}`}>
            <span className="location-pin" />
            <div>
              <strong>{isPlacing ? copy.touchNewLocation : draft.coordinates ? copy.locationDefined : copy.locationMissing}</strong>
              <small>{draft.coordinates ? `${draft.coordinates[1].toFixed(4)}, ${draft.coordinates[0].toFixed(4)}` : copy.selectMapLocation}</small>
            </div>
            <button type="button" onClick={onRelocate}>{draft.coordinates ? copy.relocate : copy.locate}</button>
          </div>

          <label className="editor-field">
            <span>{copy.title}</span>
            <input value={draft.title} onChange={(event) => onDraftChange({ ...draft, title: event.target.value })} placeholder={copy.titlePlaceholder} maxLength={70} required />
          </label>
          <label className="editor-field">
            <span>{copy.description}</span>
            <textarea value={draft.description} onChange={(event) => onDraftChange({ ...draft, description: event.target.value })} placeholder={copy.descriptionPlaceholder} rows={4} maxLength={420} required />
          </label>

          <fieldset className="editor-choice-group">
            <legend>{copy.targetWeeds} <small>{copy.required}</small></legend>
            {targetWeeds.length > 0 ? (
              <div className="weed-options">
                {targetWeeds.map((weed) => (
                  <label key={weed} className="choice-pill">
                    <input
                      type="checkbox"
                      checked={draft.targetWeeds.includes(weed)}
                      onChange={() => onDraftChange({ ...draft, targetWeeds: toggleSelection(draft.targetWeeds, weed) })}
                    />
                    <span>{weed}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="editor-helper">{copy.noTargetWeeds}</p>
            )}
          </fieldset>

          <label className="editor-field">
            <span>{copy.province} *</span>
            <select value={draft.province} onChange={(event) => onDraftChange({ ...draft, province: event.target.value })} required>
              <option value="">{copy.selectProvince}</option>
              {ARGENTINA_PROVINCES.map((province) => <option key={province} value={province}>{province}</option>)}
            </select>
          </label>

          <label className="editor-field">
            <span>{copy.locality}</span>
            <input
              value={draft.locality}
              onChange={(event) => onDraftChange({ ...draft, locality: event.target.value })}
              placeholder={copy.localityPlaceholder}
              maxLength={90}
              list={localityOptions.length > 0 ? localityListId : undefined}
            />
            {localityOptions.length > 0 && (
              <datalist id={localityListId}>
                {localityOptions.map((locality) => <option key={locality} value={locality} />)}
              </datalist>
            )}
          </label>

          <label className="editor-field">
            <span>{copy.advisor}</span>
            <input value={draft.advisor} onChange={(event) => onDraftChange({ ...draft, advisor: event.target.value })} placeholder={copy.advisorPlaceholder} maxLength={90} />
          </label>

          <label className="editor-field">
            <span>{copy.dose}</span>
            <input value={draft.dose} onChange={(event) => onDraftChange({ ...draft, dose: event.target.value })} placeholder={copy.dosePlaceholder} />
          </label>

          <fieldset className="photo-uploads">
            <legend>{copy.photoTimeline} <small>{copy.dynamicDaysCopy}</small></legend>
            <div className="photo-upload-grid">
              {photos.map((photo, index) => (
                <div key={photo.id} className="photo-card">
                  <div className="photo-card-header">
                    <strong>{copy.photoSlot} {index + 1}</strong>
                    {index > 3 && <button type="button" onClick={() => removePhoto(index)} aria-label={copy.remove}>{copy.remove}</button>}
                  </div>
                  <label className="editor-field photo-title-field">
                    <span>{copy.photoTitle}</span>
                    <input
                      value={photo.title}
                      onChange={(event) => updatePhoto(index, { title: event.target.value })}
                      placeholder={index === 0 ? copy.basePhoto : `${copy.photo} ${index + 1}`}
                      maxLength={60}
                    />
                  </label>
                  <ImageUploadField
                    compact
                    label={copy.photoFile}
                    value={photo.imageUrl}
                    onUploaded={onAssetUploaded}
                    onChange={(asset) => updatePhoto(index, {
                      imageUrl: asset?.imageUrl || "",
                      publicId: asset?.publicId,
                      previewPosition: undefined,
                    })}
                    onBusyChange={(busy) => setUploadBusy(`photo-${index}`, busy)}
                    previewSettings={photo.previewPosition}
                    onEditPreview={photo.imageUrl ? () => setEditingPreviewIndex(index) : undefined}
                  />
                  <label className="editor-field photo-day-field">
                    <span>{copy.daysFromBase}</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={photo.daysFromBase}
                      onChange={(event) => updatePhoto(index, { daysFromBase: event.target.value })}
                      placeholder={index === 0 ? "0" : "7"}
                    />
                  </label>
                </div>
              ))}
              <button className="photo-add-card" type="button" onClick={addPhoto} title={copy.addMorePhotos}>
                <span>+</span>
                <strong>{copy.addMorePhotos}</strong>
              </button>
            </div>
          </fieldset>

          <div className="editor-form-actions">
            <div className="editor-buttons-row">
              {draft.id && <button className="editor-delete-button" type="button" onClick={() => onDelete(draft.id!)} disabled={isSaving}>{copy.delete}</button>}
              <button className="editor-save-button" type="submit" disabled={!canSave}>
                {isSaving && <span className="button-spinner" aria-hidden="true" />}
                {isSaving ? copy.saving : uploadingSlots.size > 0 ? copy.uploadingImages : copy.savePoint}
              </button>
            </div>
          </div>
          {editingPreviewIndex !== null && editingPreviewPhoto?.imageUrl && (
            <ImagePreviewEditor
              imageUrl={editingPreviewPhoto.imageUrl}
              imageTitle={editingPreviewPhoto.title || `${copy.photoSlot} ${editingPreviewIndex + 1}`}
              initialSettings={editingPreviewPhoto.previewPosition}
              onClose={() => setEditingPreviewIndex(null)}
              onSave={(previewPosition) => {
                updatePhoto(editingPreviewIndex, { previewPosition });
                setEditingPreviewIndex(null);
              }}
            />
          )}
        </form>
      )}
    </aside>
  );
}
