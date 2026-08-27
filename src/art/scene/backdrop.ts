import { mix, rgba, seeded, dark, light } from '../illustration/paint';
import { blurOn, blurOff } from '../illustration/soft';
import type { Element } from '../../game/types';

/**
 * Тёмный студийный фон с боке и золотыми искрами — по референсу.
 * Никаких пейзажей: персонаж стоит в глубокой сине-чёрной пустоте,
 * позади мягкие расфокусированные круги света и парящая пыль.
 */

export interface Tint {
  /** самый тёмный угол */
  deep: string;
  /** основная масса фона */
  base: string;
  /** ореол за фигурой */
  glow: string;
  /** тёплые боке-круги */
  warm: string;
  /** холодные боке-круги */
  cool: string;
  /** искры */
  spark: string;
}

export const TINTS: Record<Element | 'neutral', Tint> = {
  neutral: {
    deep: '#05070d',
    base: '#0d1524',
    glow: '#1d2c47',
    warm: '#d8b070',
    cool: '#5b83b8',
    spark: '#ffe0a4',
  },
  flame: {
    deep: '#080610',
    base: '#14101f',
    glow: '#32222f',
    warm: '#e5a468',
    cool: '#6f6299',
    spark: '#ffd7a2',
  },
  tide: {
    deep: '#040810',
    base: '#0b1424',
    glow: '#1a2e4a',
    warm: '#a8ccd8',
    cool: '#4f81bd',
    spark: '#d3ebff',
  },
  verdant: {
    deep: '#05080e',
    base: '#0c1520',
    glow: '#1b2e37',
    warm: '#c9c48a',
    cool: '#5c8f95',
    spark: '#e8f2cc',
  },
  lumen: {
    deep: '#07070f',
    base: '#131426',
    glow: '#2d2a4a',
    warm: '#efd79f',
    cool: '#7a7bc0',
    spark: '#fff2d0',
  },
  umbra: {
    deep: '#040409',
    base: '#0a0a16',
    glow: '#1e1934',
    warm: '#a487c9',
    cool: '#4a4a8a',
    spark: '#dcccff',
  },
};

export function tintOf(e?: Element | null): Tint {
  return TINTS[e ?? 'neutral'] ?? TINTS.neutral;
}

/** один круг боке: мягкая середина, чуть более яркий ободок */
function disc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  a: number,
): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a * 0.42));
  g.addColorStop(0.55, rgba(color, a * 0.5));
  g.addColorStop(0.82, rgba(color, a * 0.78));
  g.addColorStop(0.95, rgba(color, a * 0.95));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export interface BackdropOpts {
  /** центр светового ореола по ширине, 0..1 */
  focus?: number;
  /** плотность боке */
  density?: number;
  /** высота линии горизонта тени, 0..1 (мягкая тень под фигурой) */
  floor?: number;
}

