interface CloudinaryUploadResponse {
  secure_url?: string;
  public_id?: string;
  error?: { message?: string };
}

export interface CloudinaryAsset {
  imageUrl: string;
  publicId: string;
}

export async function uploadImageToCloudinary(file: File): Promise<CloudinaryAsset> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Falta configurar Cloudinary en las variables de entorno.");
  }

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body,
  });
  const result = await response.json() as CloudinaryUploadResponse;

  if (!response.ok || !result.secure_url || !result.public_id) {
    throw new Error(result.error?.message || "No se pudo subir la imagen.");
  }

  return { imageUrl: result.secure_url, publicId: result.public_id };
}

export function getCloudinaryPublicId(imageUrl: string): string | null {
  try {
    const url = new URL(imageUrl);
    if (url.hostname !== "res.cloudinary.com") return null;
    const marker = "/image/upload/";
    const uploadIndex = url.pathname.indexOf(marker);
    if (uploadIndex < 0) return null;
    const segments = url.pathname.slice(uploadIndex + marker.length).split("/");
    const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
    const assetSegments = versionIndex >= 0 ? segments.slice(versionIndex + 1) : segments;
    if (assetSegments.length === 0) return null;
    const last = assetSegments.length - 1;
    assetSegments[last] = assetSegments[last].replace(/\.[^.]+$/, "");
    return assetSegments.filter(Boolean).join("/") || null;
  } catch {
    return null;
  }
}

export async function deleteCloudinaryAssets(publicIds: string[], keepalive = false): Promise<void> {
  const uniqueIds = [...new Set(publicIds.filter(Boolean))];
  if (uniqueIds.length === 0) return;
  const response = await fetch("/api/cloudinary/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicIds: uniqueIds }),
    keepalive,
  });
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(result.error || "No se pudieron eliminar las imágenes de Cloudinary.");
}
