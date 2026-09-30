export const FLOOR_TEXTURE_SIZE = 32;
export interface FloorTexture { pixels: Uint8ClampedArray; size: number }

/** Texel index is a pure function of world position, so the pattern cannot swim. */
export function floorTexelIndex(worldX: number, worldY: number, textureSize = FLOOR_TEXTURE_SIZE): number {
  const x = Math.floor((worldX - Math.floor(worldX)) * textureSize);
  const y = Math.floor((worldY - Math.floor(worldY)) * textureSize);
  return y * textureSize + x;
}

/** Cached, seamless low-contrast square tile pattern in the map's floor palette. */
export class FloorTextureCache {
  private readonly textures = new Map<string, FloorTexture>();

  get(color: string): FloorTexture {
    const cached = this.textures.get(color);
    if (cached) return cached;
    const canvas = document.createElement('canvas');
    canvas.width = FLOOR_TEXTURE_SIZE;
    canvas.height = FLOOR_TEXTURE_SIZE;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable for floor textures.');
    context.imageSmoothingEnabled = false;
    context.fillStyle = color;
    context.fillRect(0, 0, FLOOR_TEXTURE_SIZE, FLOOR_TEXTURE_SIZE);

    // Subtle four-by-four tile joints; alternating tiles vary only a few RGB
    // values. No random flecks, so the floor reads as worn panels, not noise.
    for (let tileY = 0; tileY < 4; tileY++) for (let tileX = 0; tileX < 4; tileX++) {
      if ((tileX + tileY) % 2 === 0) {
        context.fillStyle = 'rgba(228, 231, 214, .035)';
        context.fillRect(tileX * 8 + 1, tileY * 8 + 1, 6, 6);
      }
    }
    context.fillStyle = 'rgba(6, 10, 8, .13)';
    for (let seam = 0; seam <= FLOOR_TEXTURE_SIZE; seam += 8) {
      context.fillRect(seam, 0, 1, FLOOR_TEXTURE_SIZE);
      context.fillRect(0, seam, FLOOR_TEXTURE_SIZE, 1);
    }
    const data = context.getImageData(0, 0, FLOOR_TEXTURE_SIZE, FLOOR_TEXTURE_SIZE).data;
    const texture = { pixels: data, size: FLOOR_TEXTURE_SIZE };
    this.textures.set(color, texture);
    return texture;
  }
}
