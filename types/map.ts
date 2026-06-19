export type MapMode = "view" | "edit";

export type TimelineDay = "1" | "7" | "15" | "30" | "60" | "120";

export interface MapPointImage {
  day: TimelineDay;
  imageUrl: string;
  publicId?: string;
}

export interface MapPoint {
  id: string;
  title: string;
  description: string;
  coordinates: [longitude: number, latitude: number];
  thumbnailUrl: string;
  thumbnailPublicId?: string;
  images: MapPointImage[];
}

export interface ProvinceLabel {
  name: string;
  shortName?: string;
  coordinates: [longitude: number, latitude: number];
  offset?: [x: number, y: number];
}
