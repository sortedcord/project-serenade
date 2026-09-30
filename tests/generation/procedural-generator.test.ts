import { describe, expect, it } from 'vitest';
import { generateMap } from '../../src/generation/ProceduralGenerator';
import { validateMap } from '../../src/generation/MapValidator';
import { floodFill } from '../../src/generation/FloodFill';
import { TileTypes } from '../../src/world/TileTypes';
import { LAMP_LIGHT } from '../../src/content/lighting';

describe('procedural map generation', () => {
  it('generates identical maps for the same seed and options', () => {
    const options = { seed: 'repeatable', width: 36, height: 32, propDensity: 0.2, loopChance: 0.3 };
    expect(generateMap(options)).toEqual(generateMap(options));
  });

  it('produces sealed, connected maps with walkable spawn and reachable exit', () => {
    const map = generateMap({ seed: 'connected', minRoomCount: 6, maxRoomCount: 6 });
    expect(validateMap(map)).toEqual([]);
    for (let x = 0; x < map.width; x++) {
      expect(map.tiles[0]![x]).not.toBe(TileTypes.Floor);
      expect(map.tiles[map.height - 1]![x]).not.toBe(TileTypes.Floor);
    }
    for (let y = 0; y < map.height; y++) {
      expect(map.tiles[y]![0]).not.toBe(TileTypes.Floor);
      expect(map.tiles[y]![map.width - 1]).not.toBe(TileTypes.Floor);
    }
    const reached = floodFill(map.tiles, Math.floor(map.playerSpawn.x), Math.floor(map.playerSpawn.y));
    expect(map.exits.every(exit => reached.has(`${exit.x},${exit.y}`))).toBe(true);
    expect(map.entities.every(entity => `${Math.floor(entity.x)},${Math.floor(entity.y)}` !== `${Math.floor(map.playerSpawn.x)},${Math.floor(map.playerSpawn.y)}`)).toBe(true);
  });
  it('guarantees a valid spawn-room lamp with the shared light descriptor', () => {
    const map = generateMap({ seed: 'spawn-light', propDensity: 0 });
    const spawnX = Math.floor(map.playerSpawn.x), spawnY = Math.floor(map.playerSpawn.y);
    const spawnRoom = map.rooms.find(room => spawnX >= room.x && spawnX < room.x + room.width && spawnY >= room.y && spawnY < room.y + room.height)!;
    const lamp = map.entities.find(entity => entity.type === 'lamp' && Math.floor(entity.x) >= spawnRoom.x && Math.floor(entity.x) < spawnRoom.x + spawnRoom.width && Math.floor(entity.y) >= spawnRoom.y && Math.floor(entity.y) < spawnRoom.y + spawnRoom.height);
    expect(lamp).toBeDefined();
    expect(map.tiles[Math.floor(lamp!.y)]![Math.floor(lamp!.x)]).toBe(TileTypes.Floor);
    expect(`${Math.floor(lamp!.x)},${Math.floor(lamp!.y)}`).not.toBe(`${spawnX},${spawnY}`);
    expect(map.exits.some(exit => exit.x === Math.floor(lamp!.x) && exit.y === Math.floor(lamp!.y))).toBe(false);
    expect(lamp!.light).toEqual(LAMP_LIGHT);
    expect(map.entities.filter(entity => entity.type === 'lamp').every(entity => entity.light && entity.light.intensity > 0 && entity.light.radius > 0)).toBe(true);
  });

  it('honors configured dimensions, theme metadata, room count, and material set', () => {
    const map = generateMap({ seed: 'custom', width: 40, height: 35, minRoomCount: 4, maxRoomCount: 4, theme: 'sewer', wallMaterials: [TileTypes.Stone] });
    expect([map.width, map.height]).toEqual([40, 35]);
    expect(map.rooms).toHaveLength(4);
    expect(map.metadata.theme).toBe('sewer');
    expect(map.tiles.flat().filter(tile => tile === TileTypes.Concrete || tile === TileTypes.Brick || tile === TileTypes.Metal)).toHaveLength(0);
  });

  it('rejects invalid options with actionable errors', () => {
    expect(() => generateMap({ seed: 'bad', width: 4 })).toThrow(/at least 12x12/);
    expect(() => generateMap({ seed: 'bad', theme: 'missing' })).toThrow(/Unknown map theme/);
  });
});
