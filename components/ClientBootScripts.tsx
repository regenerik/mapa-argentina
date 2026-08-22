"use client";

import { useEffect } from "react";

const GTM_SCRIPT_ID = "google-tag-manager-runtime";
const HYDRATION_RECOVERY_KEY = "mapa-hydration-recovery";

export function ClientBootScripts({ googleTagManagerId }: { googleTagManagerId: string }) {
  useEffect(() => {
    if (document.getElementById(GTM_SCRIPT_ID)) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    const script = document.createElement("script");
    script.id = GTM_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${googleTagManagerId}`;
    document.head.appendChild(script);
  }, [googleTagManagerId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (document.documentElement.dataset.appHydrated === "true") return;
      let storage: Storage;
      try {
        storage = window.sessionStorage;
      } catch {
        return;
      }
      const lastRecovery = Number(storage.getItem(HYDRATION_RECOVERY_KEY) || 0);
      if (Date.now() - lastRecovery < 60000) return;
      storage.setItem(HYDRATION_RECOVERY_KEY, String(Date.now()));
      const recoveryUrl = new URL(window.location.href);
      recoveryUrl.searchParams.set("_recover", String(Date.now()));
      window.location.replace(recoveryUrl.toString());
    }, 12000);

    return () => window.clearTimeout(timer);
  }, []);

  return null;
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}
