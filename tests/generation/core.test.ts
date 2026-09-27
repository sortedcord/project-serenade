import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../../src/generation/SeededRandom';
import { floodFill } from '../../src/generation/FloodFill';
import { gridDistances } from '../../src/generation/Pathfinding';

describe('deterministic grid primitives', () => {
  it('produces repeatable seeded random streams', () => {
    const a = new SeededRandom('shared-seed'), b = new SeededRandom('shared-seed');
    expect(Array.from({ length: 32 }, () => a.random())).toEqual(Array.from({ length: 32 }, () => b.random()));
    expect(new SeededRandom('different').random()).not.toBe(new SeededRandom('shared-seed').random());
  });
  it('flood-fills only reachable floor and measures distances', () => {
    const grid = [[1, 1, 1, 1, 1], [1, 0, 0, 1, 1], [1, 1, 0, 1, 0], [1, 1, 1, 1, 1]];
    const reachable = floodFill(grid, 1, 1);
    expect(reachable).toEqual(new Set(['1,1', '2,1', '2,2']));
    expect(gridDistances(grid, 1, 1).get('2,2')).toBe(2);
    expect(reachable.has('4,2')).toBe(false);
  });
});
