"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

export function FullscreenButton() {
  const { copy } = useLanguage();
  const [isSupported, setIsSupported] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const webkitDocument = document as WebkitDocument;
    const root = document.documentElement as WebkitElement;
    const supportTimer = window.setTimeout(() => {
      setIsSupported(Boolean(root.requestFullscreen || root.webkitRequestFullscreen));
    }, 0);
    const handleChange = () => setIsFullscreen(Boolean(document.fullscreenElement || webkitDocument.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", handleChange);
    document.addEventListener("webkitfullscreenchange", handleChange);
    return () => {
      window.clearTimeout(supportTimer);
      document.removeEventListener("fullscreenchange", handleChange);
      document.removeEventListener("webkitfullscreenchange", handleChange);
    };
  }, []);

  async function toggleFullscreen() {
    const webkitDocument = document as WebkitDocument;
    const root = document.documentElement as WebkitElement;
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (webkitDocument.webkitFullscreenElement && webkitDocument.webkitExitFullscreen) {
        await Promise.resolve(webkitDocument.webkitExitFullscreen());
      } else if (root.requestFullscreen) {
        await root.requestFullscreen();
      } else if (root.webkitRequestFullscreen) {
        await Promise.resolve(root.webkitRequestFullscreen());
      }
    } catch {
      // iPhone WebKit can expose only media fullscreen and reject document fullscreen.
    }
  }

  if (!isSupported) return null;

  return (
    <button className="icon-button fullscreen-button" type="button" onClick={toggleFullscreen} aria-label={isFullscreen ? copy.restoreAria : copy.fullscreenAria}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {isFullscreen ? <path d="m9 9-5-5m0 0v6m0-6h6m5 11 5 5m0 0v-6m0 6h-6" /> : <path d="m4 4 6 6M4 4v6M4 4h6m10 16-6-6m6 6v-6m0 6h-6" />}
      </svg>
      <span>{isFullscreen ? copy.restore : copy.fullscreen}</span>
    </button>
  );
}
