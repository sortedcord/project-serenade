import { describe, expect, it } from 'vitest';
import { floorTexelIndex, FLOOR_TEXTURE_SIZE } from '../../src/engine/FloorTexture';
import { floorRasterRegion, floorWorldSample } from '../../src/engine/FloorCasting';
import { cameraHorizon, createPlayer, lookPlayer, rotatePlayer } from '../../src/engine/Player';
import type { GameMap } from '../../src/world/GameMap';

const map: GameMap = {
  id: 'open-room', width: 40, height: 40,
  tiles: Array.from({ length: 40 }, (_, y) => Array.from({ length: 40 }, (_, x) =>
    x === 0 || y === 0 || x === 39 || y === 39 ? 1 : 0)),
  playerSpawn: { x: 12.5, y: 14.5, angle: 0 }, entities: [], exits: [], rooms: [], metadata: {},
};

describe('world-anchored floor sampling', () => {
  it('maps screen samples through the ground plane and keeps fixed world texels stable', () => {
    const player = createPlayer(map), sample = { x: 0, y: 0, distance: 0 };
    floorWorldSample(player, 210, 150, 320, 180, 90, sample);
    const worldPoint = { x: sample.x, y: sample.y };
    const index = floorTexelIndex(worldPoint.x, worldPoint.y);
    player.positionX += .43;
    player.positionY -= .27;
    rotatePlayer(player, .38);
    expect(floorTexelIndex(worldPoint.x, worldPoint.y)).toBe(index);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(FLOOR_TEXTURE_SIZE * FLOOR_TEXTURE_SIZE);
  });

  it('moves screen floor samples across texels after translation and rotation', () => {
    const player = createPlayer(map), sample = { x: 0, y: 0, distance: 0 };
    floorWorldSample(player, 210, 150, 320, 180, 90, sample);
    const firstTexel = floorTexelIndex(sample.x, sample.y);
    player.positionX += .5;
    floorWorldSample(player, 210, 150, 320, 180, 90, sample);
    const translatedTexel = floorTexelIndex(sample.x, sample.y);
    expect(translatedTexel).not.toBe(firstTexel);
    const beforeTurn = { x: sample.x, y: sample.y };
    rotatePlayer(player, .3);
    floorWorldSample(player, 210, 150, 320, 180, 90, sample);
    expect(floorTexelIndex(sample.x, sample.y)).not.toBe(floorTexelIndex(beforeTurn.x, beforeTurn.y));
  });

  it('clamps floor raster rows to the current horizon as pitch changes', () => {
    const player = createPlayer(map);
    const horizons = [cameraHorizon(player, 180)];
    lookPlayer(player, -.3);
    horizons.push(cameraHorizon(player, 180));
    lookPlayer(player, .6);
    horizons.push(cameraHorizon(player, 180));
    for (const horizon of horizons) {
      const firstFloorRow = Math.max(0, Math.ceil(horizon));
      expect(firstFloorRow).toBeGreaterThanOrEqual(0);
      expect(firstFloorRow).toBeLessThan(180);
      expect(180 - firstFloorRow).toBe(180 - Math.max(0, Math.ceil(horizon)));
    }
  });

  it('keeps reused floor raster rows strictly below the current horizon', () => {
    for (const horizon of [-20, 30.25, 90, 148.75, 220]) {
      const region = floorRasterRegion(horizon, 180);
      expect(region.startY).toBeGreaterThanOrEqual(0);
      expect(region.startY + region.height).toBe(180);
      expect(region.height).toBeLessThanOrEqual(180);
      if (region.height > 0) expect(region.startY).toBeGreaterThan(horizon - 1);
    }
  });

  it('tiles seamlessly at whole-world boundaries and varies within a tile', () => {
    expect(floorTexelIndex(3.1, 7.2)).toBe(floorTexelIndex(4.1, 7.2));
    expect(floorTexelIndex(3.1, 7.2)).not.toBe(floorTexelIndex(3.2, 7.2));
  });
});
