export const MAP_RESET_SCALE = 1.35;
export const ROTATED_MAP_RESET_SCALE = 1.9;

export function getMapResetTransform({
  width,
  height,
  isRotated,
  uiScale = 1,
}: {
  width: number;
  height: number;
  isRotated: boolean;
  uiScale?: number;
}) {
  const scale = isRotated ? ROTATED_MAP_RESET_SCALE : MAP_RESET_SCALE;
  const rotatedScaleOffset = isRotated ? Math.max(0, uiScale - 1) * width * 0.22 : 0;

  return {
    scale,
    positionX: (width * (1 - scale)) / 2 - rotatedScaleOffset,
    positionY: (height * (1 - scale)) / 2,
  };
}
