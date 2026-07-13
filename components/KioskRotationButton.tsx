"use client";

import { useKioskRotation } from "@/components/KioskRotationProvider";
import { useLanguage } from "@/components/LanguageProvider";

export function KioskRotationButton() {
  const { isRotated, toggleRotation } = useKioskRotation();
  const { copy } = useLanguage();

  return (
    <button className="icon-button rotation-button" type="button" onClick={toggleRotation} aria-label={isRotated ? copy.restoreRotation : copy.rotateInterface}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {isRotated ? (
          <path d="M19 7a8 8 0 1 0 1.7 8.7M19 7v5h-5" />
        ) : (
          <path d="M5 7a8 8 0 1 1-1.7 8.7M5 7v5h5" />
        )}
      </svg>
      <span>{isRotated ? copy.restoreRotationShort : copy.rotateInterfaceShort}</span>
    </button>
  );
}
