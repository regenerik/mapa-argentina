"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { MapFilters } from "@/types/map";
import { hasActiveFilters } from "@/components/MapFiltersPanel";

interface MapFilterControlsProps {
  filters: MapFilters;
  onOpen: () => void;
  onClear: () => void;
}

export function MapFilterControls({ filters, onOpen, onClear }: MapFilterControlsProps) {
  const { copy } = useLanguage();
  const isActive = hasActiveFilters(filters);

  return (
    <div className="map-filter-controls" aria-label={copy.filters}>
      <button className={isActive ? "is-active" : ""} type="button" onClick={onOpen} aria-label={copy.openFilters}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
        {isActive && <span />}
      </button>
      <button type="button" onClick={onClear} aria-label={copy.clearFilters}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7 17 17M17 7 7 17" /></svg>
      </button>
    </div>
  );
}
