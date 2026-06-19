"use client";

import { useEffect } from "react";

export function HydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.appHydrated = "true";
    try {
      window.sessionStorage?.removeItem("mapa-hydration-recovery");
    } catch {
      // Storage can be unavailable in private or embedded browser contexts.
    }
    return () => {
      delete document.documentElement.dataset.appHydrated;
    };
  }, []);

  return null;
}
