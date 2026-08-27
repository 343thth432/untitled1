import { dark, light, mix, rgba, seeded, spline, type P } from './illustration/paint';

/**
 * Дорога: процедурный живописный пейзаж с параллаксом.
 * Каждый слой рисуется один раз в широкий тайл и потом
 * повторяется со смещением — так можно писать слой густо,
 * не пересчитывая его каждый кадр.
 */

export type BiomeId = 'mist' | 'steppe' | 'salt' | 'city';
export type Weather = 'none' | 'rain' | 'snow' | 'motes' | 'dust';

export interface Biome {
  id: BiomeId;
  name: string;
  /** небо: зенит → горизонт */
  sky: [string, string, string];
  sun: string;
  sunAt: [number, number];
  fog: string;
  /** дальние гряды */
  ridge: string[];
  /** средний план */
  mid: string;
  midAlt: string;
  /** земля у дороги */
  ground: string;
  groundLit: string;
  road: string;
  roadEdge: string;
  weather: Weather;
  /** плотность и цвет частиц */
  motes: string;
  /** общий тон кадра */
  grade: string;
  gradeAlpha: number;
  /** силуэты среднего плана */
  flora: 'pine' | 'grass' | 'pillar' | 'tower';
}

export const BIOMES: Record<BiomeId, Biome> = {
  mist: {
    id: 'mist',
    name: 'Туманный лес',
    sky: ['#b9d6de', '#d8e6e4', '#eef0e6'],
    sun: '#fff3d0',
    sunAt: [0.7, 0.3],
    fog: '#e6eeeb',
    ridge: ['#9fb6bb', '#8ba3aa', '#6f8a92'],
    mid: '#3f5a55',
    midAlt: '#2e4744',
    ground: '#41544a',
    groundLit: '#6b8268',
    road: '#c3b79c',
    roadEdge: '#6d6552',
    weather: 'motes',
    motes: '#f4ffe8',
    grade: '#5f8f96',
    gradeAlpha: 0.1,
    flora: 'pine',
  },
  steppe: {
    id: 'steppe',
    name: 'Дождевая степь',
    sky: ['#6d7b93', '#93a0b0', '#c3c2bd'],
    sun: '#e8e2d2',
    sunAt: [0.32, 0.24],
    fog: '#b9bcbc',
    ridge: ['#8d94a0', '#7b8390', '#666f7d'],
    mid: '#6b6a52',
    midAlt: '#54543f',
    ground: '#7a7350',
    groundLit: '#a99a67',
    road: '#a99669',
    roadEdge: '#665d46',
    weather: 'rain',
    motes: '#dfe6ef',
    grade: '#4d5a72',
    gradeAlpha: 0.14,
    flora: 'grass',
  },
  salt: {
    id: 'salt',
    name: 'Соляные равнины',
    sky: ['#f2c9b4', '#f7ddc6', '#fdeee0'],
    sun: '#fff0c8',
    sunAt: [0.24, 0.42],
    fog: '#fbe8dc',
    ridge: ['#d7bcb4', '#c9a9a4', '#b08f8e'],
    mid: '#e4d4cb',
    midAlt: '#cdb8b0',
    ground: '#eadfd4',
    groundLit: '#fdf6ec',
    road: '#efe0cd',
    roadEdge: '#b09a86',
    weather: 'dust',
    motes: '#fff4e2',
    grade: '#e79f77',
    gradeAlpha: 0.12,
    flora: 'pillar',
  },
  city: {
    id: 'city',
    name: 'Ночной город',
    sky: ['#161a2e', '#26263f', '#3d3550'],
    sun: '#ffd9a0',
    sunAt: [0.78, 0.2],
    fog: '#3a3550',
    ridge: ['#2b2b45', '#232338', '#1b1b2c'],
    mid: '#1a1a2c',
    midAlt: '#12121f',
    ground: '#20202f',
    groundLit: '#3a3a51',
    road: '#3c3950',
    roadEdge: '#1a1926',
    weather: 'rain',
    motes: '#ffd9a0',
    grade: '#2a2b5a',
    gradeAlpha: 0.2,
    flora: 'tower',
  },
};

