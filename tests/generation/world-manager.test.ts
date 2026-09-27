import { describe, expect, it } from 'vitest';
import { generateMap } from '../../src/generation/ProceduralGenerator';
import { validateMap } from '../../src/generation/MapValidator';
import { WorldManager } from '../../src/world/WorldManager';

describe('generated worlds', () => {
  it('keeps maps valid across 1000 deterministic seeds', () => {
    for (let seedIndex = 0; seedIndex < 1000; seedIndex++) {
      const map = generateMap({ seed: `stress-${seedIndex}` });
      expect(validateMap(map), `seed stress-${seedIndex}`).toEqual([]);
      expect(map.width).toBe(32);
      expect(map.height).toBe(32);
    }
  });

  it('caches connected maps and restores the same map on a return trip', () => {
    const world = new WorldManager('travel-seed');
    const original = world.currentMap;
    const originalTiles = original.tiles.map(row => [...row]);
    const outward = world.transition(original.exits[0]!);
    expect(outward?.map.id).toBe('pump-station');
    expect(world.currentMap).toBe(outward?.map);
    const returnExit = outward?.map.exits.find(exit => exit.targetMapId === original.id);
    expect(returnExit).toBeDefined();
    const home = world.transition(returnExit!);
    expect(home?.map).toBe(original);
    expect(world.currentMap).toBe(original);
    expect(original.tiles).toEqual(originalTiles);
    expect(world.state.discoveredMapIds).toEqual(['maintenance', 'pump-station']);
  });
});
