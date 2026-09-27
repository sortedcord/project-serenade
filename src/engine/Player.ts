import type { GameMap } from '../world/GameMap';
import { moveWithCollision } from './Collision';

export const PLAYER_CONFIG = {
  movementSpeed: 3.2,
  strafeSpeed: 3.0,
  rotationSpeed: 2.2,
  mouseSensitivity: 0.0022,
  collisionRadius: 0.2,
  fieldOfView: Math.PI / 3,
  maximumPitch: 0.38,
  lookSpeed: 0.85,
  bobFrequency: 6,
  bobAmplitude: 0.012,
} as const;

export interface Player {
  positionX: number;
  positionY: number;
  directionX: number;
  directionY: number;
  planeX: number;
  planeY: number;
  readonly fov: number;
  pitch: number;
  bobPhase: number;
  bobOffset: number;
}

export function createPlayer(map: GameMap): Player {
  const angle = map.playerSpawn.angle;
  const fov = PLAYER_CONFIG.fieldOfView;
  const planeLength = Math.tan(fov / 2);
  return {
    positionX: map.playerSpawn.x,
    positionY: map.playerSpawn.y,
    directionX: Math.cos(angle),
    directionY: Math.sin(angle),
    planeX: -Math.sin(angle) * planeLength,
    planeY: Math.cos(angle) * planeLength,
    fov,
    pitch: 0,
    bobPhase: 0,
    bobOffset: 0,
  };
}

export function rotatePlayer(player: Player, angle: number): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const directionX = player.directionX * cos - player.directionY * sin;
  const directionY = player.directionX * sin + player.directionY * cos;
  const planeX = player.planeX * cos - player.planeY * sin;
  const planeY = player.planeX * sin + player.planeY * cos;
  player.directionX = directionX;
  player.directionY = directionY;
  player.planeX = planeX;
  player.planeY = planeY;
}
/** Vertical view is a projection shift; rays still travel on the 2D grid. */
export function cameraHorizon(player: Player, height: number): number {
  return height * (0.5 + Math.tan(player.pitch) / (2 * Math.tan(player.fov / 2)) + player.bobOffset);
}

export function lookPlayer(player: Player, delta: number): void {
  player.pitch = Math.max(-PLAYER_CONFIG.maximumPitch, Math.min(PLAYER_CONFIG.maximumPitch, player.pitch + delta));
}

const movementResult = { x: 0, y: 0 };

/** Moves using frame-rate-independent input axes in the range [-1, 1]. */
export function updatePlayer(
  player: Player,
  map: GameMap,
  forward: number,
  strafe: number,
  turn: number,
  deltaSeconds: number,
): void {
  const dt = Math.max(0, Math.min(deltaSeconds, 0.1));
  if (turn !== 0) rotatePlayer(player, turn * PLAYER_CONFIG.rotationSpeed * dt);
  const inputLength = Math.hypot(forward, strafe);
  if (inputLength > 1) {
    forward /= inputLength;
    strafe /= inputLength;
  }
  const dx = (player.directionX * forward * PLAYER_CONFIG.movementSpeed - player.directionY * strafe * PLAYER_CONFIG.strafeSpeed) * dt;
  const dy = (player.directionY * forward * PLAYER_CONFIG.movementSpeed + player.directionX * strafe * PLAYER_CONFIG.strafeSpeed) * dt;
  moveWithCollision(map, player.positionX, player.positionY, dx, dy, PLAYER_CONFIG.collisionRadius, movementResult);
  const distance = Math.hypot(movementResult.x - player.positionX, movementResult.y - player.positionY);
  player.positionX = movementResult.x;
  player.positionY = movementResult.y;
  if (distance > 0) player.bobPhase += distance * PLAYER_CONFIG.bobFrequency;
  const targetBob = distance > 0 ? Math.sin(player.bobPhase) * PLAYER_CONFIG.bobAmplitude : 0;
  player.bobOffset += (targetBob - player.bobOffset) * (1 - Math.exp(-12 * dt));
}
