export const TileTypes = { Floor: 0, Concrete: 1, Brick: 2, Metal: 3, Stone: 4, SpecialWall: 11 } as const;
export type WallTile = typeof TileTypes[keyof typeof TileTypes];
export const isWalkableTile = (tile: number): boolean => tile === TileTypes.Floor;