// ── помощники ────────────────────────────────────────────────
function poly(ctx: CanvasRenderingContext2D, pts: P[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

/** гряда с рваным верхом */
function ridgeLine(rnd: () => number, w: number, base: number, amp: number, step: number): P[] {
  const pts: P[] = [];
  let x = -step;
  while (x <= w + step) {
    pts.push([x, base - amp * (0.35 + rnd() * 0.65)]);
    x += step;
  }
  return spline(pts, 6);
}

function tile(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) draw(ctx);
  return c;
}

// ── силуэты ──────────────────────────────────────────────────
function pine(ctx: CanvasRenderingContext2D, x: number, base: number, h: number, w: number): void {
  const tiers = 5;
  ctx.beginPath();
  ctx.moveTo(x, base - h);
  for (let i = 0; i < tiers; i++) {
    const t = (i + 1) / tiers;
    const y = base - h * (1 - t);
    const ww = w * t;
    ctx.lineTo(x + ww * 0.55, y + h * 0.06);
    ctx.lineTo(x + ww * 0.34, y + h * 0.03);
  }
  ctx.lineTo(x + w * 0.1, base);
  ctx.lineTo(x - w * 0.1, base);
  for (let i = tiers - 1; i >= 0; i--) {
    const t = (i + 1) / tiers;
    const y = base - h * (1 - t);
    const ww = w * t;
    ctx.lineTo(x - ww * 0.34, y + h * 0.03);
    ctx.lineTo(x - ww * 0.55, y + h * 0.06);
  }
  ctx.closePath();
  ctx.fill();
}

function tower(ctx: CanvasRenderingContext2D, rnd: () => number, x: number, base: number, h: number, w: number): void {
  ctx.fillRect(x - w / 2, base - h, w, h);
  // окна
  const cols = Math.max(1, Math.floor(w / 14));
  const rows = Math.max(2, Math.floor(h / 22));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rnd() > 0.4) continue;
      ctx.save();
      ctx.fillStyle = rnd() > 0.3 ? 'rgba(255,214,150,0.75)' : 'rgba(160,200,255,0.5)';
      ctx.fillRect(x - w / 2 + 5 + c * 14, base - h + 10 + r * 22, 5, 8);
      ctx.restore();
    }
  }
}

function pillar(ctx: CanvasRenderingContext2D, rnd: () => number, x: number, base: number, h: number, w: number): void {
  const pts: P[] = [
    [x - w * 0.5, base],
    [x - w * 0.34 + rnd() * 6, base - h * 0.5],
    [x - w * 0.2, base - h],
    [x + w * 0.16, base - h * 0.94],
    [x + w * 0.38 - rnd() * 6, base - h * 0.44],
    [x + w * 0.5, base],
  ];
  poly(ctx, pts);
  ctx.fill();
}

