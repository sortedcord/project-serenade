import { LAMP_LIGHT } from '../content/lighting';
import type { GameMap, GeneratedRoom } from '../world/GameMap';
import type { MapTheme } from '../themes/MapTheme';
import { themes } from '../content/themes';
import { TileTypes } from '../world/TileTypes';
import { SeededRandom } from './SeededRandom';
import { validateMap } from './MapValidator';

export interface GeneratorOptions {
  seed: string;
  id?: string;
  title?: string;
  width?: number;
  height?: number;
  minRoomSize?: number;
  maxRoomSize?: number;
  minRoomCount?: number;
  maxRoomCount?: number;
  roomPadding?: number;
  corridorWidth?: number;
  loopChance?: number;
  wallMaterials?: number[];
  propDensity?: number;
  theme?: string | MapTheme;
}

interface NormalizedOptions extends GeneratorOptions {
  width: number; height: number; minRoomSize: number; maxRoomSize: number;
  minRoomCount: number; maxRoomCount: number; roomPadding: number;
  corridorWidth: number; loopChance: number; propDensity: number;
  themeData: MapTheme;
}

function normalizeOptions(options: GeneratorOptions): NormalizedOptions {
  const themeData = typeof options.theme === 'object' ? options.theme : themes[options.theme ?? 'industrial'];
  if (!themeData) throw new Error(`Unknown map theme: ${options.theme}`);
  const normalized: NormalizedOptions = {
    ...options,
    width: options.width ?? 32, height: options.height ?? 32,
    minRoomSize: options.minRoomSize ?? 4, maxRoomSize: options.maxRoomSize ?? 8,
    minRoomCount: options.minRoomCount ?? 5, maxRoomCount: options.maxRoomCount ?? 9,
    roomPadding: options.roomPadding ?? 1, corridorWidth: options.corridorWidth ?? 3,
    loopChance: options.loopChance ?? 0.18, propDensity: options.propDensity ?? 0.06,
    themeData,
  };
  if (!options.seed) throw new Error('Map generation requires a non-empty seed');
  if (!Number.isInteger(normalized.width) || !Number.isInteger(normalized.height) || normalized.width < 12 || normalized.height < 12) throw new Error('Map dimensions must be integers of at least 12x12');
  if (!Number.isInteger(normalized.minRoomSize) || !Number.isInteger(normalized.maxRoomSize) || normalized.minRoomSize < 3 || normalized.maxRoomSize < normalized.minRoomSize) throw new Error('Room sizes must be integers with 3 <= minRoomSize <= maxRoomSize');
  if (!Number.isInteger(normalized.minRoomCount) || !Number.isInteger(normalized.maxRoomCount) || normalized.minRoomCount < 2 || normalized.maxRoomCount < normalized.minRoomCount) throw new Error('Room counts must be integers with 2 <= minRoomCount <= maxRoomCount');
  if (!Number.isInteger(normalized.roomPadding) || normalized.roomPadding < 0) throw new Error('roomPadding must be a non-negative integer');
  if (!Number.isInteger(normalized.corridorWidth) || normalized.corridorWidth < 1 || normalized.corridorWidth > 3) throw new Error('corridorWidth must be an integer from 1 to 3');
  if (!Number.isFinite(normalized.loopChance) || normalized.loopChance < 0 || normalized.loopChance > 1 || !Number.isFinite(normalized.propDensity) || normalized.propDensity < 0 || normalized.propDensity > 1) throw new Error('loopChance and propDensity must be between 0 and 1');
  const materials = options.wallMaterials ?? themeData.wallMaterials;
  if (materials.length === 0 || materials.some(tile => !Number.isInteger(tile) || tile <= TileTypes.Floor)) throw new Error('wallMaterials must contain solid integer tile IDs');
  if (normalized.themeData.propTypes.length === 0) throw new Error('Theme must provide prop types');
  if (normalized.minRoomSize > normalized.width - 2 || normalized.minRoomSize > normalized.height - 2) throw new Error('Minimum room size does not fit inside map dimensions');
  if (normalized.maxRoomCount > (normalized.width - 2) * (normalized.height - 2)) throw new Error('Maximum room count exceeds available map area');
  return normalized;
}

