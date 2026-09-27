import type { GameMap } from '../world/GameMap';
import { cameraHorizon, type Player } from './Player';
import { Raycaster } from './Raycaster';
import { SpriteRenderer } from './SpriteRenderer';
import { TextureManager } from './TextureManager';

export interface RendererOptions {
  width?: number;
  height?: number;
  floorColor?: string;
  ceilingColor?: string;
  fogDistance?: number;
  minimumBrightness?: number;
  ambientBrightness?: number;
}

/** Standalone low-resolution Canvas 2D renderer for a GameMap and player. */
export class Renderer {
  readonly width: number;
  readonly height: number;
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
  readonly raycaster: Raycaster;
  readonly textures: TextureManager;
  readonly spriteRenderer: SpriteRenderer;
  private floorColor: string;
  private ceilingColor: string;
  private fogDistance: number;
  private minimumBrightness: number;
  private ambientBrightness: number;

  constructor(canvas: HTMLCanvasElement, options: RendererOptions = {}) {
    this.canvas = canvas;
    this.width = options.width ?? 320;
    this.height = options.height ?? 180;
    canvas.width = this.width;
    canvas.height = this.height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas 2D is unavailable for the game renderer.');
    this.context = context;
    context.imageSmoothingEnabled = false;
    this.floorColor = options.floorColor ?? '#222522';
    this.ceilingColor = options.ceilingColor ?? '#171d1c';
    this.fogDistance = options.fogDistance ?? 13;
    this.minimumBrightness = options.minimumBrightness ?? 0.2;
    this.ambientBrightness = options.ambientBrightness ?? 0.75;
    this.raycaster = new Raycaster(this.width, this.height);
    this.textures = new TextureManager();
    this.spriteRenderer = new SpriteRenderer(this.textures);
  }

  /** Draws one frame. Map metadata overrides configured atmosphere where present. */
  render(map: GameMap, player: Player): void {
    const context = this.context;
    const horizon = cameraHorizon(player, this.height);
    context.fillStyle = map.metadata.ceilingColor ?? this.ceilingColor;
    context.fillRect(0, 0, this.width, horizon);
    context.fillStyle = map.metadata.floorColor ?? this.floorColor;
    context.fillRect(0, horizon, this.width, this.height - horizon);
    this.raycaster.cast(map, player);
    const fogDistance = map.metadata.fogDistance ?? this.fogDistance;
    const minimumBrightness = map.metadata.minimumBrightness ?? this.minimumBrightness;
    const ambientBrightness = map.metadata.ambientBrightness ?? this.ambientBrightness;
    for (let x = 0; x < this.width; x += 1) {
      const distance = this.raycaster.depthBuffer[x];
      const texture = this.textures.getWallMaterial(this.raycaster.wallTypes[x]).texture;
      const shade = this.raycaster.hitSides[x] === 1 ? 0.82 : 1;
      const brightness = Math.max(minimumBrightness, ambientBrightness * Math.max(0, 1 - distance / fogDistance)) * shade;
      const sourceX = this.raycaster.textureCoordinates[x];
      const startY = this.raycaster.wallStarts[x];
      const endY = this.raycaster.wallEnds[x];
      if (endY < startY) continue;

      // Clipping a near wall must also clip its texture. Stretching the full
      // column into the visible slice makes seams bend and crawl while walking.
      const projectedHeight = Math.floor(this.height / distance);
      const projectedTop = Math.floor(horizon - projectedHeight / 2);
      const projectedBottom = Math.floor(horizon + projectedHeight / 2);
      const texelsPerPixel = texture.height / (projectedBottom - projectedTop + 1);
      const sourceY = (startY - projectedTop) * texelsPerPixel;
      const sourceHeight = (endY - startY + 1) * texelsPerPixel;
      context.drawImage(texture, sourceX, sourceY, 1, sourceHeight, x, startY, 1, endY - startY + 1);

      // Darken the wall itself; alpha-blending the texture onto the ceiling
      // and floor would expose a false horizontal seam across nearby walls.
      if (brightness < 1) {
        context.globalAlpha = 1 - brightness;
        context.fillStyle = '#000';
        context.fillRect(x, startY, 1, endY - startY + 1);
        context.globalAlpha = 1;
      }
    }
    this.spriteRenderer.render(context, map.entities, player, this.raycaster);
    context.globalAlpha = 1;
  }
}
