import { describe, expect, it } from 'vitest';
import { getMapLighting } from '../../src/engine/lighting/LightMap';
import type { GameMap } from '../../src/world/GameMap';
import { TileTypes } from '../../src/world/TileTypes';

function createMap(entities: GameMap['entities'] = [], width = 10, height = 10): GameMap {
  return {
    id: 'light-map', width, height,
    tiles: Array.from({ length: height }, () => Array<number>(width).fill(TileTypes.Floor)),
    playerSpawn: { x: 1.5, y: 1.5, angle: 0 },
    entities, exits: [], rooms: [], metadata: {},
  };
}

function emitter(x: number, y: number, intensity: number, radius: number): GameMap['entities'][number] {
  return { id: `light-${x}-${y}`, type: 'light', x, y, light: { intensity, radius } };
}

describe('static map lighting', () => {
  it('applies smooth radial falloff and reaches zero at and beyond the cutoff', () => {
    const lighting = getMapLighting(createMap([emitter(4.5, 4.5, 0.8, 2)]));
    const near = lighting.sample(4.625, 4.625);
    const far = lighting.sample(5.875, 4.625);
    expect(near).toBeGreaterThan(far);
    expect(far).toBeGreaterThan(0);
    expect(lighting.sample(6.625, 4.625)).toBe(0);
  });

  it('blocks direct light behind opaque tiles and across conservative diagonal corner ties', () => {
    const wallMap = createMap([emitter(2.5, 3.5, 1, 5)]);
    wallMap.tiles[3]![4] = TileTypes.Brick;
    const wallLight = getMapLighting(wallMap);
    expect(wallLight.sample(5.125, 3.625)).toBe(0);
    expect(wallLight.sample(3.125, 3.625)).toBeGreaterThan(0);

    const cornerMap = createMap([emitter(2.5, 2.5, 1, 2)]);
    cornerMap.tiles[2]![3] = TileTypes.Brick;
    const cornerLight = getMapLighting(cornerMap);
    expect(cornerLight.sample(3.125, 3.125)).toBe(0);
  });

  it('adds overlapping emitters and clamps illumination at one', () => {
    const lighting = getMapLighting(createMap([
      emitter(4.5, 4.5, 0.7, 2),
      emitter(4.5, 4.5, 0.7, 2),
    ]));
    expect(lighting.sample(4.625, 4.625)).toBe(1);
  });

  it('returns zero outside the map and at solid sample locations', () => {
    const map = createMap([emitter(1.5, 1.5, 1, 3)]);
    map.tiles[1]![2] = TileTypes.Stone;
    const lighting = getMapLighting(map);
    expect(lighting.sample(-0.01, 1)).toBe(0);
    expect(lighting.sample(10, 1)).toBe(0);
    expect(lighting.sample(2.5, 1.5)).toBe(0);
    expect(lighting.sample(1.5, 1.5)).toBeGreaterThan(0);
  });

  it('caches the baked map lighting by map object identity', () => {
    const map = createMap([emitter(4.5, 4.5, 1, 2)]);
    const first = getMapLighting(map);
    expect(getMapLighting(map)).toBe(first);
    expect(getMapLighting({ ...map })).not.toBe(first);
  });
});
