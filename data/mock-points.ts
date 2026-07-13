import type { MapPoint } from "@/types/map";

function makeAgroPlaceholder(title: string, day: number, colors: [string, string, string]) {
  const [sky, field, accent] = colors;
  const label = day === 0 ? "Foto base" : `Dia ${day}`;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${sky}"/>
          <stop offset="1" stop-color="#122c3a"/>
        </linearGradient>
        <linearGradient id="field" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${field}"/>
          <stop offset="1" stop-color="#163a32"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#sky)"/>
      <circle cx="930" cy="160" r="70" fill="${accent}" opacity=".9"/>
      <path d="M0 410C260 330 390 470 610 400S970 320 1200 410V800H0Z" fill="url(#field)"/>
      <g fill="none" stroke="${accent}" stroke-width="10" opacity=".42">
        <path d="M80 800Q310 490 570 410"/><path d="M310 800Q470 510 650 410"/>
        <path d="M580 800Q660 520 740 400"/><path d="M900 800Q850 510 830 390"/>
        <path d="M1130 800Q990 500 900 390"/>
      </g>
      <g fill="#eaf8f3" font-family="Arial, sans-serif">
        <text x="64" y="92" font-size="34" font-weight="700">${title}</text>
        <text x="64" y="138" font-size="24" opacity=".75">${label}</text>
      </g>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createPoint(
  point: Omit<MapPoint, "thumbnailUrl" | "images" | "thumbnailPublicId">,
  days: number[],
  colors: [string, string, string],
): MapPoint {
  const images = days.map((daysFromBase) => ({
    day: String(daysFromBase),
    daysFromBase,
    imageUrl: makeAgroPlaceholder(point.title, daysFromBase, colors),
  }));
  return { ...point, thumbnailUrl: images[0].imageUrl, images };
}

export const mockMapPoints: MapPoint[] = [
  createPoint(
    {
      id: "buenos-aires",
      title: "Buenos Aires",
      description: "Seguimiento de un lote demostrativo con monitoreo periodico de control de malezas.",
      coordinates: [-59.35, -35.75],
      targetWeeds: ["Rama negra - Conyza bonariensis/sumatrensis"],
      province: "Buenos Aires",
      locality: "Pergamino",
      advisor: "",
      dose: "",
    },
    [0, 7, 15, 30],
    ["#175e78", "#397b4b", "#efc85b"],
  ),
];