/** запекает фон один раз; далее только copy + анимированные искры */
export function buildBackdrop(
  w: number,
  h: number,
  tint: Tint,
  seed: string,
  opts: BackdropOpts = {},
): HTMLCanvasElement {
  const focus = opts.focus ?? 0.5;
  const density = opts.density ?? 1;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const rnd = seeded('bd' + seed);

  // основа: вертикальный градиент от почти чёрного верха к плотному низу
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, tint.deep);
  g.addColorStop(0.42, tint.base);
  g.addColorStop(0.78, mix(tint.base, tint.deep, 0.42));
  g.addColorStop(1, dark(tint.deep, 0.3));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // широкий ореол за фигурой
  const hx = w * focus;
  const hy = h * 0.44;
  const hr = Math.max(w, h) * 0.62;
  const halo = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
  halo.addColorStop(0, rgba(tint.glow, 0.62));
  halo.addColorStop(0.4, rgba(tint.glow, 0.28));
  halo.addColorStop(0.75, rgba(tint.glow, 0.08));
  halo.addColorStop(1, rgba(tint.glow, 0));
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';

  // дальний слой боке — крупный и сильно размытый
  ctx.globalCompositeOperation = 'lighter';
  blurOn(ctx, Math.max(6, w * 0.018));
  const far = Math.round(14 * density);
  for (let i = 0; i < far; i++) {
    const x = rnd() * w;
    const y = rnd() * h * 0.92;
    const r = w * (0.06 + rnd() * rnd() * 0.18);
    const warm = rnd() < 0.55;
    const col = warm ? tint.warm : tint.cool;
    // ближе к ореолу — ярче
    const d = Math.hypot(x - hx, y - hy) / hr;
    const a = (0.035 + rnd() * 0.055) * (1.25 - Math.min(1, d) * 0.7);
    disc(ctx, x, y, r, col, a);
  }
  blurOff(ctx);

  // средний слой — читаемые круги с ободком
  const mid = Math.round(22 * density);
  for (let i = 0; i < mid; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = w * (0.016 + rnd() * rnd() * 0.085);
    const warm = rnd() < 0.62;
    const col = warm ? tint.warm : tint.cool;
    const d = Math.hypot(x - hx, y - hy) / hr;
    const a = (0.05 + rnd() * 0.075) * (1.3 - Math.min(1, d) * 0.75);
    disc(ctx, x, y, r, col, a);
  }

  // мелкие яркие точки — далёкая пыль в фокусе
  const dust = Math.round(90 * density);
  for (let i = 0; i < dust; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = 0.6 + rnd() * 1.9;
    const col = rnd() < 0.7 ? tint.spark : tint.cool;
    ctx.fillStyle = rgba(col, 0.1 + rnd() * 0.3);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  // мягкая тень-пол под фигурой, чтобы персонаж не висел
  if (opts.floor != null) {
    const fy = h * opts.floor;
    const fg = ctx.createLinearGradient(0, fy - h * 0.14, 0, h);
    fg.addColorStop(0, rgba(tint.deep, 0));
    fg.addColorStop(0.55, rgba(tint.deep, 0.4));
    fg.addColorStop(1, rgba('#000000', 0.62));
    ctx.fillStyle = fg;
    ctx.fillRect(0, fy - h * 0.14, w, h - fy + h * 0.14);
  }

  // виньетка
  const v = ctx.createRadialGradient(w * 0.5, h * 0.46, Math.min(w, h) * 0.24, w * 0.5, h * 0.5, Math.max(w, h) * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(0.62, 'rgba(0,0,0,0.2)');
  v.addColorStop(1, 'rgba(0,0,0,0.62)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);

  return c;
}

// ── живые искры ──────────────────────────────────────────────

interface Mote {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  ph: number;
  sp: number;
  warm: boolean;
}

/** золотые частицы, плавно всплывающие вверх и мерцающие */
export class Sparks {
  private m: Mote[] = [];
  private w = 0;
  private h = 0;
  private rnd: () => number;
  private tint: Tint;
  private count: number;

  constructor(tint: Tint, count = 70, seed = 'sp') {
    this.tint = tint;
    this.count = count;
    this.rnd = seeded(seed);
  }

  resize(w: number, h: number): void {
    if (this.w === w && this.h === h) return;
    this.w = w;
    this.h = h;
    const r = this.rnd;
    this.m = [];
    for (let i = 0; i < this.count; i++) {
      this.m.push({
        x: r() * w,
        y: r() * h,
        r: 0.7 + r() * 2.6,
        vy: -(2 + r() * 9),
        vx: (r() - 0.5) * 3.4,
        ph: r() * Math.PI * 2,
        sp: 0.5 + r() * 1.9,
        warm: r() < 0.78,
      });
    }
  }

  draw(ctx: CanvasRenderingContext2D, t: number, dt: number): void {
    const { w, h } = this;
    if (!w) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.m) {
      p.y += p.vy * dt;
      p.x += p.vx * dt + Math.sin(t * 0.5 + p.ph) * 6 * dt;
      if (p.y < -12) {
        p.y = h + 12;
        p.x = this.rnd() * w;
      }
      if (p.x < -12) p.x = w + 12;
      if (p.x > w + 12) p.x = -12;
      const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * p.sp + p.ph));
      const col = p.warm ? this.tint.spark : this.tint.cool;
      const r = p.r * (0.85 + tw * 0.4);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4.2);
      g.addColorStop(0, rgba(col, 0.85 * tw));
      g.addColorStop(0.25, rgba(col, 0.3 * tw));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(light(col, 0.5), 0.9 * tw);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** мягкий подсвет снизу-сзади — «сцена» под ногами фигуры */
export function stageGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
  a = 0.5,
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(0.45, rgba(color, a * 0.34));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Готовая сцена под фигуры: фон печётся один раз на размер холста,
 * искры и подсвет пола рисуются каждый кадр.
 */
export class Stage {
  private baked: HTMLCanvasElement | null = null;
  private w = 0;
  private h = 0;
  private sparks: Sparks;
  private tint: Tint;
  private seed: string;
  private opts: BackdropOpts;

  constructor(tint: Tint, seed: string, opts: BackdropOpts & { sparks?: number } = {}) {
    this.tint = tint;
    this.seed = seed;
    this.opts = opts;
    this.sparks = new Sparks(tint, opts.sparks ?? 54, seed + '-sp');
  }

  resize(w: number, h: number): void {
    if (!w || !h) return;
    if (this.w === w && this.h === h && this.baked) return;
    this.w = w;
    this.h = h;
    this.baked = buildBackdrop(w, h, this.tint, this.seed, this.opts);
    this.sparks.resize(w, h);
  }

  /** горизонт «пола»: доля высоты, на которой стоят фигуры */
  draw(ctx: CanvasRenderingContext2D, t: number, dt: number, floorY?: number): void {
    if (!this.baked) return;
    ctx.drawImage(this.baked, 0, 0, this.w, this.h);
    if (floorY != null) {
      stageGlow(ctx, this.w * 0.5, floorY, this.w * 0.46, this.w * 0.1, this.tint.warm, 0.3);
    }
    this.sparks.draw(ctx, t, dt);
  }
}

/**
 * Полоса «земли» под ногами: не пейзаж, а лишь тёмная плоскость
 * с бегущими бликами — она даёт чувство движения по дороге,
 * не возвращая в кадр рисованный ландшафт.
 */
export function groundBand(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  y: number,
  tint: Tint,
  scroll: number,
): void {
  ctx.save();
  const g = ctx.createLinearGradient(0, y - h * 0.06, 0, h);
  g.addColorStop(0, rgba(tint.deep, 0));
  g.addColorStop(0.3, rgba(tint.deep, 0.6));
  g.addColorStop(1, rgba('#000000', 0.8));
  ctx.fillStyle = g;
  ctx.fillRect(0, y - h * 0.06, w, h - y + h * 0.06);

  // отражение сцены в мокрой плоскости
  ctx.globalCompositeOperation = 'lighter';
  const rg = ctx.createLinearGradient(0, y, 0, y + h * 0.1);
  rg.addColorStop(0, rgba(tint.glow, 0.24));
  rg.addColorStop(1, rgba(tint.glow, 0));
  ctx.fillStyle = rg;
  ctx.fillRect(0, y, w, h * 0.1);

  // бегущие блики — ощущение хода
  for (let i = 0; i < 14; i++) {
    const span = w * 1.6;
    const x = ((i * 137.5 - scroll * 0.6) % span + span) % span - w * 0.3;
    const d = i / 14;
    const yy = y + h * 0.012 + d * h * 0.075;
    const len = w * (0.05 + d * 0.12);
    ctx.fillStyle = rgba(tint.warm, 0.05 + d * 0.05);
    ctx.fillRect(x, yy, len, 1.4 + d * 2.2);
  }
  ctx.restore();
}
