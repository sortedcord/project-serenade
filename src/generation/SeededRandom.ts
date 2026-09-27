/** Small Mulberry32 stream seeded through FNV-1a; stable across browsers and runs. */
export class SeededRandom {
  private state: number;
  constructor(readonly seed: string) {
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
    this.state = hash >>> 0;
  }
  random(): number {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  integer(min: number, max: number): number { return Math.floor(this.random() * (max - min + 1)) + min; }
  float(min: number, max: number): number { return min + this.random() * (max - min); }
  chance(probability: number): boolean { return this.random() < probability; }
  pick<T>(items: readonly T[]): T { if (!items.length) throw new Error('Cannot pick from an empty array'); return items[this.integer(0, items.length - 1)]!; }
  shuffle<T>(items: T[]): T[] { for (let i = items.length - 1; i > 0; i--) { const j = this.integer(0, i); [items[i], items[j]] = [items[j]!, items[i]!]; } return items; }
}
