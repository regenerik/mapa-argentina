"use client";

import { useEffect, useState } from "react";

export function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Embedded browsers may block fullscreen even after a direct user gesture.
    }
  }

  return (
    <button className="icon-button fullscreen-button" type="button" onClick={toggleFullscreen} aria-label={isFullscreen ? "Restaurar pantalla" : "Ver en pantalla completa"}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {isFullscreen ? (
          <path d="M9 3v6H3m12-6v6h6M9 21v-6H3m12 6v-6h6" />
        ) : (
          <path d="M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5" />
        )}
      </svg>
      <span>{isFullscreen ? "Restaurar" : "Pantalla completa"}</span>
    </button>
  );
}
