"use client";

import { useId, useState, type ChangeEvent } from "react";
import { uploadImageToCloudinary, type CloudinaryAsset } from "@/lib/cloudinary";

interface ImageUploadFieldProps {
  label: string;
  value: string;
  compact?: boolean;
  onChange: (asset: CloudinaryAsset | null) => void;
  onUploaded: (asset: CloudinaryAsset) => void;
  onBusyChange: (busy: boolean) => void;
}

export function ImageUploadField({ label, value, compact = false, onChange, onUploaded, onBusyChange }: ImageUploadFieldProps) {
  const inputId = useId();
  const [preview, setPreview] = useState(value);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Seleccioná un archivo de imagen.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("La imagen supera el límite de 12 MB.");
      return;
    }

    setError("");
    setIsUploading(true);
    onBusyChange(true);
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(file);

    try {
      const asset = await uploadImageToCloudinary(file);
      setPreview(asset.imageUrl);
      onUploaded(asset);
      onChange(asset);
    } catch (uploadError) {
      setPreview(value);
      setError(uploadError instanceof Error ? uploadError.message : "No se pudo subir la imagen.");
    } finally {
      setIsUploading(false);
      onBusyChange(false);
    }
  }

  const shownImage = preview || value;

  return (
    <div className={`upload-field${compact ? " is-compact" : ""}`}>
      <span className="upload-label">{label}</span>
      <div className="upload-control">
        <div
          className={`upload-preview${shownImage ? " has-image" : ""}`}
          style={shownImage ? { backgroundImage: `url("${shownImage}")` } : undefined}
          aria-label={shownImage ? `Preview de ${label}` : undefined}
        >
          {!shownImage && (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l1.5-2h7L17 7h3v12H4V7Zm8 3v6m-3-3h6" /></svg>
          )}
          {isUploading && <span className="upload-spinner" aria-label="Subiendo imagen" />}
        </div>
        <div className="upload-actions">
          <label className="upload-button" htmlFor={inputId}>{isUploading ? "Subiendo..." : shownImage ? "Reemplazar" : "Subir imagen"}</label>
          {shownImage && !isUploading && (
            <button type="button" onClick={() => { setPreview(""); onChange(null); }}>Quitar</button>
          )}
        </div>
        <input id={inputId} type="file" accept="image/*" onChange={handleFile} disabled={isUploading} />
      </div>
      {error && <p className="upload-error" role="alert">{error}</p>}
    </div>
  );
}
