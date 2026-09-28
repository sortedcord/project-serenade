import { describe, expect, it } from 'vitest';
import { createPlayer } from '../../src/engine/Player';
import { Raycaster } from '../../src/engine/Raycaster';
import { TileTypes } from '../../src/world/TileTypes';
import type { GameMap } from '../../src/world/GameMap';

const tiles = Array.from({ length: 7 }, (_, y) => Array.from({ length: 8 }, (_, x) =>
  x === 0 || y === 0 || x === 7 || y === 6 || (x === 4 && y >= 2 && y <= 4) ? TileTypes.Brick : TileTypes.Floor,
));
tiles[1]![3] = TileTypes.Brick;
const map: GameMap = {
  id: 'corner', width: 8, height: 7, tiles,
  playerSpawn: { x: 2.5, y: 2.1, angle: 0 }, entities: [], exits: [], rooms: [], metadata: {},
};

describe('geometry-driven ambient occlusion', () => {
  it('darkens concave wall corners but not open portions of the same face, without altering ray depth', () => {
    const player = createPlayer(map);
    const rays = new Raycaster(320, 180);
    rays.cast(map, player);
    const nearCorner = rays.cornerOcclusion[160];
    const depth = rays.depthBuffer[160];
    expect(nearCorner).toBeGreaterThan(0.5);
    player.positionY = 2.5;
    rays.cast(map, player);
    expect(rays.cornerOcclusion[160]).toBe(0);
    expect(rays.depthBuffer[160]).toBe(depth);
    player.positionY = 2.1;
    tiles[1]![3] = TileTypes.Floor;
    rays.cast(map, player);
    expect(rays.cornerOcclusion[160]).toBe(0);
    tiles[1]![3] = TileTypes.Brick;
  });
});
