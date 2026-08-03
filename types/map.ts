export type MapMode = "view" | "edit";

export type TimelineDay = string;

export interface MapPointImage {
  day: TimelineDay;
  daysFromBase: number;
  title?: string;
  imageUrl: string;
  publicId?: string;
  isBase?: boolean;
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
}
