import type { GameMap } from '../world/GameMap';
import { isWalkableTile } from '../world/TileTypes';
import { floodFill } from './FloodFill';

/** Returns every detected structural or playability issue, in stable order. */
export function validateMap(map: GameMap): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(map.width) || !Number.isInteger(map.height) || map.width < 3 || map.height < 3) {
    errors.push('map dimensions must be integers of at least 3x3');
    return errors;
  }
  if (!Array.isArray(map.tiles) || map.tiles.length !== map.height || map.tiles.some(row => !Array.isArray(row) || row.length !== map.width)) {
    errors.push('tile rows do not match map dimensions');
    return errors;
  }
  const inBounds = (x: number, y: number) => Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x < map.width && y < map.height;
  let floors = 0;
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    const tile = map.tiles[y]![x]!;
    if (!Number.isInteger(tile) || tile < 0) errors.push(`invalid tile at ${x},${y}`);
    if (isWalkableTile(tile)) floors++;
    if ((x === 0 || y === 0 || x === map.width - 1 || y === map.height - 1) && isWalkableTile(tile)) errors.push(`open boundary at ${x},${y}`);
  }
  if (floors < 4) errors.push('not enough walkable area');
  if (floors / (map.width * map.height) < 0.05) errors.push('map is almost completely walls');
  if (floors / (map.width * map.height) > 0.9) errors.push('map is almost completely empty floor');
  const spawn = map.playerSpawn;
  if (!spawn || !inBounds(spawn.x, spawn.y)) errors.push('player spawn is outside map bounds');
  else if (!isWalkableTile(map.tiles[Math.floor(spawn.y)]?.[Math.floor(spawn.x)] ?? -1)) errors.push('player spawn is not on walkable floor');
  const entities = new Set<string>();
  for (const entity of map.entities ?? []) {
    if (!inBounds(entity.x, entity.y)) errors.push(`entity ${entity.id} is outside map bounds`);
    else if (!isWalkableTile(map.tiles[Math.floor(entity.y)]?.[Math.floor(entity.x)] ?? -1)) errors.push(`entity ${entity.id} is inside a wall`);
    const key = `${Math.floor(entity.x)},${Math.floor(entity.y)}`;
    if (spawn && key === `${Math.floor(spawn.x)},${Math.floor(spawn.y)}`) errors.push(`entity ${entity.id} overlaps player spawn`);
    if (entities.has(key)) errors.push(`multiple entities occupy ${key}`);
    entities.add(key);
  }
  for (const exit of map.exits ?? []) {
    if (!inBounds(exit.x, exit.y)) errors.push(`exit ${exit.id} is outside map bounds`);
    else if (!isWalkableTile(map.tiles[Math.floor(exit.y)]?.[Math.floor(exit.x)] ?? -1)) errors.push(`exit ${exit.id} is not on valid floor`);
  }
  if (spawn && inBounds(spawn.x, spawn.y) && isWalkableTile(map.tiles[Math.floor(spawn.y)]?.[Math.floor(spawn.x)] ?? -1)) {
    const reached = floodFill(map.tiles, Math.floor(spawn.x), Math.floor(spawn.y));
    if (reached.size !== floors) errors.push(`walkable area is disconnected (${reached.size} of ${floors} floor cells reachable)`);
    for (const exit of map.exits ?? []) if (!reached.has(`${Math.floor(exit.x)},${Math.floor(exit.y)}`)) errors.push(`exit ${exit.id} is unreachable from player spawn`);
  }
  return errors;
}

export function assertValidMap(map: GameMap): void {
  const errors = validateMap(map);
  if (errors.length) throw new Error(errors.join('; '));
}
