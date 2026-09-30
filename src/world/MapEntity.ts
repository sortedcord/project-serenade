export interface MapEntity {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation?: number;
  light?: { intensity: number; radius: number };
  properties?: Record<string, unknown>;
}
