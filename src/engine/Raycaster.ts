import type { GameMap } from '../world/GameMap';
import { cameraHorizon, type Player } from './Player';

export interface RaycastColumn {
  distance: number;
  wallType: number;
  side: 0 | 1;
  textureX: number;
  startY: number;
  endY: number;
}

/** Reusable per-column hit information, including perpendicular wall depths. */
export class Raycaster {
  readonly depthBuffer: Float64Array;
  readonly wallTypes: Int16Array;
  readonly hitSides: Uint8Array;
  readonly textureCoordinates: Float32Array;
  readonly wallStarts: Int16Array;
  readonly cornerOcclusion: Float32Array;
  readonly wallEnds: Int16Array;
  readonly hitTileX: Int16Array;
  readonly hitTileY: Int16Array;

  constructor(readonly width: number, readonly height: number) {
    this.depthBuffer = new Float64Array(width);
    this.wallTypes = new Int16Array(width);
    this.hitSides = new Uint8Array(width);
    this.textureCoordinates = new Float32Array(width);
    this.wallStarts = new Int16Array(width);
    this.wallEnds = new Int16Array(width);
    this.cornerOcclusion = new Float32Array(width);
    this.hitTileX = new Int16Array(width);
    this.hitTileY = new Int16Array(width);
  }

  cast(map: GameMap, player: Player): void {
    const centerY = cameraHorizon(player, this.height);
    for (let x = 0; x < this.width; x += 1) {
      const cameraX = 2 * x / this.width - 1;
      const rayX = player.directionX + player.planeX * cameraX;
      const rayY = player.directionY + player.planeY * cameraX;
      let mapX = Math.floor(player.positionX);
      let mapY = Math.floor(player.positionY);
      const deltaDistX = rayX === 0 ? Infinity : Math.abs(1 / rayX);
      const deltaDistY = rayY === 0 ? Infinity : Math.abs(1 / rayY);
      const stepX = rayX < 0 ? -1 : 1;
      const stepY = rayY < 0 ? -1 : 1;
      let sideDistX = rayX < 0 ? (player.positionX - mapX) * deltaDistX : (mapX + 1 - player.positionX) * deltaDistX;
      let sideDistY = rayY < 0 ? (player.positionY - mapY) * deltaDistY : (mapY + 1 - player.positionY) * deltaDistY;
      let side: 0 | 1 = 0;
      let tile = 0;
      let steps = 0;
      while (steps < map.width + map.height + 4) {
        if (sideDistX < sideDistY) {
          sideDistX += deltaDistX;
          mapX += stepX;
          side = 0;
        } else {
          sideDistY += deltaDistY;
          mapY += stepY;
          side = 1;
        }
        steps += 1;
        if (mapX < 0 || mapX >= map.width || mapY < 0 || mapY >= map.height) {
          tile = 1;
          break;
        }
        tile = map.tiles[mapY][mapX];
        if (tile !== 0) break;
      }
      let distance = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;
      if (!(distance > 1e-6) || !Number.isFinite(distance)) distance = 1e-6;
      const wallHeight = Math.floor(this.height / distance);
      const startY = Math.max(0, Math.floor(centerY - wallHeight / 2));
      const endY = Math.min(this.height - 1, Math.floor(centerY + wallHeight / 2));
      let wallHit = side === 0 ? player.positionY + distance * rayY : player.positionX + distance * rayX;
      wallHit -= Math.floor(wallHit);
      let textureX = Math.floor(wallHit * 32);
      if ((side === 0 && rayX > 0) || (side === 1 && rayY < 0)) textureX = 31 - textureX;
      // A wall along the open side of either endpoint forms a concave corner.
      // Fade its shadow along the face; isolated/exposed edges stay unshaded.
      const frontX = side === 0 ? mapX - stepX : mapX;
      const frontY = side === 1 ? mapY - stepY : mapY;
      const alongX = side === 1 ? 1 : 0;
      const alongY = side === 0 ? 1 : 0;
      const near = map.tiles[frontY - alongY]?.[frontX - alongX];
      const far = map.tiles[frontY + alongY]?.[frontX + alongX];
      const nearShadow = near !== undefined && near !== 0 ? Math.max(0, 1 - wallHit * 4) : 0;
      const farShadow = far !== undefined && far !== 0 ? Math.max(0, 1 - (1 - wallHit) * 4) : 0;
      this.cornerOcclusion[x] = Math.max(nearShadow, farShadow);
      this.depthBuffer[x] = distance;
      this.wallTypes[x] = tile;
      this.hitSides[x] = side;
      this.textureCoordinates[x] = textureX;
      this.wallStarts[x] = startY;
      this.wallEnds[x] = endY;
      this.hitTileX[x] = mapX;
      this.hitTileY[x] = mapY;
    }
  }
}
