import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

interface DeleteBody {
  publicIds?: unknown;
}

interface CloudinaryDestroyResponse {
  result?: string;
  error?: { message?: string };
}

export async function POST(request: Request) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const allowedFolders = process.env.CLOUDINARY_ALLOWED_FOLDERS
    ?.split(",")
    .map((folder) => folder.trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean) || [];

  if (!cloudName || !apiKey || !apiSecret || allowedFolders.length === 0) {
    return NextResponse.json(
      { error: "Falta completar la configuración privada de Cloudinary en el servidor." },
      { status: 503 },
    );
  }

  let body: DeleteBody;
  try {
    body = await request.json() as DeleteBody;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const publicIds = Array.isArray(body.publicIds)
    ? [...new Set(body.publicIds.filter((value): value is string => typeof value === "string" && value.length > 0))]
    : [];
  if (publicIds.length === 0) return NextResponse.json({ deleted: [] });
  if (publicIds.length > 30) {
    return NextResponse.json({ error: "Demasiadas imágenes en una sola solicitud." }, { status: 400 });
  }
  if (publicIds.some((publicId) => !allowedFolders.some((folder) => publicId.startsWith(`${folder}/`)))) {
    return NextResponse.json({ error: "Sólo se pueden eliminar imágenes de esta aplicación." }, { status: 403 });
  }

  try {
    const deleted = await Promise.all(publicIds.map(async (publicId) => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signatureSource = `invalidate=true&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
      const signature = createHash("sha1").update(signatureSource).digest("hex");
      const form = new URLSearchParams({ api_key: apiKey, invalidate: "true", public_id: publicId, signature, timestamp });
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
      });
      const result = await response.json() as CloudinaryDestroyResponse;
      if (!response.ok || result.error) {
        throw new Error(result.error?.message || `No se pudo eliminar ${publicId}.`);
      }
      return { publicId, result: result.result || "ok" };
    }));
    return NextResponse.json({ deleted });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudieron eliminar las imágenes." },
      { status: 502 },
    );
  }
}
