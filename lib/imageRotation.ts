export function normalizeImageRotation(value: unknown): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  const snappedValue = Math.round(numericValue / 90) * 90;
  return ((snappedValue % 360) + 360) % 360;
}

export function rotateImageLeft(rotation: number): number {
  return normalizeImageRotation(rotation - 90);
}

export function rotateImageRight(rotation: number): number {
  return normalizeImageRotation(rotation + 90);
}

export function getRotatedImageUrl(imageUrl: string, rotation: number | undefined): string {
  const normalizedRotation = normalizeImageRotation(rotation);
  if (!imageUrl || normalizedRotation === 0) return imageUrl;

  try {
    const url = new URL(imageUrl);
    if (url.hostname !== "res.cloudinary.com") return imageUrl;
    const uploadMarker = "/image/upload/";
    const uploadIndex = url.pathname.indexOf(uploadMarker);
    if (uploadIndex < 0) return imageUrl;
    const insertionIndex = uploadIndex + uploadMarker.length;
    url.pathname = `${url.pathname.slice(0, insertionIndex)}a_${normalizedRotation}/${url.pathname.slice(insertionIndex)}`;
    return url.toString();
  } catch {
    return imageUrl;
  }
}
