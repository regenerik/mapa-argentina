"use client";

import { useState, type FormEvent } from "react";
import { verifyAdminToken } from "@/lib/mapPointsRepository";
import { useLanguage } from "@/components/LanguageProvider";

export const ADMIN_TOKEN_SESSION_KEY = "mapa-argentina-admin-token";

export function AdminAccessGate({ onAuthorized }: { onAuthorized: (token: string) => void }) {
  const { copy } = useLanguage();
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
      setError(accessError instanceof Error ? accessError.message : copy.accessValidationFailed);
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <section className="admin-access-shell" aria-label={copy.adminAccess}>
      <form className="admin-access-card" onSubmit={submit}>
        <span className="admin-access-mark" aria-hidden="true">•••</span>
        <p>{copy.protectedAccess}</p>
        <h2>{copy.pointEditing}</h2>
        <span className="admin-access-copy">{copy.accessCopy}</span>
        <label>
          <span>{copy.adminKey}</span>
          <input type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="current-password" autoFocus disabled={isChecking} />
        </label>
        <button type="submit" disabled={isChecking || !token.trim()}>
          {isChecking && <span className="button-spinner" aria-hidden="true" />}
          {isChecking ? copy.validating : copy.enterEditing}
        </button>
        {error && <div className="admin-access-error" role="alert">{error}</div>}
        <small>{copy.keySession}</small>
      </form>
    </section>
  );
}
