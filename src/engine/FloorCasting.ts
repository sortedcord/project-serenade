import type { Player } from './Player';

export interface FloorSample { x: number; y: number; distance: number }

/** Writes a screen-space floor intersection into reusable state, anchored to world coordinates. */
export function floorWorldSample(
  player: Player,
  screenX: number,
  screenY: number,
  width: number,
  height: number,
  horizon: number,
  sample: FloorSample,
): void {
  const rowDistance = height * 0.5 / Math.max(0.5, screenY - horizon);
  const cameraX = 2 * (screenX + 0.5) / width - 1;
  const rayX = player.directionX + player.planeX * cameraX;
  const rayY = player.directionY + player.planeY * cameraX;
  sample.x = player.positionX + rayX * rowDistance;
  sample.y = player.positionY + rayY * rowDistance;
  sample.distance = rowDistance;
}
export interface FloorRasterRegion { startY: number; height: number }

export function floorRasterRegion(horizon: number, screenHeight: number): FloorRasterRegion {
  const startY = Math.min(screenHeight, Math.max(0, Math.ceil(horizon)));
  return { startY, height: screenHeight - startY };
}
