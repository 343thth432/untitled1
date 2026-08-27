/** Мелкие цветовые утилиты для фона: смешивание, прозрачность, сид. */

interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hex(c: string): RGB {
  const s = c.replace('#', '');
  const n = parseInt(s.length === 3 ? s.split('').map((x) => x + x).join('') : s, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toHex(r: number, g: number, b: number): string {
  const f = (v: number): string => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}

export function rgba(c: string, a: number): string {
  const { r, g, b } = hex(c);
  return `rgba(${r},${g},${b},${a})`;
}

export function mix(a: string, b: string, t: number): string {
  const x = hex(a);
  const y = hex(b);
  return toHex(x.r + (y.r - x.r) * t, x.g + (y.g - x.g) * t, x.b + (y.b - x.b) * t);
}

export function dark(c: string, t = 0.25): string {
  const { r, g, b } = hex(c);
  return toHex(r * (1 - t), g * (1 - t), b * (1 - t));
}

export function light(c: string, t = 0.25): string {
  const { r, g, b } = hex(c);
  return toHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
}

/** детерминированный генератор: одинаковый фон при одном и том же сиде */
export function seeded(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function blurOn(ctx: CanvasRenderingContext2D, px: number): void {
  ctx.filter = `blur(${px.toFixed(2)}px)`;
}

export function blurOff(ctx: CanvasRenderingContext2D): void {
  ctx.filter = 'none';
}
