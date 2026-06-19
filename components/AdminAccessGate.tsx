"use client";

import { useState, type FormEvent } from "react";
import { verifyAdminToken } from "@/lib/mapPointsRepository";

export const ADMIN_TOKEN_SESSION_KEY = "mapa-argentina-admin-token";

export function AdminAccessGate({ onAuthorized }: { onAuthorized: (token: string) => void }) {
  const [token, setToken] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const cleanToken = token.trim();
    if (!cleanToken) return;
    setIsChecking(true);
    setError("");
    try {
      await verifyAdminToken(cleanToken);
      window.sessionStorage.setItem(ADMIN_TOKEN_SESSION_KEY, cleanToken);
      onAuthorized(cleanToken);
    } catch (accessError) {
      setError(accessError instanceof Error ? accessError.message : "No se pudo validar la clave.");
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <section className="admin-access-shell" aria-label="Acceso administrativo">
      <form className="admin-access-card" onSubmit={submit}>
        <span className="admin-access-mark" aria-hidden="true">•••</span>
        <p>Acceso protegido</p>
        <h2>Edición de puntos</h2>
        <span className="admin-access-copy">Ingresá la clave configurada como <strong>API_TOKEN</strong> en Apps Script.</span>
        <label>
          <span>Clave administrativa</span>
          <input type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="current-password" autoFocus disabled={isChecking} />
        </label>
        <button type="submit" disabled={isChecking || !token.trim()}>
          {isChecking && <span className="button-spinner" aria-hidden="true" />}
          {isChecking ? "Validando..." : "Ingresar a edición"}
        </button>
        {error && <div className="admin-access-error" role="alert">{error}</div>}
        <small>La clave permanece únicamente en esta pestaña.</small>
      </form>
    </section>
  );
}
