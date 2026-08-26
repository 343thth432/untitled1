/**
 * Детерминированный ГПСЧ (mulberry32).
 * Один и тот же seed всегда даёт один и тот же бой — это нужно и для
 * повторов, и для честного расчёта офлайн-наград.
 */
export class RNG {
  private s: number;

  constructor(seed: number | string) {
    this.s = typeof seed === 'number' ? seed >>> 0 : hashString(seed);
    if (this.s === 0) this.s = 0x9e3779b9;
  }

  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** случайное целое [0, n) */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  range(a: number, b: number): number {
    return a + this.next() * (b - a);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)];
  }

  /** выбор нескольких разных элементов */
  sample<T>(arr: readonly T[], n: number): T[] {
    const pool = arr.slice();
    const out: T[] = [];
    while (out.length < n && pool.length) {
      out.push(pool.splice(this.int(pool.length), 1)[0]);
    }
    return out;
  }

  /** взвешенный выбор */
  weighted<T>(entries: readonly [T, number][]): T {
    const total = entries.reduce((a, e) => a + e[1], 0);
    let r = this.next() * total;
    for (const [v, w] of entries) {
      r -= w;
      if (r <= 0) return v;
    }
    return entries[entries.length - 1][0];
  }
}

export function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
