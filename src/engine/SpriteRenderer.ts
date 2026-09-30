import type { MapEntity } from '../world/MapEntity';
import { cameraHorizon, type Player } from './Player';
import type { MapLighting } from './lighting/LightMap';
import type { Raycaster } from './Raycaster';
import type { TextureManager } from './TextureManager';

interface SpriteProjection { entity: MapEntity; distance: number }

/** Projects sorted camera-facing entities and clips every sprite stripe to wall depth. */
export class SpriteRenderer {
  private readonly projections: SpriteProjection[] = [];
  private projectionCount = 0;

  constructor(private readonly textures: TextureManager) {}

  render(
    context: CanvasRenderingContext2D,
    entities: readonly MapEntity[],
    player: Player,
    raycaster: Raycaster,
    lighting: MapLighting,
    ambientBrightness: number,
    minimumBrightness: number,
    fogDistance: number,
    remotePlayers: readonly MapEntity[] = [],
  ): void {
    const determinant = player.planeX * player.directionY - player.directionX * player.planeY;
    if (Math.abs(determinant) < 1e-8) return;
    const inverseDeterminant = 1 / determinant;
    this.projectionCount = 0;
    for (let entityIndex = 0; entityIndex < entities.length + remotePlayers.length; entityIndex++) {
      const entity = entityIndex < entities.length ? entities[entityIndex]! : remotePlayers[entityIndex - entities.length]!;
      const relativeX = entity.x - player.positionX;
      const relativeY = entity.y - player.positionY;
      const depth = inverseDeterminant * (-player.planeY * relativeX + player.planeX * relativeY);
      if (depth <= 0.05) continue;
      let projection = this.projections[this.projectionCount];
      if (!projection) {
        projection = { entity, distance: depth };
        this.projections.push(projection);
      } else {
        projection.entity = entity;
        projection.distance = depth;
      }
      this.projectionCount += 1;
    }
    this.projections.length = this.projectionCount;
    this.projections.sort((a, b) => b.distance - a.distance);
    const width = raycaster.width;
    const height = raycaster.height;
    const horizon = cameraHorizon(player, height);
    for (const projection of this.projections) {
      const entity = projection.entity;
      const relativeX = entity.x - player.positionX;
      const relativeY = entity.y - player.positionY;
      const transformX = inverseDeterminant * (player.directionY * relativeX - player.directionX * relativeY);
      const transformY = projection.distance;
      const screenX = Math.floor((width / 2) * (1 + transformX / transformY));
      const spriteHeight = Math.max(1, Math.abs(Math.floor(height / transformY)));
      const scale = typeof entity.properties?.renderScale === 'number' ? entity.properties.renderScale : 1;
      const drawHeight = Math.max(1, Math.floor(spriteHeight * scale));
      const drawWidth = drawHeight;
      const projectedTop = Math.floor(horizon - drawHeight / 2);
      const startY = Math.max(0, projectedTop);
      const endY = Math.min(height - 1, Math.floor(horizon + drawHeight / 2));
      const startX = Math.max(0, Math.floor(screenX - drawWidth / 2));
      const endX = Math.min(width - 1, Math.floor(screenX + drawWidth / 2));
      if (startX > endX || startY > endY) continue;
      const brightness = Math.max(minimumBrightness, Math.min(1, ambientBrightness + lighting.sample(entity.x, entity.y)) * Math.max(0.32, 1 - projection.distance / fogDistance));
      const texture = this.textures.getShadedSpriteTexture(entity.type, brightness);
      for (let stripe = startX; stripe <= endX; stripe += 1) {
        if (transformY >= raycaster.depthBuffer[stripe]) continue;
        const textureX = Math.max(0, Math.min(texture.width - 1, Math.floor((stripe - (screenX - drawWidth / 2)) * texture.width / drawWidth)));
        const sourceY = Math.max(0, Math.floor((startY - projectedTop) * texture.height / drawHeight));
        const sourceHeight = Math.max(1, Math.min(texture.height - sourceY, Math.ceil((endY - startY + 1) * texture.height / drawHeight)));
        context.drawImage(texture, textureX, sourceY, 1, sourceHeight, stripe, startY, 1, endY - startY + 1);
      }
    }
  }
}
