export function gridDistances(tiles: number[][], startX: number, startY: number): Map<string, number> {
  const height = tiles.length, width = tiles[0]?.length ?? 0, distances = new Map<string, number>(), queue: Array<[number, number]> = [[startX, startY]];
  if (tiles[startY]?.[startX] !== 0) return distances;
  distances.set(`${startX},${startY}`, 0);
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i]!, distance = distances.get(`${x},${y}`)!;
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
      const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
      if (nx >= 0 && ny >= 0 && nx < width && ny < height && tiles[ny]?.[nx] === 0 && !distances.has(key)) { distances.set(key, distance + 1); queue.push([nx, ny]); }
    }
  }
  return distances;
}
