import { describe, expect, it } from 'vitest';
import { Raycaster } from '../../src/engine/Raycaster';
import { createPlayer, rotatePlayer } from '../../src/engine/Player';
import type { GameMap } from '../../src/world/GameMap';

const map: GameMap = {
  id: 'distant-block', width: 26, height: 13,
  tiles: Array.from({ length: 13 }, (_, y) => Array.from({ length: 26 }, (_, x) =>
    x === 0 || x === 25 || y === 0 || y === 12 || (x === 16 && y >= 5 && y <= 7) ? 1 : 0)),
  playerSpawn: { x: 2.5, y: 6.5, angle: 0 }, entities: [], exits: [], rooms: [], metadata: {},
};

describe('minimap scene footprint', () => {
  it('retains the exact blocking tile ahead beyond the former local-map radius', () => {
    const player = createPlayer(map), rays = new Raycaster(320, 180);
    rays.cast(map, player);
    expect(rays.depthBuffer[160]).toBe(13.5);
    expect(rays.hitTileX[160]).toBe(16);
    expect(rays.hitTileY[160]).toBe(6);
    rotatePlayer(player, Math.PI);
    rays.cast(map, player);
    expect(rays.hitTileX[160]).toBe(0);
    expect(rays.hitTileY[160]).toBe(6);
    expect(rays.depthBuffer[160]).toBeCloseTo(1.5);
  });
});