function carveRoom(tiles: number[][], room: GeneratedRoom): void {
  for (let y = room.y; y < room.y + room.height; y++) for (let x = room.x; x < room.x + room.width; x++) tiles[y]![x] = TileTypes.Floor;
}

function carveCorridor(tiles: number[][], x1: number, y1: number, x2: number, y2: number, horizontalFirst: boolean, width: number): void {
  let x = x1, y = y1;
  const carve = (horizontal: boolean) => {
    const start = -Math.floor((width - 1) / 2);
    for (let offset = 0; offset < width; offset++) {
      const tx = x + (horizontal ? 0 : start + offset);
      const ty = y + (horizontal ? start + offset : 0);
      if (ty > 0 && ty < tiles.length - 1 && tx > 0 && tx < tiles[ty]!.length - 1) tiles[ty]![tx] = TileTypes.Floor;
    }
  };
  if (horizontalFirst) {
    carve(true);
    while (x !== x2) { x += Math.sign(x2 - x); carve(true); }
    carve(false);
    while (y !== y2) { y += Math.sign(y2 - y); carve(false); }
  } else {
    carve(false);
    while (y !== y2) { y += Math.sign(y2 - y); carve(false); }
    carve(true);
    while (x !== x2) { x += Math.sign(x2 - x); carve(true); }
  }
}

