import type { GameMap } from '../../world/GameMap';
import type { MapEntity } from '../../world/MapEntity';
import { isWalkableTile } from '../../world/TileTypes';
export interface MapLighting {
  sample(x: number, y: number): number;
}

const SAMPLES_PER_TILE = 4;
const lightingCache = new WeakMap<GameMap, MapLighting>();

function tileAt(map: GameMap, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return -1;
  return map.tiles[y]?.[x] ?? -1;
}

function isOpaque(map: GameMap, x: number, y: number): boolean {
  const tile = tileAt(map, x, y);
  return tile < 0 || !isWalkableTile(tile);
}

/** Grid DDA; exact corner crossings conservatively test both touching cells. */
function hasLineOfSight(map: GameMap, fromX: number, fromY: number, toX: number, toY: number): boolean {
  let cellX = Math.floor(fromX);
  let cellY = Math.floor(fromY);
  const endX = Math.floor(toX);
  const endY = Math.floor(toY);
  if (isOpaque(map, cellX, cellY)) return false;
  if (cellX === endX && cellY === endY) return true;

  const dx = toX - fromX;
  const dy = toY - fromY;
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  const deltaX = stepX === 0 ? Infinity : Math.abs(1 / dx);
  const deltaY = stepY === 0 ? Infinity : Math.abs(1 / dy);
  let maxX = stepX > 0 ? (Math.floor(fromX) + 1 - fromX) * deltaX : stepX < 0 ? (fromX - Math.floor(fromX)) * deltaX : Infinity;
  let maxY = stepY > 0 ? (Math.floor(fromY) + 1 - fromY) * deltaY : stepY < 0 ? (fromY - Math.floor(fromY)) * deltaY : Infinity;

  while (cellX !== endX || cellY !== endY) {
    if (Math.abs(maxX - maxY) < 1e-10) {
      const nextX = cellX + stepX;
      const nextY = cellY + stepY;
      if (isOpaque(map, nextX, cellY) || isOpaque(map, cellX, nextY)) return false;
      cellX = nextX;
      cellY = nextY;
      maxX += deltaX;
      maxY += deltaY;
      if (isOpaque(map, cellX, cellY)) return false;
    } else if (maxX < maxY) {
      cellX += stepX;
      maxX += deltaX;
      if (isOpaque(map, cellX, cellY)) return false;
    } else {
      cellY += stepY;
      maxY += deltaY;
      if (isOpaque(map, cellX, cellY)) return false;
    }
  }
  return true;
}

function createLighting(map: GameMap): MapLighting {
  const gridWidth = map.width * SAMPLES_PER_TILE;
  const gridHeight = map.height * SAMPLES_PER_TILE;
  const values = new Float32Array(gridWidth * gridHeight);
  const entities: MapEntity[] = map.entities;

  for (const entity of entities) {
    const light = entity.light;
    if (!light || !Number.isFinite(entity.x) || !Number.isFinite(entity.y) ||
        !Number.isFinite(light.intensity) || !Number.isFinite(light.radius) ||
        light.intensity <= 0 || light.radius <= 0) continue;

    const minX = Math.max(0, Math.floor((entity.x - light.radius) * SAMPLES_PER_TILE));
    const maxX = Math.min(gridWidth - 1, Math.ceil((entity.x + light.radius) * SAMPLES_PER_TILE) - 1);
    const minY = Math.max(0, Math.floor((entity.y - light.radius) * SAMPLES_PER_TILE));
    const maxY = Math.min(gridHeight - 1, Math.ceil((entity.y + light.radius) * SAMPLES_PER_TILE) - 1);
    const radiusSquared = light.radius * light.radius;

    for (let gy = minY; gy <= maxY; gy++) {
      const y = (gy + 0.5) / SAMPLES_PER_TILE;
      for (let gx = minX; gx <= maxX; gx++) {
        const x = (gx + 0.5) / SAMPLES_PER_TILE;
        if (isOpaque(map, Math.floor(x), Math.floor(y))) continue;
        const dx = x - entity.x;
        const dy = y - entity.y;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared >= radiusSquared || !hasLineOfSight(map, entity.x, entity.y, x, y)) continue;
        const t = Math.sqrt(distanceSquared) / light.radius;
        const falloff = 1 - t * t * (3 - 2 * t);
        const index = gy * gridWidth + gx;
        values[index] = Math.min(1, values[index]! + light.intensity * falloff);
      }
    }
  }

  return {
    sample(x: number, y: number): number {
      if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x >= map.width || y >= map.height) return 0;
      const gridX = Math.max(0, Math.min(gridWidth - 1, Math.floor(x * SAMPLES_PER_TILE)));
      const gridY = Math.max(0, Math.min(gridHeight - 1, Math.floor(y * SAMPLES_PER_TILE)));
      // Nearest-sample the baked field: solid cells contain zero, so sampling
      // cannot blend illumination through walls and needs no per-pixel tile scan.
      return values[gridY * gridWidth + gridX]!;
    },
  };

}

export function getMapLighting(map: GameMap): MapLighting {
  let lighting = lightingCache.get(map);
  if (!lighting) {
    lighting = createLighting(map);
    lightingCache.set(map, lighting);
  }
  return lighting;
}
