"use client";

import { useId, useState, type ChangeEvent } from "react";
import { uploadImageToCloudinary, type CloudinaryAsset } from "@/lib/cloudinary";
import { useLanguage } from "@/components/LanguageProvider";
import type { ImagePreviewSettings } from "@/types/map";

interface ImageUploadFieldProps {
  label: string;
  value: string;
  compact?: boolean;
  previewSettings?: ImagePreviewSettings;
  onChange: (asset: CloudinaryAsset | null) => void;
  onUploaded: (asset: CloudinaryAsset) => void;
  onBusyChange: (busy: boolean) => void;
  onEditPreview?: () => void;
}

function previewImageStyle(imageUrl: string, settings?: ImagePreviewSettings) {
  const position = settings?.desktop || settings?.mobile || { x: 50, y: 50, zoom: 1 };
  return {
    backgroundImage: `url("${imageUrl}")`,
    backgroundPosition: `${position.x}% ${position.y}%`,
    transform: `scale(${position.zoom})`,
    transformOrigin: `${position.x}% ${position.y}%`,
  };
}

export function ImageUploadField({ label, value, compact = false, previewSettings, onChange, onUploaded, onBusyChange, onEditPreview }: ImageUploadFieldProps) {
  const { copy } = useLanguage();
  const inputId = useId();
  const [preview, setPreview] = useState(value);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(copy.selectImageFile);
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError(copy.imageTooLarge);
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
      setError(uploadError instanceof Error ? uploadError.message : copy.uploadFailed);
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
          aria-label={shownImage ? `${copy.previewOf} ${label}` : undefined}
        >
          {shownImage && <span className="upload-preview-image" style={previewImageStyle(shownImage, previewSettings)} />}
          {!shownImage && (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l1.5-2h7L17 7h3v12H4V7Zm8 3v6m-3-3h6" /></svg>
          )}
          {isUploading && <span className="upload-spinner" aria-label={copy.uploadingImage} />}
        </div>
        <div className="upload-actions">
          <label className="upload-button" htmlFor={inputId}>{isUploading ? copy.uploading : shownImage ? copy.replace : copy.uploadImage}</label>
          {shownImage && !isUploading && onEditPreview && (
            <button className="upload-view-button" type="button" onClick={onEditPreview}>{copy.view}</button>
          )}
          {shownImage && !isUploading && (
            <button className="upload-remove-button" type="button" onClick={() => { setPreview(""); onChange(null); }}>{copy.remove}</button>
          )}
        </div>
        <input id={inputId} type="file" accept="image/*" onChange={handleFile} disabled={isUploading} />
      </div>
      {error && <p className="upload-error" role="alert">{error}</p>}
    </div>
  );
}
