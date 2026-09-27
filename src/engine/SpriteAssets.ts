import type { MapEntity } from '../world/MapEntity';

const SIZE = 16;
export type SpriteTexture = HTMLCanvasElement;

/** Creates tiny transparent pixel-art props with a shared silhouette palette. */
export class SpriteAssets {
  private readonly textures = new Map<string, SpriteTexture>();
  get(type: string): SpriteTexture {
    let texture = this.textures.get(type);
    if (!texture) { texture = this.create(type); this.textures.set(type, texture); }
    return texture;
  }
  private create(type: string): SpriteTexture {
    const canvas = document.createElement('canvas'); canvas.width = SIZE; canvas.height = SIZE;
    const context = canvas.getContext('2d')!;
    const colors: Record<string, string> = { crate: '#806346', barrel: '#52605c', lamp: '#d3b765', terminal: '#537d79', plant: '#547047', sign: '#a18d62', pickup: '#8cbd75' };
    const color = colors[type] ?? '#786f62';
    if (type === 'lamp') {
      context.fillStyle = '#393a35'; context.fillRect(7, 4, 2, 11);
      context.fillStyle = '#6f6951'; context.fillRect(4, 2, 8, 3);
      context.fillStyle = '#ecd88a'; context.fillRect(5, 3, 6, 2);
      context.fillStyle = '#9d946a'; context.fillRect(5, 15, 6, 1);
    } else if (type === 'plant') {
      context.fillStyle = '#433c31'; context.fillRect(4, 11, 8, 4);
      context.fillStyle = color; context.fillRect(7, 5, 2, 7); context.fillRect(4, 7, 4, 2); context.fillRect(8, 6, 4, 2); context.fillRect(5, 4, 2, 2);
    } else {
      context.fillStyle = '#191d1b'; context.fillRect(3, 3, 10, 12);
      context.fillStyle = color; context.fillRect(4, 3, 8, 10); context.fillRect(3, 5, 10, 7);
      context.fillStyle = '#242824'; context.fillRect(4, 13, 2, 2); context.fillRect(10, 13, 2, 2);
      if (type === 'crate') { context.strokeStyle = '#b09569'; context.lineWidth = 1; context.strokeRect(4.5, 4.5, 7, 7); context.beginPath(); context.moveTo(5, 5); context.lineTo(11, 11); context.moveTo(11, 5); context.lineTo(5, 11); context.stroke(); }
      if (type === 'terminal') { context.fillStyle = '#9ed0ac'; context.fillRect(5, 5, 6, 4); context.fillStyle = '#a18455'; context.fillRect(5, 10, 6, 1); }
      if (type === 'barrel') { context.fillStyle = '#a4a28b'; context.fillRect(4, 5, 8, 1); context.fillRect(4, 10, 8, 1); }
      if (type === 'pickup') { context.fillStyle = '#c8df90'; context.fillRect(6, 5, 4, 6); context.fillRect(5, 7, 6, 2); }
    }
    return canvas;
  }
}

export function nearestInteractable(entities: MapEntity[], x: number, y: number, angle: number, maximumDistance: number): MapEntity | null {
  let nearest: MapEntity | null = null, best = maximumDistance;
  for (const entity of entities) {
    if (entity.properties?.interactable !== true) continue;
    const dx = entity.x - x, dy = entity.y - y, distance = Math.hypot(dx, dy);
    const angleDifference = Math.atan2(Math.sin(Math.atan2(dy, dx) - angle), Math.cos(Math.atan2(dy, dx) - angle));
    if (Math.abs(angleDifference) < .28 && distance < best) { nearest = entity; best = distance; }
  }
  return nearest;
}
