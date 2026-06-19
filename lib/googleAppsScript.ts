interface AppsScriptResponse {
  ok?: boolean;
  error?: string;
  warning?: string;
  points?: unknown[];
}

export async function callGoogleAppsScript(
  payload: Record<string, unknown>,
  options: { signal?: AbortSignal; keepalive?: boolean } = {},
): Promise<AppsScriptResponse> {
  const endpoint = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEB_APP_URL;
  if (!endpoint) throw new Error("Falta configurar la URL pública de Google Apps Script.");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    cache: "no-store",
    redirect: "follow",
    signal: options.signal,
    keepalive: options.keepalive,
  });
  const result = await response.json() as AppsScriptResponse;
  if (!response.ok || !result.ok) {
    throw new Error(result.error || "Google Apps Script rechazó la operación.");
  }
  return result;
}
