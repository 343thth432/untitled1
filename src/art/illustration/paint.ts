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

// ── Живая линия ───────────────────────────────────────────────

/** Гладкая кривая Кэтмулла–Рома через опорные точки */
export function spline(pts: P[], samples = 12, closed = false): P[] {
  if (pts.length < 2) return pts.slice();
  const out: P[] = [];
  const n = pts.length;
  const at = (i: number): P => {
    if (closed) return pts[(i + n) % n];
    return pts[Math.max(0, Math.min(n - 1, i))];
  };
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let s = 0; s < samples; s++) {
      const t = s / samples;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}

/**
 * Линия переменной толщины: центральная линия обрастает перпендикулярами,
 * и получается залитая форма — как след кисти, а не ровный stroke.
 */
export function taper(
  ctx: CanvasRenderingContext2D,
  ctrl: P[],
  widths: number[],
  color: string,
  samples = 12,
): void {
  const line = spline(ctrl, samples);
  if (line.length < 2) return;
  const n = line.length;
  const hw = (i: number): number => {
    const t = (i / (n - 1)) * (widths.length - 1);
    const a = Math.floor(t);
    const b = Math.min(widths.length - 1, a + 1);
    return (widths[a] + (widths[b] - widths[a]) * (t - a)) / 2;
  };
  const left: P[] = [];
  const right: P[] = [];
  for (let i = 0; i < n; i++) {
    const p = line[i];
    const prev = line[Math.max(0, i - 1)];
    const next = line[Math.min(n - 1, i + 1)];
    let dx = next[0] - prev[0];
    let dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const w = hw(i);
    left.push([p[0] - dy * w, p[1] + dx * w]);
    right.push([p[0] + dy * w, p[1] - dx * w]);
  }
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < left.length; i++) ctx.lineTo(left[i][0], left[i][1]);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/** Замкнутая форма по опорным точкам через сплайн — мягче, чем blob */
export function shape(ctx: CanvasRenderingContext2D, pts: P[], samples = 14): void {
  const line = spline(pts, samples, true);
  ctx.beginPath();
  ctx.moveTo(line[0][0], line[0][1]);
  for (let i = 1; i < line.length; i++) ctx.lineTo(line[i][0], line[i][1]);
  ctx.closePath();
}

/** Контур замкнутой формы живой линией: толще снизу-справа, тоньше сверху-слева */
export function shapeInk(
  ctx: CanvasRenderingContext2D,
  pts: P[],
  color: string,
  wMin: number,
  wMax: number,
): void {
  const line = spline(pts, 10, true);
  const n = line.length;
  // толщина зависит от направления нормали: свет сверху-слева
  const widths: number[] = [];
  for (let i = 0; i < n; i++) {
    const prev = line[(i - 1 + n) % n];
    const next = line[(i + 1) % n];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const k = (nx * 0.6 + ny * 0.8 + 1) / 2;
    widths.push(wMin + (wMax - wMin) * k);
  }
  taper(ctx, [...line, line[0]], [...widths, widths[0]], color, 1);
}
