import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getGoogleSheetsConfig() {
  return {
    url: process.env.GOOGLE_SHEETS_WEB_APP_URL,
    token: process.env.GOOGLE_SHEETS_API_TOKEN,
  };
}

async function callGoogleSheets(payload: Record<string, unknown>) {
  const { url, token } = getGoogleSheetsConfig();
  if (!url || !token) throw new Error("Google Sheets no está configurado en el servidor.");

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ ...payload, token }),
    cache: "no-store",
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`Google Sheets respondió con estado ${response.status}.`);

  const result = await response.json() as { ok?: boolean; error?: string; points?: unknown[] };
  if (!result.ok) throw new Error(result.error || "Google Sheets rechazó la operación.");
  return result;
}

export async function GET() {
  try {
    const result = await callGoogleSheets({ action: "list" });
    return NextResponse.json({ points: result.points || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo consultar Google Sheets." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: "upsert" | "delete"; point?: unknown; id?: string };
    if (body.action !== "upsert" && body.action !== "delete") {
      return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
    }
    const result = await callGoogleSheets({ action: body.action, point: body.point, id: body.id });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo actualizar Google Sheets." },
      { status: 503 },
    );
  }
}
