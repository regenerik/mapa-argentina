"use client";

import { useEffect, useMemo, useState } from "react";
import { ARGENTINA_PROVINCES } from "@/data/province-options";
import { useLanguage } from "@/components/LanguageProvider";
import type { MapFilters, MapPoint } from "@/types/map";

interface MapFiltersPanelProps {
  points: MapPoint[];
  targetWeeds: string[];
  appliedFilters: MapFilters;
  onChange: (filters: MapFilters) => void;
  onCancel: () => void;
}

const NO_FILTER_SELECTION = "__NO_FILTER_SELECTION__";

function isNoFilterSelection(values: string[]) {
  return values.includes(NO_FILTER_SELECTION);
}

function toggle(values: string[], value: string, allValues: readonly string[]) {
  const activeValues = isNoFilterSelection(values) ? [] : values.length === 0 ? allValues : values;
  const nextValues = activeValues.includes(value)
    ? activeValues.filter((current) => current !== value)
    : [...activeValues, value];

  if (nextValues.length === 0) return [NO_FILTER_SELECTION];
  return nextValues.length === allValues.length ? [] : nextValues;
}

function isOptionChecked(values: string[], value: string) {
  if (isNoFilterSelection(values)) return false;
  return values.length === 0 || values.includes(value);
}

function getSectionSummary(values: string[], allLabel: string) {
  if (isNoFilterSelection(values)) return 0;
  return values.length || allLabel;
}

function splitWeedLabel(weed: string) {
  const [commonName, ...scientificNameParts] = weed.split(" - ");
  return {
    commonName: commonName.trim(),
    scientificName: scientificNameParts.join(" - ").trim(),
  };
}

function pointMatches(point: MapPoint, filters: MapFilters) {
  const weedMatch = !isNoFilterSelection(filters.targetWeeds)
    && (filters.targetWeeds.length === 0 || point.targetWeeds.some((weed) => filters.targetWeeds.includes(weed)));
  const provinceMatch = !isNoFilterSelection(filters.provinces)
    && (filters.provinces.length === 0 || filters.provinces.includes(point.province));
  return weedMatch && provinceMatch;
}

export function filterMapPoints(points: MapPoint[], filters: MapFilters) {
  return points.filter((point) => pointMatches(point, filters));
}

export function hasActiveFilters(filters: MapFilters) {
  return filters.targetWeeds.length > 0 || filters.provinces.length > 0;
}

export function MapFiltersPanel({ points, targetWeeds, appliedFilters, onChange, onCancel }: MapFiltersPanelProps) {
  const { copy } = useLanguage();
  const [draftFilters, setDraftFilters] = useState<MapFilters>(appliedFilters);
  const [openSection, setOpenSection] = useState<"weeds" | "provinces">("weeds");
  const resultCount = useMemo(() => filterMapPoints(points, draftFilters).length, [draftFilters, points]);

  useEffect(() => {
    setDraftFilters(appliedFilters);
  }, [appliedFilters]);

  function applyFilters(filters: MapFilters) {
    setDraftFilters(filters);
    onChange(filters);
  }

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
            <b>{getSectionSummary(draftFilters.targetWeeds, copy.all)}</b>
          </button>
          {openSection === "weeds" && (
            <>
              <div className="filter-section-actions">
                <button type="button" onClick={() => applyFilters({ ...draftFilters, targetWeeds: [] })}>
                  {copy.selectAll}
                </button>
                <button
                  type="button"
                  disabled={isNoFilterSelection(draftFilters.targetWeeds)}
                  onClick={() => applyFilters({ ...draftFilters, targetWeeds: [NO_FILTER_SELECTION] })}
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
                        checked={isOptionChecked(draftFilters.targetWeeds, weed)}
                        onChange={() => applyFilters({ ...draftFilters, targetWeeds: toggle(draftFilters.targetWeeds, weed, targetWeeds) })}
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
            <b>{getSectionSummary(draftFilters.provinces, copy.all)}</b>
          </button>
          {openSection === "provinces" && (
            <>
              <div className="filter-section-actions">
                <button type="button" onClick={() => applyFilters({ ...draftFilters, provinces: [] })}>
                  {copy.selectAll}
                </button>
                <button
                  type="button"
                  disabled={isNoFilterSelection(draftFilters.provinces)}
                  onClick={() => applyFilters({ ...draftFilters, provinces: [NO_FILTER_SELECTION] })}
                >
                  {copy.clearFilter}
                </button>
              </div>
              <div className="filter-options">
                {ARGENTINA_PROVINCES.map((province) => (
                  <label key={province} className="filter-check">
                    <input
                      type="checkbox"
                      checked={isOptionChecked(draftFilters.provinces, province)}
                      onChange={() => applyFilters({ ...draftFilters, provinces: toggle(draftFilters.provinces, province, ARGENTINA_PROVINCES) })}
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
    </div>
  );
}
