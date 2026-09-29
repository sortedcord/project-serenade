import { describe, expect, it } from 'vitest';
import { MinimapDiscovery } from '../../src/engine/MinimapDiscovery';
import { Raycaster } from '../../src/engine/Raycaster';
import { createPlayer, rotatePlayer } from '../../src/engine/Player';
import type { GameMap } from '../../src/world/GameMap';

function makeMap(id: string): GameMap {
  return {
    id, width: 12, height: 9,
    tiles: Array.from({ length: 9 }, (_, y) => Array.from({ length: 12 }, (_, x) =>
      x === 0 || y === 0 || x === 11 || y === 8 || (x === 7 && y >= 2 && y <= 6) ? 1 : 0)),
    playerSpawn: { x: 3.5, y: 4.5, angle: 0 }, entities: [], exits: [], rooms: [], metadata: {},
  };
}

describe('frameless automap discovery', () => {
  it('remembers visible geometry when turning without discovering floor behind walls', () => {
    const map = makeMap('a'), player = createPlayer(map), rays = new Raycaster(320, 180);
    const discovery = new MinimapDiscovery();
    rays.cast(map, player);
    const explored = discovery.update(map, rays.visibleCells);
    expect(explored[4 * map.width + 7]).toBe(1);
    expect(explored[4 * map.width + 8]).toBe(0);
    rotatePlayer(player, Math.PI);
    rays.cast(map, player);
    discovery.update(map, rays.visibleCells);
    expect(rays.visibleCells[4 * map.width + 7]).toBe(0);
    expect(explored[4 * map.width + 7]).toBe(1);
    expect(explored[4 * map.width]).toBe(1);
  });

  it('keeps map discoveries separate and restores the original map memory on return', () => {
    const a = makeMap('a'), b = makeMap('b'), discovery = new MinimapDiscovery();
    const sight = new Uint8Array(a.width * a.height);
    sight[10] = 1;
    const memory = discovery.update(a, sight);
    sight.fill(0);
    expect(discovery.update(b, sight)[10]).toBe(0);
    expect(discovery.update(a, sight)).toBe(memory);
    expect(memory[10]).toBe(1);
  });
});
