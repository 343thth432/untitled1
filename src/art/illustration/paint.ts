/** Небольшая палитра-утилита для рисования портретов на canvas */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hex(c: string): RGB {
  const m = /^rgba?\(([^)]+)\)$/.exec(c.trim());
  if (m) {
    const [r, g, b] = m[1].split(',').map((x) => parseFloat(x));
    return { r, g, b };
  }
  const s = c.replace('#', '');
  const full = s.length === 3 ? s.split('').map((x) => x + x).join('') : s;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toHex(r: number, g: number, b: number): string {
  const p = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${p(r)}${p(g)}${p(b)}`;
}

export function rgba(c: string, a: number): string {
  const { r, g, b } = hex(c);
  return `rgba(${r},${g},${b},${a})`;
}

export function mix(a: string, b: string, t: number): string {
  const A = hex(a);
  const B = hex(b);
  return toHex(A.r + (B.r - A.r) * t, A.g + (B.g - A.g) * t, A.b + (B.b - A.b) * t);
}

export function dark(c: string, t = 0.25): string {
  return mix(c, '#140d22', t);
}

export function light(c: string, t = 0.25): string {
  return mix(c, '#ffffff', t);
}

/** Насыщенная тень «как в аниме»: темнее и чуть холоднее, а не серая */
export function shadowOf(c: string, t = 0.22): string {
  return mix(c, '#c96a6a', t);
}

export type P = [number, number];

/** Замкнутый контур по опорным точкам через квадратичные кривые */
export function blob(ctx: CanvasRenderingContext2D, pts: P[], close = true): void {
  if (pts.length < 2) return;
  ctx.beginPath();
  const mid = (a: P, b: P): P => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = close ? mid(pts[pts.length - 1], pts[0]) : pts[0];
  ctx.moveTo(start[0], start[1]);
  for (let i = 0; i < pts.length; i++) {
    const cur = pts[i];
    const next = pts[(i + 1) % pts.length];
    if (!close && i === pts.length - 1) break;
    const m = mid(cur, next);
    ctx.quadraticCurveTo(cur[0], cur[1], m[0], m[1]);
  }
  if (close) ctx.closePath();
}

/** Ломаная с острыми углами — для прядей и клиньев ткани */
export function poly(ctx: CanvasRenderingContext2D, pts: P[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

export function fill(ctx: CanvasRenderingContext2D, style: string | CanvasGradient): void {
  ctx.fillStyle = style;
  ctx.fill();
}

export function stroke(ctx: CanvasRenderingContext2D, style: string, w: number): void {
  ctx.strokeStyle = style;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

export function linear(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stops: [number, string][],
): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

export function radial(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r0: number,
  r1: number,
  stops: [number, string][],
): CanvasGradient {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

/** Детерминированный шум по строке — чтобы у каждой героини были свои мелочи */
export function seeded(str: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Техника «рисованного» кадра ───────────────────────────────

/** Цвет линии: сильно затемнённый и слегка уведённый в фиолетовый — как тушь */
export function ink(c: string, t = 0.62): string {
  return mix(mix(c, '#1a1030', t), '#3a1f4d', 0.18);
}

/** Обводка переменной толщины: сначала широкая внешняя, потом узкая внутренняя */
export function outline(
  ctx: CanvasRenderingContext2D,
  path: () => void,
  color: string,
  w: number,
): void {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  path();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.restore();
}

let hatchCache = new Map<string, CanvasPattern | null>();

/** Диагональная штриховка — заполняет теневые куски «от руки» */
export function hatch(
  ctx: CanvasRenderingContext2D,
  color: string,
  alpha: number,
  spacing = 7,
  width = 1.6,
): CanvasPattern | null {
  const key = `${color}|${alpha}|${spacing}|${width}`;
  const hit = hatchCache.get(key);
  if (hit !== undefined) return hit;
  const size = spacing * 2;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  let pat: CanvasPattern | null = null;
  if (g) {
    g.strokeStyle = rgba(color, alpha);
    g.lineWidth = width;
    g.lineCap = 'round';
    for (let i = -1; i < 3; i++) {
      g.beginPath();
      g.moveTo(i * spacing - 2, size + 2);
      g.lineTo(i * spacing + size + 2, -2);
      g.stroke();
    }
    pat = ctx.createPattern(c, 'repeat');
  }
  hatchCache.set(key, pat);
  return pat;
}

let grainTile: HTMLCanvasElement | null = null;

/** Лёгкое зерно поверх всего кадра — снимает «векторную» стерильность */
export function grain(ctx: CanvasRenderingContext2D, w: number, h: number, alpha = 0.05): void {
  if (!grainTile) {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const g = c.getContext('2d');
    if (g) {
      const img = g.createImageData(size, size);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 128 + (Math.random() - 0.5) * 190;
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }
    grainTile = c;
  }
  const pat = ctx.createPattern(grainTile, 'repeat');
  if (!pat) return;
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Заливка фигуры с обводкой и опциональной cel-тенью внутри */
export function inked(
  ctx: CanvasRenderingContext2D,
  path: () => void,
  fillStyle: string | CanvasGradient | CanvasPattern,
  inkColor: string,
  lineW: number,
  shade?: { path: () => void; style: string | CanvasPattern },
): void {
  path();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (shade) {
    ctx.save();
    path();
    ctx.clip();
    shade.path();
    ctx.fillStyle = shade.style;
    ctx.fill();
    ctx.restore();
  }
  path();
  ctx.strokeStyle = inkColor;
  ctx.lineWidth = lineW;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}
