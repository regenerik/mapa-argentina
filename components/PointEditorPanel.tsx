"use client";

import { useState, type FormEvent } from "react";
import { ImageUploadField } from "@/components/ImageUploadField";
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
    <aside className="editor-panel" aria-label="Administración de puntos">
      <div className="editor-panel-header">
        <div><span>Administración</span><h2>Puntos del mapa</h2></div>
        <button className="editor-new-button" type="button" onClick={onNew}>+ Nuevo</button>
      </div>

      {!draft && message && <div className="editor-message" role="status">{message}</div>}

      {!draft ? (
        <div className="editor-empty">
          <div className="editor-empty-icon">+</div>
          <h3>Elegí una ubicación</h3>
          <p>Tocá una provincia en el mapa para crear un punto o seleccioná uno existente para editarlo.</p>
          {points.length > 0 && (
            <div className="editor-point-list">
              <span>Puntos guardados · {points.length}</span>
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
            <div><span>{draft.id ? "Editando punto" : "Nuevo punto"}</span><h3>{draft.title || "Sin título"}</h3></div>
            <button type="button" onClick={onCancel} aria-label="Cerrar formulario">×</button>
          </div>

          <div className={`location-card${isPlacing ? " is-active" : ""}`}>
            <span className="location-pin" />
            <div>
              <strong>{isPlacing ? "Tocá la nueva ubicación" : draft.coordinates ? "Ubicación definida" : "Falta elegir ubicación"}</strong>
              <small>{draft.coordinates ? `${draft.coordinates[1].toFixed(4)}, ${draft.coordinates[0].toFixed(4)}` : "Seleccioná un lugar en el mapa"}</small>
            </div>
            <button type="button" onClick={onRelocate}>{draft.coordinates ? "Reubicar" : "Ubicar"}</button>
          </div>

          <label className="editor-field">
            <span>Título</span>
            <input value={draft.title} onChange={(event) => onDraftChange({ ...draft, title: event.target.value })} placeholder="Ej. Lote demostrativo" maxLength={70} required />
          </label>
          <label className="editor-field">
            <span>Descripción</span>
            <textarea value={draft.description} onChange={(event) => onDraftChange({ ...draft, description: event.target.value })} placeholder="Contá brevemente qué se está mostrando..." rows={4} maxLength={420} required />
          </label>

          <ImageUploadField
            key={`thumbnail-${draft.id || "new"}`}
            label="Imagen principal / miniatura"
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
            <span>Duración de la evolución</span>
            <select value={draft.duration} onChange={(event) => onDraftChange({ ...draft, duration: event.target.value as TimelineDuration })}>
              <option value="15">Hasta día 15</option>
              <option value="30">Hasta día 30</option>
              <option value="60">Hasta día 60</option>
              <option value="120">Hasta día 120</option>
            </select>
          </label>

          <fieldset className="timeline-uploads">
            <legend>Imágenes por día <small>Opcionales</small></legend>
            <div className="timeline-upload-grid">
              {visibleDays.map((day) => (
                <ImageUploadField
                  key={`${draft.id || "new"}-${day}`}
                  compact
                  label={`Día ${day}`}
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
              {draft.id && <button className="editor-delete-button" type="button" onClick={() => onDelete(draft.id!)} disabled={isSaving}>Eliminar</button>}
              <button className="editor-save-button" type="submit" disabled={!canSave}>
                {isSaving && <span className="button-spinner" aria-hidden="true" />}
                {isSaving ? "Guardando..." : uploadingSlots.size > 0 ? "Subiendo imágenes..." : "Guardar punto"}
              </button>
            </div>
            {message && <div className="editor-message editor-save-feedback" role="status">{message}</div>}
          </div>
        </form>
      )}
    </aside>
  );
}
