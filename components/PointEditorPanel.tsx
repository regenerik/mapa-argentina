"use client";

import { useState, type FormEvent } from "react";
import { ImageUploadField } from "@/components/ImageUploadField";
import { useLanguage } from "@/components/LanguageProvider";
import type { CloudinaryAsset } from "@/lib/cloudinary";
import type { MapPoint, TimelineDay } from "@/types/map";

export type TimelineDuration = "15" | "30" | "60" | "120";

export interface PointDraft {
  id: string | null;
  title: string;
  description: string;
  coordinates: [number, number] | null;
  thumbnailUrl: string;
  thumbnailPublicId?: string;
  images: Partial<Record<TimelineDay, string>>;
  imagePublicIds: Partial<Record<TimelineDay, string>>;
  duration: TimelineDuration;
}

const DAYS_BY_DURATION: Record<TimelineDuration, TimelineDay[]> = {
  "15": ["1", "7", "15"],
  "30": ["1", "7", "15", "30"],
  "60": ["1", "7", "15", "30", "60"],
  "120": ["1", "7", "15", "30", "60", "120"],
};

interface PointEditorPanelProps {
  points: MapPoint[];
  draft: PointDraft | null;
  isPlacing: boolean;
  isSaving: boolean;
  message: string;
  onDraftChange: (draft: PointDraft) => void;
  onNew: () => void;
  onSelect: (point: MapPoint) => void;
  onRelocate: () => void;
  onAssetUploaded: (asset: CloudinaryAsset) => void;
  onSave: (draft: PointDraft) => void;
  onDelete: (pointId: string) => void;
  onCancel: () => void;
}

export function PointEditorPanel(props: PointEditorPanelProps) {
  const { copy } = useLanguage();
  const { points, draft, isPlacing, isSaving, message, onDraftChange, onNew, onSelect, onRelocate, onAssetUploaded, onSave, onDelete, onCancel } = props;
  const [uploadingSlots, setUploadingSlots] = useState<Set<string>>(new Set());
  const visibleDays = draft ? DAYS_BY_DURATION[draft.duration] : [];

  function setUploadBusy(slot: string, busy: boolean) {
    setUploadingSlots((current) => {
      const next = new Set(current);
      if (busy) next.add(slot); else next.delete(slot);
      return next;
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (draft) onSave(draft);
  }

  const canSave = Boolean(
    draft?.title.trim() &&
    draft.description.trim() &&
    draft.coordinates &&
    draft.thumbnailUrl &&
    uploadingSlots.size === 0 &&
    !isSaving,
  );

  return (
    <aside className="editor-panel" aria-label={copy.pointAdministration}>
      <div className="editor-panel-header">
        <div><span>{copy.administration}</span><h2>{copy.mapPointsTitle}</h2></div>
        <button className="editor-new-button" type="button" onClick={onNew}>{copy.newPoint}</button>
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
              {points.map((point) => (
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

          <ImageUploadField
            key={`thumbnail-${draft.id || "new"}`}
            label={copy.mainImage}
            value={draft.thumbnailUrl}
            onUploaded={onAssetUploaded}
            onChange={(asset) => onDraftChange({
              ...draft,
              thumbnailUrl: asset?.imageUrl || "",
              thumbnailPublicId: asset?.publicId,
            })}
            onBusyChange={(busy) => setUploadBusy("thumbnail", busy)}
          />

          <label className="editor-field">
            <span>{copy.evolutionDuration}</span>
            <select value={draft.duration} onChange={(event) => onDraftChange({ ...draft, duration: event.target.value as TimelineDuration })}>
              <option value="15">{copy.untilDay} 15</option>
              <option value="30">{copy.untilDay} 30</option>
              <option value="60">{copy.untilDay} 60</option>
              <option value="120">{copy.untilDay} 120</option>
            </select>
          </label>

          <fieldset className="timeline-uploads">
            <legend>{copy.imagesByDay} <small>{copy.optional}</small></legend>
            <div className="timeline-upload-grid">
              {visibleDays.map((day) => (
                <ImageUploadField
                  key={`${draft.id || "new"}-${day}`}
                  compact
                  label={`${copy.day} ${day}`}
                  value={draft.images[day] || ""}
                  onUploaded={onAssetUploaded}
                  onChange={(asset) => onDraftChange({
                    ...draft,
                    images: { ...draft.images, [day]: asset?.imageUrl || "" },
                    imagePublicIds: { ...draft.imagePublicIds, [day]: asset?.publicId },
                  })}
                  onBusyChange={(busy) => setUploadBusy(`day-${day}`, busy)}
                />
              ))}
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
            {message && <div className="editor-message editor-save-feedback" role="status">{message}</div>}
          </div>
        </form>
      )}
    </aside>
  );
}