function buildMap(options: NormalizedOptions, seed: string): GameMap {
  const random = new SeededRandom(seed);
  const { width, height } = options;
  const tiles = Array.from({ length: height }, () => Array<number>(width).fill(TileTypes.Concrete));
  const wantedRooms = random.integer(options.minRoomCount, options.maxRoomCount);
  const rooms: GeneratedRoom[] = [];
  const maxAttempts = wantedRooms * 35;
  for (let attempt = 0; attempt < maxAttempts && rooms.length < wantedRooms; attempt++) {
    const roomWidth = random.integer(options.minRoomSize, Math.min(options.maxRoomSize, width - 2));
    const roomHeight = random.integer(options.minRoomSize, Math.min(options.maxRoomSize, height - 2));
    if (roomWidth > width - 2 || roomHeight > height - 2) continue;
    const x = random.integer(1, width - roomWidth - 1), y = random.integer(1, height - roomHeight - 1);
    const overlaps = rooms.some(room => x < room.x + room.width + options.roomPadding && x + roomWidth + options.roomPadding > room.x && y < room.y + room.height + options.roomPadding && y + roomHeight + options.roomPadding > room.y);
    if (overlaps) continue;
    rooms.push({ id: `room-${rooms.length}`, x, y, width: roomWidth, height: roomHeight, centerX: Math.floor(x + roomWidth / 2), centerY: Math.floor(y + roomHeight / 2), type: 'standard' });
    carveRoom(tiles, rooms[rooms.length - 1]!);
  }
  if (rooms.length < options.minRoomCount) throw new Error(`could place only ${rooms.length} of at least ${options.minRoomCount} rooms`);

  const ordered = [...rooms].sort((a, b) => a.centerX - b.centerX || a.centerY - b.centerY);
  const connections: Array<[GeneratedRoom, GeneratedRoom]> = [];
  for (let index = 1; index < ordered.length; index++) connections.push([ordered[index - 1]!, ordered[index]!]);
  for (let a = 0; a < ordered.length; a++) for (let b = a + 2; b < ordered.length; b++) {
    if (random.chance(options.loopChance / Math.max(1, ordered.length - 2))) connections.push([ordered[a]!, ordered[b]!]);
  }
  for (const [first, second] of connections) carveCorridor(tiles, first.centerX, first.centerY, second.centerX, second.centerY, random.chance(0.5), options.corridorWidth);

  // Spawn and exit are chosen from rooms at opposite ends of the connected room chain.
  const spawnRoom = ordered[0]!;
  const exitRoom = ordered[ordered.length - 1]!;
  const playerSpawn = { x: spawnRoom.centerX + 0.5, y: spawnRoom.centerY + 0.5, angle: random.float(-Math.PI, Math.PI) };
  const exitX = exitRoom.centerX, exitY = exitRoom.centerY;
  const exits = [{ id: `exit-${options.id ?? 'map'}`, x: exitX, y: exitY, direction: 'north' as const }];
  const occupied = new Set([`${spawnRoom.centerX},${spawnRoom.centerY}`, `${exitX},${exitY}`]);
  const entities: GameMap['entities'] = [{ id: `sign-exit-${options.id ?? 'map'}`, type: 'sign', x: exitX + 0.5, y: exitY + 0.5, properties: { label: 'Inter-map transit', renderScale: 0.8 } }];
  for (const room of rooms) {
    for (let y = room.y + 1; y < room.y + room.height - 1; y++) for (let x = room.x + 1; x < room.x + room.width - 1; x++) {
      const key = `${x},${y}`;
      if (occupied.has(key) || !random.chance(options.propDensity)) continue;
      occupied.add(key);
      const type = random.pick(options.themeData.propTypes);
      const properties = type === 'terminal' ? { interactable: true, label: 'Inactive terminal' } : undefined;
      entities.push({ id: `prop-${entities.length}`, type, x: x + 0.5, y: y + 0.5, properties, ...(type === 'lamp' ? { light: { ...LAMP_LIGHT } } : {}) });
    }
  }
  // Guarantee spawn-room lighting without consuming randomness or displacing props.
  let spawnLamp = entities.find(entity => entity.type === 'lamp' && Math.floor(entity.x) >= spawnRoom.x && Math.floor(entity.x) < spawnRoom.x + spawnRoom.width && Math.floor(entity.y) >= spawnRoom.y && Math.floor(entity.y) < spawnRoom.y + spawnRoom.height);
  if (!spawnLamp) {
    for (let y = spawnRoom.y; y < spawnRoom.y + spawnRoom.height && !spawnLamp; y++) for (let x = spawnRoom.x; x < spawnRoom.x + spawnRoom.width && !spawnLamp; x++) {
      const key = `${x},${y}`;
      if (occupied.has(key)) continue;
      const entityIndex = entities.findIndex(entity => Math.floor(entity.x) === x && Math.floor(entity.y) === y);
      if (entityIndex === -1) {
        occupied.add(key);
        entities.push({ id: `prop-${entities.length}`, type: 'lamp', x: x + 0.5, y: y + 0.5, light: { ...LAMP_LIGHT } });
        spawnLamp = entities[entities.length - 1];
      } else {
        const existing = entities[entityIndex]!;
        entities[entityIndex] = { id: existing.id, type: 'lamp', x: existing.x, y: existing.y, light: { ...LAMP_LIGHT } };
        spawnLamp = entities[entityIndex];
      }
    }
  }

  const wallMaterials = options.wallMaterials ?? options.themeData.wallMaterials;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (tiles[y]![x] !== TileTypes.Floor) tiles[y]![x] = random.pick(wallMaterials);
  }
  const map: GameMap = {
    id: options.id ?? 'generated-map', width, height, tiles, playerSpawn, entities, exits, rooms,
    metadata: {
      title: options.title, theme: options.themeData.id, seed,
      floorColor: options.themeData.floorColor, ceilingColor: options.themeData.ceilingColor,
      fogDistance: options.themeData.fogDistance, minimumBrightness: options.themeData.minimumBrightness,
      ambientBrightness: options.themeData.ambientBrightness,
    },
  };
  return map;
}

/** Generate a validated map; a failed pass retries with a stable derived seed. */
export function generateMap(input: GeneratorOptions): GameMap {
  const options = normalizeOptions(input);
  const failures: string[] = [];
  for (let attempt = 0; attempt < 10; attempt++) {
    const derivedSeed = attempt === 0 ? options.seed : `${options.seed}:attempt-${attempt}`;
    try {
      const map = buildMap(options, derivedSeed);
      const errors = validateMap(map);
      if (errors.length === 0) return map;
      failures.push(`attempt ${attempt + 1} (${derivedSeed}): ${errors.join(', ')}`);
    } catch (error) {
      failures.push(`attempt ${attempt + 1} (${derivedSeed}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`Procedural generation failed\nSeed: ${options.seed}\nMap: ${options.width}x${options.height}\nOptions: ${JSON.stringify(input)}\nReason: ${failures.join(' | ')}`);
}
