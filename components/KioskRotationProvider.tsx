"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface KioskRotationContextValue {
  isRotated: boolean;
  toggleRotation: () => void;
}

const KioskRotationContext = createContext<KioskRotationContextValue | null>(null);

export function KioskRotationProvider({ children }: { children: ReactNode }) {
  const [isRotated, setIsRotated] = useState(false);

  const value = useMemo<KioskRotationContextValue>(() => ({
    isRotated,
    toggleRotation: () => setIsRotated((current) => !current),
  }), [isRotated]);

  return (
    <KioskRotationContext.Provider value={value}>
      <div className={`kiosk-rotation-stage${isRotated ? " is-rotated" : ""}`}>
        {children}
      </div>
    </KioskRotationContext.Provider>
  );
}

export function useKioskRotation() {
  const context = useContext(KioskRotationContext);
  if (!context) throw new Error("useKioskRotation must be used inside KioskRotationProvider");
  return context;
}
