"use client";

import { useEffect, useMemo, useState } from "react";
import { ARGENTINA_PROVINCES } from "@/data/province-options";
import { useLanguage } from "@/components/LanguageProvider";
import type { MapFilters, MapPoint } from "@/types/map";

interface MapFiltersPanelProps {
  points: MapPoint[];
  targetWeeds: string[];
  appliedFilters: MapFilters;
  onConfirm: (filters: MapFilters) => void;
  onCancel: () => void;
}

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter((current) => current !== value) : [...values, value];
}

function splitWeedLabel(weed: string) {
  const [commonName, ...scientificNameParts] = weed.split(" - ");
  return {
    commonName: commonName.trim(),
    scientificName: scientificNameParts.join(" - ").trim(),
  };
}

function pointMatches(point: MapPoint, filters: MapFilters) {
  const weedMatch = filters.targetWeeds.length === 0 || point.targetWeeds.some((weed) => filters.targetWeeds.includes(weed));
  const provinceMatch = filters.provinces.length === 0 || filters.provinces.includes(point.province);
  return weedMatch && provinceMatch;
}

export function filterMapPoints(points: MapPoint[], filters: MapFilters) {
  return points.filter((point) => pointMatches(point, filters));
}

export function hasActiveFilters(filters: MapFilters) {
  return filters.targetWeeds.length > 0 || filters.provinces.length > 0;
}

export function MapFiltersPanel({ points, targetWeeds, appliedFilters, onConfirm, onCancel }: MapFiltersPanelProps) {
  const { copy } = useLanguage();
  const [draftFilters, setDraftFilters] = useState<MapFilters>(appliedFilters);
  const [openSection, setOpenSection] = useState<"weeds" | "provinces">("weeds");
  const resultCount = useMemo(() => filterMapPoints(points, draftFilters).length, [draftFilters, points]);

  useEffect(() => {
    setDraftFilters(appliedFilters);
  }, [appliedFilters]);

  return (
    <div className="filter-panel" role="dialog" aria-modal="false" aria-labelledby="filter-panel-title">
      <div className="filter-panel-header">
        <span>{copy.filters}</span>
        <strong id="filter-panel-title">{copy.resultsFound}: {resultCount}</strong>
        <button type="button" className="filter-panel-close" onClick={onCancel} aria-label={copy.closeFilters}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="filter-panel-body">
        <section className={`filter-accordion${openSection === "weeds" ? " is-open" : ""}`}>
          <button type="button" onClick={() => setOpenSection("weeds")} aria-expanded={openSection === "weeds"}>
            <span>{copy.filterByWeed}</span>
            <b>{draftFilters.targetWeeds.length || copy.all}</b>
          </button>
          {openSection === "weeds" && (
            <>
              <div className="filter-section-actions">
                <button type="button" onClick={() => setDraftFilters({ ...draftFilters, targetWeeds: [] })}>
                  {copy.selectAll}
                </button>
                <button
                  type="button"
                  disabled={draftFilters.targetWeeds.length === 0}
                  onClick={() => setDraftFilters({ ...draftFilters, targetWeeds: [] })}
                >
                  {copy.clearFilter}
                </button>
              </div>
              <div className="filter-options">
                {targetWeeds.map((weed) => {
                  const { commonName, scientificName } = splitWeedLabel(weed);
                  return (
                    <label key={weed} className="filter-check">
                      <input
                        type="checkbox"
                        checked={draftFilters.targetWeeds.includes(weed)}
                        onChange={() => setDraftFilters({ ...draftFilters, targetWeeds: toggle(draftFilters.targetWeeds, weed) })}
                      />
                      <span className="filter-check-text">
                        <span>{commonName}</span>
                        {scientificName && <em>{scientificName}</em>}
                      </span>
                    </label>
                  );
                })}
                {targetWeeds.length === 0 && <p>{copy.noTargetWeeds}</p>}
              </div>
            </>
          )}
        </section>

        <section className={`filter-accordion${openSection === "provinces" ? " is-open" : ""}`}>
          <button type="button" onClick={() => setOpenSection("provinces")} aria-expanded={openSection === "provinces"}>
            <span>{copy.filterByProvince}</span>
            <b>{draftFilters.provinces.length || copy.all}</b>
          </button>
          {openSection === "provinces" && (
            <>
              <div className="filter-section-actions">
                <button type="button" onClick={() => setDraftFilters({ ...draftFilters, provinces: [] })}>
                  {copy.selectAll}
                </button>
                <button
                  type="button"
                  disabled={draftFilters.provinces.length === 0}
                  onClick={() => setDraftFilters({ ...draftFilters, provinces: [] })}
                >
                  {copy.clearFilter}
                </button>
              </div>
              <div className="filter-options">
                {ARGENTINA_PROVINCES.map((province) => (
                  <label key={province} className="filter-check">
                    <input
                      type="checkbox"
                      checked={draftFilters.provinces.includes(province)}
                      onChange={() => setDraftFilters({ ...draftFilters, provinces: toggle(draftFilters.provinces, province) })}
                    />
                    <span className="filter-check-text">
                      <span>{province}</span>
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <div className="filter-panel-actions">
        <button type="button" onClick={onCancel}>{copy.cancel}</button>
        <button type="button" onClick={() => onConfirm(draftFilters)}>{copy.confirm}</button>
      </div>
    </div>
  );
}
