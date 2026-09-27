import type { GameMap } from './GameMap';
import type { MapExit } from './MapExit';
import { generateMap } from '../generation/ProceduralGenerator';

export interface WorldState { worldSeed: string; currentMapId: string; maps: Record<string, GameMap>; discoveredMapIds: string[] }
export interface TransitionResult { map: GameMap; spawnX: number; spawnY: number; angle: number }

/** Owns deterministic map creation, caching, and reciprocal exit links. */
export class WorldManager {
  readonly state: WorldState;
  constructor(worldSeed: string) {
    const first = generateMap({ seed: `${worldSeed}:maintenance`, id: 'maintenance', title: 'Maintenance Tunnels' });
    first.exits[0]!.targetMapId = 'pump-station';
    this.state = { worldSeed, currentMapId: first.id, maps: { [first.id]: first }, discoveredMapIds: [first.id] };
  }

  get currentMap(): GameMap { return this.state.maps[this.state.currentMapId]!; }
  regenerate(seed: string): GameMap {
    const fresh = new WorldManager(seed);
    this.state.worldSeed = fresh.state.worldSeed;
    this.state.currentMapId = fresh.state.currentMapId;
    this.state.maps = fresh.state.maps;
    this.state.discoveredMapIds = fresh.state.discoveredMapIds;
    return this.currentMap;
  }

  transition(exit: MapExit): TransitionResult | null {
    if (!exit.targetMapId) return null;
    const from = this.currentMap;
    const mapId = exit.targetMapId;
    let destination = this.state.maps[mapId];
    if (!destination) {
      const index = Object.keys(this.state.maps).length;
      const titles = ['Maintenance Tunnels', 'Pump Station', 'Storage Sector', 'Research Wing', 'Freight Elevator'];
      destination = generateMap({ seed: `${this.state.worldSeed}:${mapId}`, id: mapId, title: titles[Math.min(index, titles.length - 1)] });
      const nextIds = ['pump-station', 'storage-sector', 'research-wing', 'freight-elevator'];
      const forwardExit = destination.exits[0];
      if (forwardExit && index < nextIds.length) forwardExit.targetMapId = nextIds[index];
      this.state.maps[mapId] = destination;
      this.state.discoveredMapIds.push(mapId);
    }
    let entryExit = destination.exits.find(candidate => candidate.targetMapId === from.id);
    if (!entryExit) {
      const spawn = destination.playerSpawn;
      entryExit = { id: `to-${from.id}`, x: Math.floor(spawn.x), y: Math.floor(spawn.y), direction: 'south', targetMapId: from.id, targetExitId: exit.id };
      destination.exits.push(entryExit);
    }
    exit.targetExitId = entryExit.id;
    this.state.currentMapId = destination.id;
    const angle = ({ north: -Math.PI / 2, east: 0, south: Math.PI / 2, west: Math.PI } as const)[entryExit.direction];
    return { map: destination, spawnX: entryExit.x + .5, spawnY: entryExit.y + .5, angle };
  }
}
