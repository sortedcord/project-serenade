import type { GameMap } from '../world/GameMap';
import { isWalkableTile } from '../world/TileTypes';

/** Returns true when a circle can occupy the requested world position. */
export function canOccupy(map: GameMap, x: number, y: number, radius: number): boolean {
  const minX = Math.floor(x - radius);
  const maxX = Math.floor(x + radius);
  const minY = Math.floor(y - radius);
  const maxY = Math.floor(y + radius);

  for (let tileY = minY; tileY <= maxY; tileY += 1) {
    for (let tileX = minX; tileX <= maxX; tileX += 1) {
      if (tileY < 0 || tileY >= map.height || tileX < 0 || tileX >= map.width) return false;
      if (isWalkableTile(map.tiles[tileY][tileX])) continue;
      const nearestX = Math.max(tileX, Math.min(x, tileX + 1));
      const nearestY = Math.max(tileY, Math.min(y, tileY + 1));
      const dx = x - nearestX;
      const dy = y - nearestY;
      if (dx * dx + dy * dy < radius * radius) return false;
    }
  }
  return true;
}

/** Applies independent X/Y movement, allowing the player to slide along walls. */
export function moveWithCollision(
  map: GameMap,
  x: number,
  y: number,
  dx: number,
  dy: number,
  radius: number,
  result: { x: number; y: number },
): void {
  let nextX = x + dx;
  let nextY = y;
  if (!canOccupy(map, nextX, y, radius)) nextX = x;
  if (!canOccupy(map, nextX, y + dy, radius)) nextY = y;
  else nextY = y + dy;
  result.x = nextX;
  result.y = nextY;
}
