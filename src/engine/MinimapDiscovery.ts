import type { GameMap } from '../world/GameMap';

/** Separate current sight from remembered geometry; returning maps keep discovery. */
export class MinimapDiscovery {
  private readonly maps = new WeakMap<GameMap, Uint8Array>();

  update(map: GameMap, visibleCells: Uint8Array): Uint8Array {
    let explored = this.maps.get(map);
    if (!explored) {
      explored = new Uint8Array(map.width * map.height);
      this.maps.set(map, explored);
    }
    for (let index = 0; index < explored.length; index++) {
      if (visibleCells[index]) explored[index] = 1;
    }
    return explored;
  }
}
