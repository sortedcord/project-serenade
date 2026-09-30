import type { GameMap } from '../world/GameMap';
import { cameraHorizon, type Player } from './Player';
import { FloorTextureCache, floorTexelIndex } from './FloorTexture';
import { floorRasterRegion, floorWorldSample } from './FloorCasting';
import { Raycaster } from './Raycaster';
import { SpriteRenderer } from './SpriteRenderer';
import { getMapLighting } from './lighting/LightMap';
import { TextureManager } from './TextureManager';
import type { MapLighting } from './lighting/LightMap';

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
  private readonly floorPixels: ImageData;
  readonly raycaster: Raycaster;
  readonly textures: TextureManager;
  private readonly floorTextures: FloorTextureCache;
  readonly spriteRenderer: SpriteRenderer;
  private floorColor: string;
  private ceilingColor: string;
  private fogDistance: number;
  private minimumBrightness: number;
  private ambientBrightness: number;
  ambientOcclusion = 0.6;

  constructor(canvas: HTMLCanvasElement, options: RendererOptions = {}) {
    this.canvas = canvas;
    this.width = options.width ?? 320;
    this.height = options.height ?? 180;
    canvas.width = this.width;
    canvas.height = this.height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas 2D is unavailable for the game renderer.');
    this.context = context;
    this.floorPixels = context.createImageData(this.width, this.height);
    context.imageSmoothingEnabled = false;
    this.floorColor = options.floorColor ?? '#222522';
    this.ceilingColor = options.ceilingColor ?? '#171d1c';
    this.fogDistance = options.fogDistance ?? 13;
    this.minimumBrightness = options.minimumBrightness ?? 0.2;
    this.ambientBrightness = options.ambientBrightness ?? 0.75;
    this.floorTextures = new FloorTextureCache();
    this.raycaster = new Raycaster(this.width, this.height);
    this.textures = new TextureManager();
    this.spriteRenderer = new SpriteRenderer(this.textures);
  }

  /** Draws one frame. Map metadata overrides configured atmosphere where present. */
  render(map: GameMap, player: Player): void {
    const context = this.context;
    const horizon = cameraHorizon(player, this.height);
    const ceilingColor = map.metadata.ceilingColor ?? this.ceilingColor;
    context.fillStyle = ceilingColor;
    context.fillRect(0, 0, this.width, horizon);
    const ceilingRgb = this.parseColor(ceilingColor);
    const floorColor = map.metadata.floorColor ?? this.floorColor;
    context.fillStyle = floorColor;
    context.fillRect(0, horizon, this.width, this.height - horizon);
    const { startY: floorStart, height: floorHeight } = floorRasterRegion(horizon, this.height);
    const floorPixels = this.floorPixels.data;
    const fogDistance = map.metadata.fogDistance ?? this.fogDistance;
    const lighting: MapLighting = getMapLighting(map);
    const minimumBrightness = map.metadata.minimumBrightness ?? this.minimumBrightness;
    const ambientBrightness = map.metadata.ambientBrightness ?? this.ambientBrightness;
    const floorSample = { x: 0, y: 0, distance: 0 };
    const texture = this.floorTextures.get(floorColor);
    for (let screenY = floorStart; screenY < floorStart + floorHeight; screenY++) {
      const rowStart = screenY * this.width * 4;
      for (let screenX = 0; screenX < this.width; screenX++) {
        floorWorldSample(player, screenX, screenY, this.width, this.height, horizon, floorSample);
        const texel = floorTexelIndex(floorSample.x, floorSample.y, texture.size) * 4;
        const fog = Math.max(0.32, 1 - floorSample.distance / fogDistance);
        const brightness = Math.max(minimumBrightness, Math.min(1, ambientBrightness + lighting.sample(floorSample.x, floorSample.y)) * fog);
        const index = rowStart + screenX * 4;
        floorPixels[index] = texture.pixels[texel]! * brightness;
        floorPixels[index + 1] = texture.pixels[texel + 1]! * brightness;
        floorPixels[index + 2] = texture.pixels[texel + 2]! * brightness;
        floorPixels[index + 3] = 255;
      }
    }
    if (floorHeight > 0) context.putImageData(this.floorPixels, 0, 0, 0, floorStart, this.width, floorHeight);
    const ceilingEnd = Math.min(this.height, Math.max(0, Math.ceil(horizon)));
    for (let screenY = 0; screenY < ceilingEnd; screenY++) {
      const rowStart = screenY * this.width * 4;
      const mirroredY = horizon + Math.max(0.5, horizon - screenY);
      for (let screenX = 0; screenX < this.width; screenX++) {
        floorWorldSample(player, screenX, mirroredY, this.width, this.height, horizon, floorSample);
        const fog = Math.max(0.32, 1 - floorSample.distance / fogDistance);
        const brightness = Math.max(minimumBrightness, Math.min(1, ambientBrightness + lighting.sample(floorSample.x, floorSample.y)) * fog);
        const index = rowStart + screenX * 4;
        floorPixels[index] = ceilingRgb[0] * brightness;
        floorPixels[index + 1] = ceilingRgb[1] * brightness;
        floorPixels[index + 2] = ceilingRgb[2] * brightness;
        floorPixels[index + 3] = 255;
      }
    }
    if (ceilingEnd > 0) context.putImageData(this.floorPixels, 0, 0, 0, 0, this.width, ceilingEnd);
    this.raycaster.cast(map, player);
    for (let x = 0; x < this.width; x += 1) {
      const distance = this.raycaster.depthBuffer[x];
      const texture = this.textures.getWallMaterial(this.raycaster.wallTypes[x]).texture;
      const shade = this.raycaster.hitSides[x] === 1 ? 0.82 : 1;
      const direct = lighting.sample(this.raycaster.hitWorldX[x]!, this.raycaster.hitWorldY[x]!);
      const brightness = Math.max(minimumBrightness, Math.min(1, ambientBrightness + direct) * Math.max(0.32, 1 - distance / fogDistance)) * shade;
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

      // The geometry buffer marks concave corners; darken that wall column,
      // then shade only short contact bands at floor/ceiling intersections.
      // Band positions derive from the unclipped projection, so they do not
      // crawl when a wall crosses the screen edge or the camera looks up.
      const corner = this.ambientOcclusion * this.raycaster.cornerOcclusion[x] * 0.45;
      const baseAlpha = 1 - brightness * (1 - corner);
      context.fillStyle = '#000';
      if (baseAlpha > 0) {
        context.globalAlpha = baseAlpha;
        context.fillRect(x, startY, 1, endY - startY + 1);
      }
      if (this.ambientOcclusion > 0) {
        const contactLength = Math.max(1, Math.floor(projectedHeight * 0.14));
        for (let band = 0; band < 6; band++) {
          const bandStart = Math.floor(contactLength * band / 6);
          const bandEnd = Math.floor(contactLength * (band + 1) / 6);
          if (bandEnd <= bandStart) continue;
          context.globalAlpha = this.ambientOcclusion * 0.22 * (1 - (band + 0.5) / 6);
          const topStart = Math.max(startY, projectedTop + bandStart);
          const topEnd = Math.min(endY + 1, projectedTop + bandEnd);
          if (topEnd > topStart) context.fillRect(x, topStart, 1, topEnd - topStart);
          const bottomStart = Math.max(startY, projectedBottom - bandEnd + 1);
          const bottomEnd = Math.min(endY + 1, projectedBottom - bandStart + 1);
          if (bottomEnd > bottomStart) context.fillRect(x, bottomStart, 1, bottomEnd - bottomStart);
        }
      }
      context.globalAlpha = 1;
    }
    this.spriteRenderer.render(context, map.entities, player, this.raycaster, lighting, ambientBrightness, minimumBrightness, fogDistance);
    context.globalAlpha = 1;
  }
  private parseColor(color: string): [number, number, number] {
    const hex = color.startsWith('#') ? color.slice(1) : '';
    if (hex.length === 3) return [parseInt(hex[0]! + hex[0]!, 16), parseInt(hex[1]! + hex[1]!, 16), parseInt(hex[2]! + hex[2]!, 16)];
    if (hex.length === 6) return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
    return [34, 37, 34];
  }
}
