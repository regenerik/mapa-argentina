export const MAP_RESET_SCALE = 1.35;
export const ROTATED_MAP_RESET_SCALE = 1.9;

export function getMapResetTransform({
  width,
  height,
  isRotated,
}: {
  width: number;
  height: number;
  isRotated: boolean;
}) {
  const scale = isRotated ? ROTATED_MAP_RESET_SCALE : MAP_RESET_SCALE;

  return {
    scale,
    positionX: (width * (1 - scale)) / 2,
    positionY: (height * (1 - scale)) / 2,
  };
}
