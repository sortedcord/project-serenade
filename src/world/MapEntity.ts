export interface MapEntity {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation?: number;
  properties?: Record<string, unknown>;
}
