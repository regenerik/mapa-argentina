"use client";

import { useEffect, useState } from "react";

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

export function FullscreenButton() {
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
    <button className="icon-button fullscreen-button" type="button" onClick={toggleFullscreen} aria-label={isFullscreen ? "Restaurar pantalla" : "Ver en pantalla completa"}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {isFullscreen ? <path d="M9 3v6H3m12-6v6h6M9 21v-6H3m12 6v-6h6" /> : <path d="M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5" />}
      </svg>
      <span>{isFullscreen ? "Restaurar" : "Pantalla completa"}</span>
    </button>
  );
}
