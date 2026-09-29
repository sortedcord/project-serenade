import type { GameMap } from '../world/GameMap';
import type { Player } from './Player';
import type { Raycaster } from './Raycaster';
import type { MinimapPosition } from './GameSettings';
import { MinimapDiscovery } from './MinimapDiscovery';

/** Frameless north-up automap: only map features paint pixels, never a HUD plate. */
export class MinimapRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly resolution = 192;
  private readonly discovery = new MinimapDiscovery();
  private readonly coneFade: CanvasGradient;
  private range = 24;

  constructor(private readonly canvas: HTMLCanvasElement) {
    canvas.width = canvas.height = this.resolution;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable for the minimap.');
    this.context = context;
    const center = this.resolution / 2;
    this.coneFade = context.createRadialGradient(center, center, 0, center, center, center - 8);
    this.coneFade.addColorStop(0, '#b3dca820');
    this.coneFade.addColorStop(.45, '#b3dca812');
    this.coneFade.addColorStop(1, '#b3dca800');
  }

  configure(position: MinimapPosition, size: number, range: number): void {
    this.canvas.dataset.position = position;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.range = range;
  }

  draw(map: GameMap, player: Player, rays: Raycaster): void {
    const ctx = this.context, size = this.resolution, center = size / 2;
    // Zoom depends only on the chosen range, never on ray depths or turning.
    const scale = (center - 8) / (this.range + 1);
    const explored = this.discovery.update(map, rays.visibleCells);
    const originX = center - player.positionX * scale;
    const originY = center - player.positionY * scale;
    ctx.clearRect(0, 0, size, size);
    const minX = Math.max(0, Math.floor(player.positionX - this.range - 1));
    const minY = Math.max(0, Math.floor(player.positionY - this.range - 1));
    const maxX = Math.min(map.width - 1, Math.ceil(player.positionX + this.range + 1));
    const maxY = Math.min(map.height - 1, Math.ceil(player.positionY + this.range + 1));

    ctx.fillStyle = '#819b83';
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const index = y * map.width + x;
      if (!explored[index] || map.tiles[y]![x] !== 0) continue;
      const fade = this.featureFade(Math.hypot(x + .5 - player.positionX, y + .5 - player.positionY));
      ctx.globalAlpha = fade * (rays.visibleCells[index] ? .13 : .045);
      ctx.fillRect(originX + x * scale, originY + y * scale, scale, scale);
    }
    ctx.globalAlpha = 1;
    // The live viewing cone is clipped by the exact scene hits, with its own
    // subtle distance fade. It does not determine map scale or erase memory.
    ctx.beginPath(); ctx.moveTo(center, center);
    for (let column = 0; column < rays.width; column++) {
      const cameraX = 2 * column / rays.width - 1, depth = rays.depthBuffer[column]!;
      ctx.lineTo(center + (player.directionX + player.planeX * cameraX) * depth * scale,
        center + (player.directionY + player.planeY * cameraX) * depth * scale);
    }
    ctx.closePath(); ctx.fillStyle = this.coneFade; ctx.fill();

    ctx.lineWidth = 1;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const index = y * map.width + x;
      if (!explored[index] || map.tiles[y]![x] === 0) continue;
      const visible = rays.visibleCells[index] !== 0;
      ctx.strokeStyle = visible ? '#d9dec1' : '#839486';
      // Draw exposed edges, not internal grid seams in solid wall masses.
      for (let edge = 0; edge < 4; edge++) {
        const nx = x + (edge === 1 ? 1 : edge === 3 ? -1 : 0);
        const ny = y + (edge === 2 ? 1 : edge === 0 ? -1 : 0);
        if (map.tiles[ny]?.[nx] !== 0) continue;
        const x1 = x + (edge === 1 ? 1 : 0), y1 = y + (edge === 2 ? 1 : 0);
        const x2 = x1 + (edge % 2 === 0 ? 1 : 0), y2 = y1 + (edge % 2 === 1 ? 1 : 0);
        const fade = this.featureFade(Math.hypot((x1 + x2) / 2 - player.positionX, (y1 + y2) / 2 - player.positionY));
        if (fade <= 0) continue;
        ctx.globalAlpha = fade * (visible ? .9 : .35);
        ctx.beginPath(); ctx.moveTo(originX + x1 * scale, originY + y1 * scale);
        ctx.lineTo(originX + x2 * scale, originY + y2 * scale); ctx.stroke();
      }
    }

    const determinant = player.planeX * player.directionY - player.directionX * player.planeY;
    ctx.fillStyle = '#cfa06b';
    for (const entity of map.entities) {
      if (entity.properties?.interactable !== true) continue;
      if (this.markerVisible(entity.x, entity.y, player, rays, determinant)) this.drawMarker(entity.x, entity.y, 1.5, player, scale, center);
    }
    ctx.fillStyle = '#edcc7c';
    for (const exit of map.exits) {
      const x = exit.x + .5, y = exit.y + .5;
      const index = exit.y * map.width + exit.x;
      if (!explored[index]) continue;
      this.drawMarker(x, y, 2, player, scale, center);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#edf4d2'; ctx.strokeStyle = '#18251b'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(center + player.directionX * 5, center + player.directionY * 5);
    ctx.lineTo(center - player.directionX * 3 - player.directionY * 3, center - player.directionY * 3 + player.directionX * 3);
    ctx.lineTo(center - player.directionX * 3 + player.directionY * 3, center - player.directionY * 3 - player.directionX * 3);
    ctx.closePath(); ctx.stroke(); ctx.fill();
  }

  private featureFade(distance: number): number {
    // Fade each feature independently; no rectangular/circular clipping mask.
    const t = Math.min(1, Math.max(0, (distance - this.range * .4) / (this.range * .6)));
    return 1 - t * t * (3 - 2 * t);
  }

  private markerVisible(x: number, y: number, player: Player, rays: Raycaster, determinant: number): boolean {
    if (Math.abs(determinant) < 1e-8) return false;
    const dx = x - player.positionX, dy = y - player.positionY;
    const depth = (-player.planeY * dx + player.planeX * dy) / determinant;
    if (depth <= .05) return false;
    const cameraX = (player.directionY * dx - player.directionX * dy) / determinant;
    const column = Math.floor(rays.width * .5 * (1 + cameraX / depth));
    return column >= 0 && column < rays.width && depth < rays.depthBuffer[column]!;
  }

  private drawMarker(x: number, y: number, radius: number, player: Player, scale: number, center: number): void {
    const fade = this.featureFade(Math.hypot(x - player.positionX, y - player.positionY));
    if (fade <= 0) return;
    this.context.globalAlpha = fade * .9;
    this.context.beginPath(); this.context.arc(center + (x - player.positionX) * scale, center + (y - player.positionY) * scale, radius, 0, Math.PI * 2); this.context.fill();
  }
}
