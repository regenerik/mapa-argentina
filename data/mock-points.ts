import type { MapPoint, TimelineDay } from "@/types/map";

const DAY_ORDER: TimelineDay[] = ["1", "7", "15", "30", "60", "120"];

function makeAgroPlaceholder(title: string, day: TimelineDay, colors: [string, string, string]) {
  const [sky, field, accent] = colors;
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
        <text x="64" y="138" font-size="24" opacity=".75">Evolución del cultivo · Día ${day}</text>
      </g>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createImages(title: string, days: TimelineDay[], colors: [string, string, string]) {
  return DAY_ORDER
    .filter((day) => days.includes(day))
    .map((day) => ({ day, imageUrl: makeAgroPlaceholder(title, day, colors) }));
}

function createPoint(
  point: Omit<MapPoint, "thumbnailUrl" | "images">,
  days: TimelineDay[],
  colors: [string, string, string],
): MapPoint {
  const images = createImages(point.title, days, colors);
  return { ...point, thumbnailUrl: images[0].imageUrl, images };
}

export const mockMapPoints: MapPoint[] = [
  createPoint(
    {
      id: "buenos-aires",
      title: "Buenos Aires",
      description: "Seguimiento de un lote de maíz de alto rendimiento, con monitoreo periódico de cobertura y desarrollo vegetativo.",
      coordinates: [-59.35, -35.75],
    },
    ["1", "15", "30", "60", "120"],
    ["#175e78", "#397b4b", "#efc85b"],
  ),
  createPoint(
    {
      id: "cordoba",
      title: "Córdoba",
      description: "Evolución de soja bajo manejo de precisión, observando vigor, uniformidad y respuesta del cultivo durante la campaña.",
      coordinates: [-64.55, -32.25],
    },
    ["1", "7", "30", "120"],
    ["#284e78", "#4f8248", "#ffbe55"],
  ),
  createPoint(
    {
      id: "santa-fe",
      title: "Santa Fe",
      description: "Ensayo demostrativo de trigo con registro visual de emergencia, macollaje y consolidación del lote.",
      coordinates: [-60.75, -29.65],
    },
    ["1", "15", "60"],
    ["#146575", "#547c38", "#f3d66a"],
  ),
  createPoint(
    {
      id: "tucuman",
      title: "Tucumán",
      description: "Parcela de caña de azúcar monitoreada a lo largo del ciclo para visualizar crecimiento y cierre del surco.",
      coordinates: [-65.45, -26.75],
    },
    ["1", "7", "15", "30", "60", "120"],
    ["#1b536a", "#2e7648", "#ffd268"],
  ),
];
