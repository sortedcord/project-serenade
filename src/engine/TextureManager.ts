import { TileTypes } from '../world/TileTypes';

export interface WallMaterial {
  id: number;
  texture: HTMLCanvasElement;
}

const TEXTURE_SIZE = 32;
const materialColors: Record<number, [number, number, number]> = {
  [TileTypes.Concrete]: [105, 111, 104],
  [TileTypes.Brick]: [126, 70, 52],
  [TileTypes.Metal]: [91, 112, 119],
  [TileTypes.Stone]: [107, 99, 82],
  [TileTypes.SpecialWall]: [106, 81, 131],
};

/** Caches small procedurally generated nearest-neighbor wall materials. */
export class TextureManager {
  private readonly materials = new Map<number, WallMaterial>();
  private readonly sprites = new Map<string, HTMLCanvasElement>();
  private readonly shadedSprites = new Map<string, Map<number, HTMLCanvasElement>>();

  getSpriteTexture(type: string): HTMLCanvasElement {
    const cached = this.sprites.get(type);
    if (cached) return cached;
    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE_SIZE;
    canvas.height = TEXTURE_SIZE;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable for sprite textures.');
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
    const palette: Record<string, string> = { crate: '#9a7046', barrel: '#53666b', lamp: '#e7c86e', plant: '#537c50', terminal: '#5a9da8', pickup: '#d3a7df' };
    const color = palette[type] ?? '#9b9b8b';
    if (type === 'lamp') {
      context.fillStyle = '#554a39';
      context.fillRect(14, 10, 4, 19);
      context.fillStyle = color;
      context.fillRect(9, 5, 14, 9);
      context.fillStyle = 'rgba(255, 238, 164, .45)';
      context.fillRect(7, 3, 18, 13);
    } else if (type === 'plant') {
      context.fillStyle = '#5a4835';
      context.fillRect(10, 22, 12, 6);
      context.fillStyle = color;
      context.fillRect(13, 8, 6, 16);
      context.fillRect(7, 13, 8, 5);
      context.fillRect(17, 11, 8, 5);
    } else if (type === 'barrel') {
      context.fillStyle = color;
      context.fillRect(8, 6, 16, 22);
      context.fillStyle = '#29353a';
      context.fillRect(8, 9, 16, 2);
      context.fillRect(8, 21, 16, 2);
    } else {
      context.fillStyle = color;
      context.fillRect(7, 8, 18, 20);
      context.fillStyle = 'rgba(20, 24, 22, .65)';
      context.fillRect(10, 11, 12, 3);
      context.fillRect(10, 17, 12, 2);
    }
    this.sprites.set(type, canvas);
    return canvas;
  }

  getShadedSpriteTexture(type: string, brightness: number): HTMLCanvasElement {
    const level = Math.max(0, Math.min(16, Math.round(brightness * 16)));
    let shades = this.shadedSprites.get(type);
    if (!shades) {
      shades = new Map<number, HTMLCanvasElement>();
      this.shadedSprites.set(type, shades);
    }
    const cached = shades.get(level);
    if (cached) return cached;
    const source = this.getSpriteTexture(type);
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable for shaded sprite textures.');
    context.imageSmoothingEnabled = false;
    context.filter = `brightness(${level / 16})`;
    context.drawImage(source, 0, 0);
    context.filter = 'none';
    shades.set(level, canvas);
    return canvas;
  }

  getWallMaterial(id: number): WallMaterial {
    let material = this.materials.get(id);
    if (material) return material;
    material = { id, texture: this.createTexture(id) };
    this.materials.set(id, material);
    return material;
  }

  private createTexture(id: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE_SIZE;
    canvas.height = TEXTURE_SIZE;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable for wall textures.');
    const base = materialColors[id] ?? [104, 102, 91];
    context.fillStyle = `rgb(${base[0]}, ${base[1]}, ${base[2]})`;
    context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
    let seed = (id * 2654435761) >>> 0;
    const random = (): number => {
      seed = (seed + 0x6d2b79f5) >>> 0;
      let value = seed;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
    if (id === TileTypes.Brick) {
      for (let y = 0; y < TEXTURE_SIZE; y += 8) {
        const offset = (y / 8) % 2 ? -8 : 0;
        context.fillStyle = 'rgba(33, 24, 20, .85)';
        context.fillRect(0, y, TEXTURE_SIZE, 1);
        for (let x = offset; x < TEXTURE_SIZE; x += 16) context.fillRect(x, y, 1, 8);
      }
    } else if (id === TileTypes.Metal || id === TileTypes.SpecialWall) {
      context.fillStyle = 'rgba(20, 26, 28, .6)';
      for (let y = 1; y < TEXTURE_SIZE; y += 8) context.fillRect(0, y, TEXTURE_SIZE, 1);
      for (let x = 1; x < TEXTURE_SIZE; x += 16) context.fillRect(x, 0, 1, TEXTURE_SIZE);
      context.fillStyle = 'rgba(210, 200, 158, .8)';
      for (let y = 4; y < TEXTURE_SIZE; y += 8) for (let x = 4; x < TEXTURE_SIZE; x += 16) context.fillRect(x, y, 1, 1);
    } else {
      for (let i = 0; i < 46; i += 1) {
        const shade = random() > 0.5 ? 28 : -25;
        context.fillStyle = `rgba(${shade > 0 ? 255 : 0}, ${shade > 0 ? 255 : 0}, ${shade > 0 ? 255 : 0}, ${0.08 + random() * 0.16})`;
        context.fillRect(Math.floor(random() * TEXTURE_SIZE), Math.floor(random() * TEXTURE_SIZE), 1 + Math.floor(random() * 3), 1 + Math.floor(random() * 2));
      }
    }
    return canvas;
  }
}
