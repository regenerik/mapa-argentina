"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "mapa-argentina-ui-scale";
const SCALE_VALUES = [1, 1.15, 1.3] as const;

type UIScale = (typeof SCALE_VALUES)[number];

interface UIScaleContextValue {
  scale: UIScale;
  canDecrease: boolean;
  canIncrease: boolean;
  increase: () => void;
  decrease: () => void;
}

const UIScaleContext = createContext<UIScaleContextValue | null>(null);

function closestScale(value: number): UIScale {
  return SCALE_VALUES.reduce((closest, current) => (
    Math.abs(current - value) < Math.abs(closest - value) ? current : closest
  ), SCALE_VALUES[0]);
}

export function UIScaleProvider({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState<UIScale>(() => {
    if (typeof window === "undefined") return 1;
    try {
      const stored = Number(window.localStorage.getItem(STORAGE_KEY));
      return Number.isFinite(stored) ? closestScale(stored) : 1;
    } catch {
      return 1;
    }
  });
  const scaleIndex = SCALE_VALUES.indexOf(scale);

  useEffect(() => {
    document.documentElement.style.setProperty("--ui-scale", String(scale));
    document.documentElement.style.setProperty("--scaled-svh", `calc(100svh / ${scale})`);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(scale));
    } catch {
      // Ignore persistence failures in private or embedded browser contexts.
    }
  }, [scale]);

  const value = useMemo<UIScaleContextValue>(() => ({
    scale,
    canDecrease: scaleIndex > 0,
    canIncrease: scaleIndex < SCALE_VALUES.length - 1,
    decrease: () => setScale(SCALE_VALUES[Math.max(0, scaleIndex - 1)]),
    increase: () => setScale(SCALE_VALUES[Math.min(SCALE_VALUES.length - 1, scaleIndex + 1)]),
  }), [scale, scaleIndex]);

  return (
    <UIScaleContext.Provider value={value}>
      {children}
    </UIScaleContext.Provider>
  );
}

export function UIScaleRoot({ children }: { children: ReactNode }) {
  return <div className="ui-scale-root">{children}</div>;
}

export function useUIScale() {
  const context = useContext(UIScaleContext);
  if (!context) throw new Error("useUIScale must be used inside UIScaleProvider");
  return context;
}
