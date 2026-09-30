import { TileTypes } from '../world/TileTypes';
import type { MapTheme } from '../themes/MapTheme';

export const themes: Record<string, MapTheme> = {
  industrial: { id: 'industrial', wallMaterials: [TileTypes.Concrete, TileTypes.Metal, TileTypes.Brick], floorColor: '#222522', ceilingColor: '#171d1c', fogDistance: 13, minimumBrightness: .22, ambientBrightness: .72, propTypes: ['crate', 'barrel', 'lamp', 'terminal'] },
  sewer: { id: 'sewer', wallMaterials: [TileTypes.Stone, TileTypes.Brick, TileTypes.Concrete], floorColor: '#20251e', ceilingColor: '#121914', fogDistance: 10, minimumBrightness: .14, ambientBrightness: .58, propTypes: ['barrel', 'lamp', 'plant'] },
  bunker: { id: 'bunker', wallMaterials: [TileTypes.Concrete, TileTypes.Stone, TileTypes.Metal], floorColor: '#242420', ceilingColor: '#171816', fogDistance: 15, minimumBrightness: .27, ambientBrightness: .8, propTypes: ['crate', 'terminal', 'lamp'] },
  laboratory: { id: 'laboratory', wallMaterials: [TileTypes.Metal, TileTypes.Concrete, TileTypes.Brick], floorColor: '#202628', ceilingColor: '#192124', fogDistance: 16, minimumBrightness: .31, ambientBrightness: .86, propTypes: ['terminal', 'lamp', 'crate'] },
};

export const themeList = Object.values(themes);