function grassTuft(ctx: CanvasRenderingContext2D, rnd: () => number, x: number, base: number, h: number): void {
  for (let i = 0; i < 5; i++) {
    const lean = (rnd() - 0.5) * h * 0.7;
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.quadraticCurveTo(x + lean * 0.4, base - h * 0.6, x + lean, base - h);
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

// ── слои ─────────────────────────────────────────────────────
interface Layer {
  canvas: HTMLCanvasElement;
  /** скорость относительно дороги */
  par: number;
  /** вертикальное положение верха слоя, доля высоты */
  top: number;
}

export interface RoadScene {
  biome: Biome;
  w: number;
  h: number;
  layers: Layer[];
  sky: HTMLCanvasElement;
  /** линия земли, доля высоты */
  horizon: number;
  seed: string;
}

const TILE = 1400;

export function buildScene(biome: Biome, w: number, h: number, seed: string): RoadScene {
  const horizon = 0.56;
  const hy = h * horizon;

  // ── небо ──
  const sky = tile(w, h, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, hy + 40);
    g.addColorStop(0, biome.sky[0]);
    g.addColorStop(0.55, biome.sky[1]);
    g.addColorStop(1, biome.sky[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, hy + 40);

    // светило и ореол
    const sx = w * biome.sunAt[0];
    const sy = hy * biome.sunAt[1];
    const halo = ctx.createRadialGradient(sx, sy, 2, sx, sy, h * 0.5);
    halo.addColorStop(0, rgba(biome.sun, 0.85));
    halo.addColorStop(0.16, rgba(biome.sun, 0.3));
    halo.addColorStop(0.5, rgba(biome.sun, 0.08));
    halo.addColorStop(1, rgba(biome.sun, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, hy + 40);
    ctx.beginPath();
    ctx.arc(sx, sy, h * 0.028, 0, Math.PI * 2);
    ctx.fillStyle = rgba(light(biome.sun, 0.5), 0.9);
    ctx.filter = 'blur(6px)';
    ctx.fill();
    ctx.filter = 'none';

    // облачные полосы
    const rnd = seeded(`${seed}sky`);
    for (let i = 0; i < 9; i++) {
      const y = hy * (0.12 + rnd() * 0.72);
      const len = w * (0.3 + rnd() * 0.7);
      const x = -w * 0.2 + rnd() * w;
      const th = h * (0.008 + rnd() * 0.02);
      ctx.save();
      ctx.filter = `blur(${(6 + rnd() * 14).toFixed(1)}px)`;
      ctx.globalAlpha = 0.14 + rnd() * 0.2;
      ctx.fillStyle = rnd() > 0.5 ? light(biome.sky[2], 0.4) : biome.fog;
      ctx.beginPath();
      ctx.ellipse(x + len / 2, y, len / 2, th, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });

  const layers: Layer[] = [];

  // ── три дальние гряды ──
  for (let i = 0; i < 3; i++) {
    const rnd = seeded(`${seed}ridge${i}`);
    const amp = h * (0.1 + i * 0.05);
    const lh = Math.ceil(amp + h * 0.2);
    const col = biome.ridge[i];
    const fogK = 0.55 - i * 0.18;
    const c = tile(TILE, lh, (ctx) => {
      const line = ridgeLine(rnd, TILE, lh, amp, 120 - i * 26);
      poly(ctx, [...line, [TILE, lh], [0, lh]]);
      const g = ctx.createLinearGradient(0, lh - amp, 0, lh);
      g.addColorStop(0, mix(col, biome.fog, fogK * 0.5));
      g.addColorStop(1, mix(col, biome.fog, fogK));
      ctx.fillStyle = g;
      ctx.fill();
      // подсветка кромки со стороны светила
      ctx.save();
      poly(ctx, [...line, [TILE, lh], [0, lh]]);
      ctx.clip();
      ctx.filter = 'blur(3px)';
      ctx.strokeStyle = rgba(biome.sun, 0.3 - i * 0.07);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(line[0][0], line[0][1]);
      for (const p of line) ctx.lineTo(p[0], p[1]);
      ctx.stroke();
      ctx.restore();
    });
    layers.push({ canvas: c, par: 0.05 + i * 0.06, top: horizon - (amp + h * 0.2) / h });
  }

  // ── средний план: лес / трава / столбы / башни ──
  {
    const rnd = seeded(`${seed}mid`);
    const lh = Math.ceil(h * 0.34);
    const c = tile(TILE, lh, (ctx) => {
      const base = lh;
      const n = biome.flora === 'grass' ? 150 : biome.flora === 'tower' ? 26 : 44;
      for (let i = 0; i < n; i++) {
        const x = (i / n) * TILE + (rnd() - 0.5) * 40;
        const far = rnd() < 0.45;
        const col = far ? mix(biome.mid, biome.fog, 0.45) : mix(biome.mid, biome.midAlt, rnd());
        ctx.fillStyle = col;
        ctx.strokeStyle = col;
        const hh = lh * (far ? 0.34 + rnd() * 0.22 : 0.52 + rnd() * 0.44);
        if (biome.flora === 'pine') pine(ctx, x, base, hh, hh * 0.4);
        else if (biome.flora === 'tower') tower(ctx, rnd, x, base, hh, 24 + rnd() * 40);
        else if (biome.flora === 'pillar') pillar(ctx, rnd, x, base, hh * 0.7, 30 + rnd() * 40);
        else grassTuft(ctx, rnd, x, base, hh * 0.16);
      }
      // дымка у подножия
      const g = ctx.createLinearGradient(0, lh * 0.45, 0, lh);
      g.addColorStop(0, rgba(biome.fog, 0));
      g.addColorStop(1, rgba(biome.fog, 0.55));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, TILE, lh);
    });
    layers.push({ canvas: c, par: 0.34, top: horizon - 0.34 + 0.015 });
  }

  // ── земля и дорога ──
  {
    const rnd = seeded(`${seed}ground`);
    const lh = Math.ceil(h * (1 - horizon) + 8);
    const roadTop = lh * 0.13;
    const roadBot = lh * 0.62;
    const c = tile(TILE, lh, (ctx) => {
      // луг от горизонта до обочины
      const g = ctx.createLinearGradient(0, 0, 0, lh);
      g.addColorStop(0, mix(biome.ground, biome.fog, 0.55));
      g.addColorStop(0.12, mix(biome.ground, biome.fog, 0.2));
      g.addColorStop(0.5, biome.ground);
      g.addColorStop(1, dark(biome.ground, 0.3));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, TILE, lh);

      // полотно дороги
      const rg = ctx.createLinearGradient(0, roadTop, 0, roadBot);
      rg.addColorStop(0, mix(biome.road, biome.fog, 0.42));
      rg.addColorStop(0.28, biome.road);
      rg.addColorStop(0.72, dark(biome.road, 0.06));
      rg.addColorStop(1, dark(biome.road, 0.2));
      ctx.fillStyle = rg;
      ctx.fillRect(0, roadTop, TILE, roadBot - roadTop);

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, roadTop, TILE, roadBot - roadTop);
      ctx.clip();
      // длинные тени от того, что стоит вдоль дороги
      ctx.save();
      ctx.filter = 'blur(9px)';
      for (let i = 0; i < 14; i++) {
        const x = (i / 14) * TILE + rnd() * 60;
        const wdt = 26 + rnd() * 70;
        const lean = (roadBot - roadTop) * (0.7 + rnd() * 0.7);
        ctx.beginPath();
        ctx.moveTo(x, roadTop - 6);
        ctx.lineTo(x + wdt, roadTop - 6);
        ctx.lineTo(x + wdt * 0.5 + lean * 0.5, roadTop + lean);
        ctx.lineTo(x - wdt * 0.1 + lean * 0.5, roadTop + lean);
        ctx.closePath();
        ctx.fillStyle = rgba(dark(biome.roadEdge, 0.4), 0.16 + rnd() * 0.12);
        ctx.fill();
      }
      ctx.restore();
      // колеи
      for (const k of [0.34, 0.66]) {
        const y = roadTop + (roadBot - roadTop) * k;
        ctx.save();
        ctx.filter = 'blur(7px)';
        ctx.strokeStyle = rgba(biome.roadEdge, 0.38);
        ctx.lineWidth = (roadBot - roadTop) * 0.13;
        ctx.beginPath();
        for (let x = 0; x <= TILE; x += 60) {
          const yy = y + Math.sin(x * 0.006 + k * 9) * 5;
          if (x === 0) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }
        ctx.stroke();
        ctx.restore();
      }
      // камни и щебень
      for (let i = 0; i < 320; i++) {
        const y = roadTop + rnd() * (roadBot - roadTop);
        const k = (y - roadTop) / (roadBot - roadTop);
        const x = rnd() * TILE;
        const r = 1.2 + k * 4.6 * rnd();
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.62, rnd() * 3, 0, Math.PI * 2);
        ctx.fillStyle = rnd() > 0.5 ? rgba(light(biome.road, 0.34), 0.5) : rgba(biome.roadEdge, 0.4);
        ctx.fill();
        if (rnd() > 0.75) {
          ctx.beginPath();
          ctx.ellipse(x - r * 0.3, y - r * 0.3, r * 0.5, r * 0.3, 0, 0, Math.PI * 2);
          ctx.fillStyle = rgba(light(biome.road, 0.6), 0.4);
          ctx.fill();
        }
      }
      // лужи в дождь
      if (biome.weather === 'rain') {
        for (let i = 0; i < 9; i++) {
          const y = roadTop + (0.25 + rnd() * 0.6) * (roadBot - roadTop);
          const x = rnd() * TILE;
          const rx = 20 + rnd() * 70;
          ctx.save();
          ctx.filter = 'blur(3px)';
          ctx.beginPath();
          ctx.ellipse(x, y, rx, rx * 0.16, 0, 0, Math.PI * 2);
          ctx.fillStyle = rgba(mix(biome.sky[1], biome.road, 0.35), 0.55);
          ctx.fill();
          ctx.restore();
        }
      }
      ctx.restore();

      // кромки дороги: трава наползает на полотно
      ctx.strokeStyle = rgba(biome.groundLit, 0.6);
      for (let i = 0; i < 150; i++) {
        const x = rnd() * TILE;
        grassTuft(ctx, rnd, x, roadTop + 3, 5 + rnd() * 12);
      }
      ctx.strokeStyle = rgba(dark(biome.groundLit, 0.2), 0.7);
      for (let i = 0; i < 130; i++) {
        const x = rnd() * TILE;
        grassTuft(ctx, rnd, x, roadBot + 2, 8 + rnd() * 20);
      }
      // кромки полотна
      ctx.save();
      ctx.filter = 'blur(2.5px)';
      ctx.strokeStyle = rgba(dark(biome.roadEdge, 0.25), 0.55);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, roadTop + 1);
      ctx.lineTo(TILE, roadTop + 1);
      ctx.moveTo(0, roadBot - 1);
      ctx.lineTo(TILE, roadBot - 1);
      ctx.stroke();
      ctx.restore();
      // мягкая тень под обочиной
      const eg = ctx.createLinearGradient(0, roadBot - 8, 0, roadBot + 26);
      eg.addColorStop(0, rgba(biome.roadEdge, 0.4));
      eg.addColorStop(1, rgba(biome.roadEdge, 0));
      ctx.fillStyle = eg;
      ctx.fillRect(0, roadBot - 8, TILE, 34);
      // ближний луг
      ctx.strokeStyle = rgba(dark(biome.ground, 0.35), 0.7);
      for (let i = 0; i < 170; i++) {
        const x = rnd() * TILE;
        grassTuft(ctx, rnd, x, roadBot + 20 + rnd() * (lh - roadBot - 20), 10 + rnd() * 26);
      }
    });
    layers.push({ canvas: c, par: 1, top: horizon - 8 / h });
  }

  // ── передний план ──
  {
    const rnd = seeded(`${seed}fore`);
    const lh = Math.ceil(h * 0.16);
    const c = tile(TILE, lh, (ctx) => {
      ctx.strokeStyle = rgba(dark(biome.ground, 0.5), 0.85);
      for (let i = 0; i < 90; i++) {
        const x = rnd() * TILE;
        grassTuft(ctx, rnd, x, lh, 26 + rnd() * 52);
      }
      const g = ctx.createLinearGradient(0, 0, 0, lh);
      g.addColorStop(0, rgba(dark(biome.ground, 0.6), 0));
      g.addColorStop(1, rgba(dark(biome.ground, 0.6), 0.5));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, TILE, lh);
    });
    layers.push({ canvas: c, par: 1.9, top: 1 - 0.16 });
  }

  return { biome, w, h, layers, sky, horizon, seed };
}

