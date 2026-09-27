export type ExitDirection = 'north' | 'south' | 'east' | 'west';
export interface MapExit {
  id: string;
  x: number;
  y: number;
  direction: ExitDirection;
  targetMapId?: string;
  targetExitId?: string;
}
