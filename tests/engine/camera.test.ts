import { describe, expect, it } from 'vitest';
import { cameraHorizon, createPlayer, lookPlayer, PLAYER_CONFIG, updatePlayer } from '../../src/engine/Player';
import { Raycaster } from '../../src/engine/Raycaster';
import { TileTypes } from '../../src/world/TileTypes';
import type { GameMap } from '../../src/world/GameMap';

const map: GameMap = {
  id: 'corridor', width: 12, height: 7,
  tiles: Array.from({ length: 7 }, (_, y) => Array.from({ length: 12 }, (_, x) => x === 0 || x === 11 || y < 2 || y > 4 ? TileTypes.Brick : TileTypes.Floor)),
  playerSpawn: { x: 2.5, y: 3.5, angle: 0 }, entities: [], exits: [], rooms: [], metadata: {},
};

describe('camera motion in a straight corridor', () => {
  it('changes projected wall position but not horizontal ray distance when looking vertically', () => {
    const player = createPlayer(map), raycaster = new Raycaster(320, 180);
    raycaster.cast(map, player);
    const depth = raycaster.depthBuffer[160], start = raycaster.wallStarts[160];
    lookPlayer(player, .24);
    raycaster.cast(map, player);
    expect(cameraHorizon(player, 180)).toBeGreaterThan(90);
    expect(raycaster.wallStarts[160]).toBeGreaterThan(start);
    expect(raycaster.depthBuffer[160]).toBe(depth);
    lookPlayer(player, 100);
    expect(player.pitch).toBe(PLAYER_CONFIG.maximumPitch);
    lookPlayer(player, -200);
    expect(player.pitch).toBe(-PLAYER_CONFIG.maximumPitch);
  });

  it('bobs only when actually moving and settles when stopped or pressing into a wall', () => {
    const player = createPlayer(map);
    let maximumBob = 0;
    for (let i = 0; i < 45; i++) {
      updatePlayer(player, map, 1, 0, 0, 1 / 60);
      maximumBob = Math.max(maximumBob, Math.abs(player.bobOffset));
    }
    expect(maximumBob).toBeGreaterThan(.001);
    for (let i = 0; i < 90; i++) updatePlayer(player, map, 0, 0, 0, 1 / 60);
    expect(Math.abs(player.bobOffset)).toBeLessThan(.000001);
    player.positionX = 10.8;
    const phase = player.bobPhase;
    for (let i = 0; i < 30; i++) updatePlayer(player, map, 1, 0, 0, 1 / 60);
    expect(player.bobPhase).toBe(phase);
    expect(Math.abs(player.bobOffset)).toBeLessThan(.000001);
  });
});
