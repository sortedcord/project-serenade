import type { GameMap } from '../world/GameMap';
import type { Player } from './Player';
import type { Raycaster } from './Raycaster';
import type { MinimapPosition } from './GameSettings';

/** Heading-up 2D footprint of the scene's actual camera rays, not a fixed map crop. */
export class MinimapRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly resolution = 160;
  private readonly edgeMask: HTMLCanvasElement;
  private wallCells = new Uint8Array(0);

  constructor(private readonly canvas: HTMLCanvasElement) {
    canvas.width = this.resolution;
    canvas.height = this.resolution;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable for the minimap.');
    this.context = context;
    context.imageSmoothingEnabled = false;
    this.edgeMask = document.createElement('canvas');
    this.edgeMask.width = this.edgeMask.height = this.resolution;
    const mask = this.edgeMask.getContext('2d')!;
    const center = this.resolution / 2;
    const fade = mask.createRadialGradient(center, center, center * .65, center, center, center);
    fade.addColorStop(0, '#fff');
    fade.addColorStop(.5, '#ffffffb0');
    fade.addColorStop(1, '#ffffff00');
    mask.fillStyle = fade;
    mask.fillRect(0, 0, this.resolution, this.resolution);
  }

  configure(position: MinimapPosition, size: number): void {
    this.canvas.dataset.position = position;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
  }

  draw(map: GameMap, player: Player, rays: Raycaster): void {
    const ctx = this.context, size = this.resolution;
    const centerX = size * .5, playerY = size * .76;
    const planeLength = Math.hypot(player.planeX, player.planeY);
    let farthest = 2, widest = 1;
    // Fit every visible hit, including distant isolated blocks, into the map.
    for (let column = 0; column < rays.width; column++) {
      const depth = rays.depthBuffer[column]!;
      farthest = Math.max(farthest, depth);
      widest = Math.max(widest, Math.abs((2 * column / rays.width - 1) * planeLength * depth));
    }
    const scale = Math.min(size * .55 / (farthest + 1), size * .37 / (widest + 1));
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#080e0dde';
    ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); ctx.fill();

    // World coordinates become heading-relative map coordinates: forward is up.
    ctx.save();
    ctx.setTransform(-player.directionY * scale, -player.directionX * scale,
      player.directionX * scale, -player.directionY * scale,
      centerX + scale * (player.directionY * player.positionX - player.directionX * player.positionY),
      playerY + scale * (player.directionX * player.positionX + player.directionY * player.positionY));
    ctx.beginPath(); ctx.moveTo(player.positionX, player.positionY);
    for (let column = 0; column < rays.width; column++) {
      const cameraX = 2 * column / rays.width - 1, depth = rays.depthBuffer[column]!;
      ctx.lineTo(player.positionX + (player.directionX + player.planeX * cameraX) * depth,
        player.positionY + (player.directionY + player.planeY * cameraX) * depth);
    }
    ctx.closePath(); ctx.fillStyle = '#344e40'; ctx.fill();

    if (this.wallCells.length !== map.width * map.height) this.wallCells = new Uint8Array(map.width * map.height);
    this.wallCells.fill(0);
    ctx.fillStyle = '#87967a'; ctx.strokeStyle = '#b9c8a7'; ctx.lineWidth = .7 / scale;
    for (let column = 0; column < rays.width; column++) {
      const x = rays.hitTileX[column]!, y = rays.hitTileY[column]!;
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
      const index = y * map.width + x;
      if (this.wallCells[index]) continue;
      this.wallCells[index] = 1;
      ctx.fillRect(x, y, 1, 1); ctx.strokeRect(x, y, 1, 1);
    }
    // Markers use the same camera-space depth/column test as scene billboards.
    const determinant = player.planeX * player.directionY - player.directionX * player.planeY;
    if (Math.abs(determinant) > 1e-8) {
      ctx.fillStyle = '#c98e65';
      for (const entity of map.entities) this.drawMarker(entity.x, entity.y, .9, player, rays, determinant, scale);
      ctx.fillStyle = '#edc971';
      for (const exit of map.exits) this.drawMarker(exit.x + .5, exit.y + .5, 1.4, player, rays, determinant, scale);
    }
    ctx.restore();

    ctx.fillStyle = '#e2edb1'; ctx.beginPath();
    ctx.moveTo(centerX, playerY - 5); ctx.lineTo(centerX - 3, playerY + 3);
    ctx.lineTo(centerX + 3, playerY + 3); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(this.edgeMask, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawMarker(x: number, y: number, radius: number, player: Player, rays: Raycaster, determinant: number, scale: number): void {
    const dx = x - player.positionX, dy = y - player.positionY;
    const depth = (-player.planeY * dx + player.planeX * dy) / determinant;
    if (depth <= .05) return;
    const cameraX = (player.directionY * dx - player.directionX * dy) / determinant;
    const column = Math.floor(rays.width * .5 * (1 + cameraX / depth));
    if (column < 0 || column >= rays.width || depth >= rays.depthBuffer[column]!) return;
    this.context.beginPath(); this.context.arc(x, y, radius / scale, 0, Math.PI * 2); this.context.fill();
  }
}
