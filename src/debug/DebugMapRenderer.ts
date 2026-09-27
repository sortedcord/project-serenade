import type { GameMap } from '../world/GameMap';

export interface DebugPlayer { x: number; y: number; angle: number }
export class DebugMapRenderer {
  draw(context: CanvasRenderingContext2D, map: GameMap, player: DebugPlayer, x: number, y: number, maxWidth: number): void {
    const scale = Math.min(maxWidth / map.width, 145 / map.height), width = map.width * scale, height = map.height * scale;
    context.save(); context.globalAlpha = .95; context.fillStyle = '#080e0d'; context.fillRect(x - 5, y - 17, width + 10, height + 22);
    for (let ty = 0; ty < map.height; ty++) for (let tx = 0; tx < map.width; tx++) {
      context.fillStyle = map.tiles[ty]?.[tx] === 0 ? '#535c50' : '#a0a08b'; context.fillRect(x + tx * scale, y + ty * scale, Math.ceil(scale), Math.ceil(scale));
    }
    context.fillStyle = '#e6bd69'; for (const exit of map.exits) context.fillRect(x + exit.x * scale, y + exit.y * scale, scale, scale);
    context.fillStyle = '#b77c56'; for (const entity of map.entities) { context.beginPath(); context.arc(x + entity.x * scale, y + entity.y * scale, Math.max(1, scale * .25), 0, Math.PI * 2); context.fill(); }
    context.strokeStyle = '#df625b'; context.lineWidth = 1; context.beginPath();
    for (const room of map.rooms) context.rect(x + room.x * scale, y + room.y * scale, room.width * scale, room.height * scale);
    context.stroke();
    context.fillStyle = '#e6dc94'; context.beginPath(); context.arc(x + player.x * scale, y + player.y * scale, Math.max(2, scale * .36), 0, Math.PI * 2); context.fill();
    context.strokeStyle = '#e6dc94'; context.beginPath(); context.moveTo(x + player.x * scale, y + player.y * scale); context.lineTo(x + (player.x + Math.cos(player.angle) * 1.8) * scale, y + (player.y + Math.sin(player.angle) * 1.8) * scale); context.stroke();
    context.fillStyle = '#e1e4cf'; context.font = '7px monospace'; context.fillText(`${map.metadata.title ?? map.id} · ${map.metadata.seed ?? ''}`, x, y - 7); context.restore();
  }
}
