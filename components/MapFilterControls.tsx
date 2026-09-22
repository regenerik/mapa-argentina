"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { MapFilters } from "@/types/map";
import { hasActiveFilters } from "@/components/MapFiltersPanel";

interface MapFilterControlsProps {
  filters: MapFilters;
  onOpen: () => void;
}

export function MapFilterControls({ filters, onOpen }: MapFilterControlsProps) {
  const { copy } = useLanguage();
  const isActive = hasActiveFilters(filters);

  return (
    <button className={`map-filter-control${isActive ? " is-active" : ""}`} type="button" onClick={onOpen} aria-label={copy.openFilters}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
      {isActive && <span />}
    </button>
  );
}
