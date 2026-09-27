import { isWalkableTile } from '../world/TileTypes';

/** Deterministic four-way BFS over floor cells, returned as a set of x,y keys. */
export function floodFill(tiles: number[][], startX: number, startY: number): Set<string> {
  const height = tiles.length, width = tiles[0]?.length ?? 0;
  const key = (x: number, y: number) => `${x},${y}`;
  if (startX < 0 || startY < 0 || startX >= width || startY >= height || !isWalkableTile(tiles[startY]?.[startX] ?? -1)) return new Set();
  const visited = new Set<string>([key(startX, startY)]), queue: Array<[number, number]> = [[startX, startY]];
  for (let index = 0; index < queue.length; index++) {
    const [x, y] = queue[index]!;
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
      const nx = x + dx, ny = y + dy, next = key(nx, ny);
      if (nx >= 0 && ny >= 0 && nx < width && ny < height && !visited.has(next) && isWalkableTile(tiles[ny]?.[nx] ?? -1)) { visited.add(next); queue.push([nx, ny]); }
    }
  }
  return visited;
}
