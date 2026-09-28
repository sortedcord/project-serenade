import type { GameMap } from '../world/GameMap';
import type { Player } from './Player';
import type { MinimapPosition } from './GameSettings';

/** North-up local map, rendered independently from the full-size debug map. */
export class MinimapRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly resolution = 96;
  private readonly tileScale = 6;

  constructor(private readonly canvas: HTMLCanvasElement) {
    canvas.width = this.resolution;
    canvas.height = this.resolution;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas 2D is unavailable for the minimap.');
    this.context = context;
    context.imageSmoothingEnabled = false;
  }

  configure(position: MinimapPosition, size: number): void {
    this.canvas.dataset.position = position;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
  }

  draw(map: GameMap, player: Player): void {
    const ctx = this.context, scale = this.tileScale, center = this.resolution / 2;
    const originX = center - player.positionX * scale;
    const originY = center - player.positionY * scale;
    ctx.fillStyle = '#080e0d';
    ctx.fillRect(0, 0, this.resolution, this.resolution);
    const radius = center / scale;
    const minX = Math.max(0, Math.floor(player.positionX - radius));
    const minY = Math.max(0, Math.floor(player.positionY - radius));
    const maxX = Math.min(map.width - 1, Math.ceil(player.positionX + radius));
    const maxY = Math.min(map.height - 1, Math.ceil(player.positionY + radius));
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      ctx.fillStyle = map.tiles[y]![x] === 0 ? '#34463b' : '#738273';
      ctx.fillRect(Math.floor(originX + x * scale), Math.floor(originY + y * scale), scale, scale);
    }
    ctx.fillStyle = '#b77c56';
    for (const entity of map.entities) {
      const x = originX + entity.x * scale, y = originY + entity.y * scale;
      if (x >= 0 && y >= 0 && x < this.resolution && y < this.resolution) ctx.fillRect(Math.floor(x) - 1, Math.floor(y) - 1, 2, 2);
    }
    ctx.fillStyle = '#e6bd69';
    for (const exit of map.exits) {
      const x = originX + (exit.x + .5) * scale, y = originY + (exit.y + .5) * scale;
      if (x >= 0 && y >= 0 && x < this.resolution && y < this.resolution) ctx.fillRect(Math.floor(x) - 2, Math.floor(y) - 2, 4, 4);
    }
    // The arrow rotates with yaw, while tiles remain north-up and centered.
    ctx.fillStyle = '#e2edb1';
    ctx.beginPath();
    ctx.moveTo(center + player.directionX * 5, center + player.directionY * 5);
    ctx.lineTo(center - player.directionX * 3 - player.directionY * 3, center - player.directionY * 3 + player.directionX * 3);
    ctx.lineTo(center - player.directionX * 3 + player.directionY * 3, center - player.directionY * 3 - player.directionX * 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e2edb1';
    ctx.font = '7px monospace';
    ctx.fillText('N', 4, 9);
    ctx.strokeStyle = '#a0b196';
    ctx.strokeRect(.5, .5, this.resolution - 1, this.resolution - 1);
  }
}
