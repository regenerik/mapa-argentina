"use client";

import { useEffect } from "react";

export function HydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.appHydrated = "true";
    window.sessionStorage.removeItem("mapa-hydration-recovery");
    return () => {
      delete document.documentElement.dataset.appHydrated;
    };
  }, []);

  return null;
}
