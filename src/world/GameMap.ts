import type { MapEntity } from './MapEntity';
import type { MapExit } from './MapExit';

export interface PlayerSpawn { x: number; y: number; angle: number }
export interface GeneratedRoom { id: string; x: number; y: number; width: number; height: number; centerX: number; centerY: number; type: string }
export interface GameMap {
  id: string;
  width: number;
  height: number;
  tiles: number[][];
  playerSpawn: PlayerSpawn;
  entities: MapEntity[];
  exits: MapExit[];
  rooms: GeneratedRoom[];
  metadata: { title?: string; theme?: string; seed?: string; floorColor?: string; ceilingColor?: string; fogDistance?: number; minimumBrightness?: number; ambientBrightness?: number };
}
