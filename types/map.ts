export type MapMode = "view" | "edit";

export type TimelineDay = string;

export type ImagePreviewViewport = "desktop" | "mobile";

export interface ImagePreviewPosition {
  x: number;
  y: number;
  zoom: number;
}

export interface ImagePreviewSettings {
  desktop?: ImagePreviewPosition;
  mobile?: ImagePreviewPosition;
}

export interface MapPointImage {
  day: TimelineDay;
  daysFromBase: number;
  title?: string;
  imageUrl: string;
  publicId?: string;
  isBase?: boolean;
  previewPosition?: ImagePreviewSettings;
}

export interface MapPoint {
  id: string;
  title: string;
  description: string;
  coordinates: [longitude: number, latitude: number];
  thumbnailUrl: string;
  thumbnailPublicId?: string;
  images: MapPointImage[];
  targetWeeds: string[];
  province: string;
  locality?: string;
  advisor?: string;
  dose?: string;
}

export interface ProvinceLabel {
  name: string;
  shortName?: string;
  coordinates: [longitude: number, latitude: number];
  offset?: [x: number, y: number];
}

export interface MapCatalog {
  targetWeeds: string[];
  filtersEnabled: boolean;
}

export interface MapFilters {
  targetWeeds: string[];
  provinces: string[];
  localities: string[];
}