// ── погода ───────────────────────────────────────────────────
interface Mote {
  x: number;
  y: number;
  v: number;
  r: number;
  a: number;
  d: number;
}

export class Weatherfall {
  private motes: Mote[] = [];

  constructor(
    private biome: Biome,
    private w: number,
    private h: number,
  ) {
    const rnd = seeded(`${biome.id}weather`);
    const n = biome.weather === 'rain' ? 150 : biome.weather === 'snow' ? 90 : 46;
    for (let i = 0; i < n; i++) {
      this.motes.push({
        x: rnd() * w,
        y: rnd() * h,
        v: biome.weather === 'rain' ? 700 + rnd() * 600 : 12 + rnd() * 40,
        r: biome.weather === 'rain' ? 8 + rnd() * 12 : 1 + rnd() * 2.4,
        a: 0.16 + rnd() * 0.4,
        d: rnd() * Math.PI * 2,
      });
    }
  }

  draw(ctx: CanvasRenderingContext2D, t: number, dt: number, wind: number): void {
    const b = this.biome;
    if (b.weather === 'none') return;
    ctx.save();
    if (b.weather === 'rain') {
      ctx.strokeStyle = rgba(b.motes, 0.4);
      ctx.lineWidth = 1.1;
      for (const m of this.motes) {
        m.y += m.v * dt;
        m.x += wind * 60 * dt;
        if (m.y > this.h) {
          m.y = -20;
          m.x = Math.random() * this.w;
        }
        if (m.x > this.w) m.x -= this.w;
        ctx.globalAlpha = m.a;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - wind * 8, m.y + m.r);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = b.motes;
      for (const m of this.motes) {
        m.y -= (b.weather === 'motes' ? m.v : -m.v) * dt;
        m.x += Math.sin(t * 0.6 + m.d) * 14 * dt + wind * 22 * dt;
        if (m.y < -10) m.y = this.h + 10;
        if (m.y > this.h + 10) m.y = -10;
        if (m.x > this.w + 10) m.x -= this.w + 20;
        if (m.x < -10) m.x += this.w + 20;
        ctx.globalAlpha = m.a * (0.6 + 0.4 * Math.sin(t * 1.4 + m.d));
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

// ── отрисовка кадра ──────────────────────────────────────────
export function drawScene(
  ctx: CanvasRenderingContext2D,
  s: RoadScene,
  scroll: number,
  t: number,
): void {
  const { w, h } = s;
  ctx.drawImage(s.sky, 0, 0, w, h);

  for (const l of s.layers) {
    const lw = l.canvas.width;
    const lh = l.canvas.height;
    const y = l.top * h;
    let x = -((scroll * l.par) % lw);
    if (x > 0) x -= lw;
    while (x < w) {
      ctx.drawImage(l.canvas, Math.round(x), Math.round(y), lw, lh);
      x += lw;
    }
  }

  // атмосферная дымка у горизонта
  const fog = ctx.createLinearGradient(0, h * (s.horizon - 0.16), 0, h * (s.horizon + 0.1));
  fog.addColorStop(0, rgba(s.biome.fog, 0));
  fog.addColorStop(0.5, rgba(s.biome.fog, 0.42));
  fog.addColorStop(1, rgba(s.biome.fog, 0));
  ctx.fillStyle = fog;
  ctx.fillRect(0, h * (s.horizon - 0.18), w, h * 0.3);

  // общий тон и виньетка
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = s.biome.gradeAlpha;
  ctx.fillStyle = s.biome.grade;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.25, w * 0.5, h * 0.52, h * 0.78);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(20,16,32,0.35)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  void t;
}

// ── метки узлов на дороге ────────────────────────────────────
export type MarkerKind = 'foe' | 'elite' | 'boss' | 'rest' | 'find' | 'trade' | 'omen';

/** Рисует предмет-ориентир, стоящий на дороге */
export function drawMarker(
  ctx: CanvasRenderingContext2D,
  kind: MarkerKind,
  b: Biome,
  x: number,
  y: number,
  s: number,
  t: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // тень
  ctx.beginPath();
  ctx.ellipse(0, 2, 26, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(30,24,44,0.28)';
  ctx.fill();

  const ink = dark(b.roadEdge, 0.5);
  const warm = '#ffb469';

  if (kind === 'rest') {
    // костёр: поленья и живое пламя
    ctx.strokeStyle = ink;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (const a of [-0.5, 0.2, 0.9]) {
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * -18, -2);
      ctx.lineTo(Math.cos(a) * 18, -10);
      ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const k = 1 - i * 0.28;
      const wob = Math.sin(t * 6 + i) * 3;
      ctx.beginPath();
      ctx.moveTo(-13 * k, -8);
      ctx.quadraticCurveTo(-6 * k + wob, -30 * k, 0 + wob * 0.5, -46 * k);
      ctx.quadraticCurveTo(6 * k + wob, -30 * k, 13 * k, -8);
      ctx.closePath();
      ctx.fillStyle = i === 0 ? 'rgba(255,120,50,0.85)' : i === 1 ? 'rgba(255,190,90,0.9)' : 'rgba(255,240,190,0.95)';
      ctx.fill();
    }
    ctx.save();
    ctx.filter = 'blur(14px)';
    ctx.beginPath();
    ctx.arc(0, -22, 34, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,150,60,0.35)';
    ctx.fill();
    ctx.restore();
  } else if (kind === 'find') {
    // сундук
    ctx.fillStyle = mix(b.roadEdge, '#6b4a2c', 0.6);
    ctx.fillRect(-24, -30, 48, 30);
    ctx.beginPath();
    ctx.moveTo(-24, -30);
    ctx.quadraticCurveTo(0, -50, 24, -30);
    ctx.closePath();
    ctx.fillStyle = mix(b.roadEdge, '#8a5f38', 0.7);
    ctx.fill();
    ctx.fillStyle = warm;
    ctx.fillRect(-5, -34, 10, 14);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.4;
    ctx.strokeRect(-24, -30, 48, 30);
  } else if (kind === 'trade') {
    // навес торговца
    ctx.strokeStyle = ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.lineTo(-26, -44);
    ctx.moveTo(30, 0);
    ctx.lineTo(26, -44);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-38, -44);
    ctx.quadraticCurveTo(0, -60, 38, -44);
    ctx.lineTo(30, -34);
    ctx.quadraticCurveTo(0, -48, -30, -34);
    ctx.closePath();
    ctx.fillStyle = mix(b.sun, '#b3462f', 0.55);
    ctx.fill();
    ctx.fillStyle = rgba(warm, 0.8);
    ctx.beginPath();
    ctx.arc(0, -26, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'omen') {
    // придорожный камень со знаком
    const stone: P[] = [[-20, 0], [-16, -40], [-4, -54], [12, -50], [20, -18], [16, 0]];
    poly(ctx, stone);
    const g = ctx.createLinearGradient(-22, -54, 22, 0);
    g.addColorStop(0, light(b.ridge[0], 0.2));
    g.addColorStop(1, dark(b.ridge[2], 0.2));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = rgba('#e8d6ff', 0.75 + Math.sin(t * 3) * 0.2);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(-2, -30, 9, 0.4, 5.4);
    ctx.moveTo(-2, -44);
    ctx.lineTo(-2, -16);
    ctx.stroke();
  } else {
    // силуэт противника: тень с горящими глазами
    const tall = kind === 'boss' ? 108 : kind === 'elite' ? 84 : 68;
    const wide = kind === 'boss' ? 34 : 26;
    ctx.save();
    ctx.filter = 'blur(3px)';
    const body: P[] = [
      [-wide * 0.5, 0],
      [-wide * 0.62, -tall * 0.5],
      [-wide * 0.3, -tall * 0.86],
      [0, -tall],
      [wide * 0.3, -tall * 0.86],
      [wide * 0.62, -tall * 0.5],
      [wide * 0.5, 0],
    ];
    poly(ctx, body);
    const g = ctx.createLinearGradient(0, -tall, 0, 0);
    g.addColorStop(0, 'rgba(24,18,38,0.9)');
    g.addColorStop(1, 'rgba(24,18,38,0.5)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    const eye = kind === 'boss' ? '#ff8a5c' : kind === 'elite' ? '#ffd166' : '#c8a4ff';
    for (const s2 of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s2 * wide * 0.2, -tall * 0.82, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = eye;
      ctx.fill();
      ctx.save();
      ctx.filter = 'blur(6px)';
      ctx.beginPath();
      ctx.arc(s2 * wide * 0.2, -tall * 0.82, 7, 0, Math.PI * 2);
      ctx.fillStyle = rgba(eye, 0.7 + Math.sin(t * 4 + s2) * 0.2);
      ctx.fill();
      ctx.restore();
    }
    if (kind === 'boss') {
      ctx.save();
      ctx.filter = 'blur(18px)';
      ctx.beginPath();
      ctx.arc(0, -tall * 0.6, 60, 0, Math.PI * 2);
      ctx.fillStyle = rgba(eye, 0.22);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}
