import { dark, light, mix, rgba, seeded, type P } from './illustration/paint';
import { TINTS, type Tint } from './scene/backdrop';

/**
 * Отрезки Дороги. Пейзажа больше нет: сцена всюду одна — ночная пустота
 * с боке (см. scene/backdrop), а биом задаёт только оттенок этой пустоты,
 * погоду в кадре и цвет огней у меток.
 */

export type BiomeId = 'mist' | 'steppe' | 'salt' | 'city';
export type Weather = 'none' | 'rain' | 'snow' | 'motes' | 'dust';

export interface Biome {
  id: BiomeId;
  name: string;
  weather: Weather;
  /** цвет капель, снега и пыли */
  motes: string;
  /** цвет живого огня у меток */
  lamp: string;
  /** тёмный тон пустоты и боке */
  tint: Tint;
}

export const BIOMES: Record<BiomeId, Biome> = {
  mist: {
    id: 'mist',
    name: 'Туманный лес',
    weather: 'motes',
    motes: '#f6ffe8',
    lamp: '#ffd9a0',
    tint: TINTS.verdant,
  },
  steppe: {
    id: 'steppe',
    name: 'Выжженная степь',
    weather: 'dust',
    motes: '#f0dcb4',
    lamp: '#ffc370',
    tint: TINTS.flame,
  },
  salt: {
    id: 'salt',
    name: 'Соляные равнины',
    weather: 'snow',
    motes: '#ffffff',
    lamp: '#cfe8ff',
    tint: TINTS.tide,
  },
  city: {
    id: 'city',
    name: 'Мёртвый город',
    weather: 'rain',
    motes: '#bcd4ff',
    lamp: '#8fd0ff',
    tint: TINTS.umbra,
  },
};

// ── примитивы ────────────────────────────────────────────────
function poly(ctx: CanvasRenderingContext2D, pts: P[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

function blur(ctx: CanvasRenderingContext2D, px: number): void {
  ctx.filter = px > 0 ? `blur(${px.toFixed(1)}px)` : 'none';
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
  private splash: { x: number; y: number; t: number }[] = [];

  constructor(
    private biome: Biome,
    private w: number,
    private h: number,
  ) {
    const rnd = seeded(`${biome.id}weather`);
    const n = biome.weather === 'rain' ? 190 : biome.weather === 'snow' ? 90 : 52;
    for (let i = 0; i < n; i++) {
      this.motes.push({
        x: rnd() * w,
        y: rnd() * h,
        v: biome.weather === 'rain' ? 760 + rnd() * 700 : 12 + rnd() * 40,
        r: biome.weather === 'rain' ? 9 + rnd() * 14 : 1 + rnd() * 2.4,
        a: 0.14 + rnd() * 0.38,
        d: rnd() * Math.PI * 2,
      });
    }
  }

  draw(ctx: CanvasRenderingContext2D, t: number, dt: number, wind: number): void {
    const b = this.biome;
    if (b.weather === 'none') return;
    ctx.save();
    if (b.weather === 'rain') {
      ctx.strokeStyle = rgba(b.motes, 0.42);
      ctx.lineWidth = 1.1;
      for (const m of this.motes) {
        m.y += m.v * dt;
        m.x += wind * 70 * dt;
        if (m.y > this.h * 0.94) {
          if (Math.random() < 0.3) this.splash.push({ x: m.x, y: this.h * (0.72 + Math.random() * 0.2), t: 0 });
          m.y = -20;
          m.x = Math.random() * this.w;
        }
        if (m.x > this.w) m.x -= this.w;
        if (m.x < 0) m.x += this.w;
        ctx.globalAlpha = m.a;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - wind * 9, m.y + m.r);
        ctx.stroke();
      }
      // круги от капель
      ctx.strokeStyle = rgba(b.motes, 0.5);
      ctx.lineWidth = 1;
      for (let i = this.splash.length - 1; i >= 0; i--) {
        const s = this.splash[i];
        s.t += dt * 3;
        if (s.t > 1) {
          this.splash.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = (1 - s.t) * 0.5;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, 3 + s.t * 12, (3 + s.t * 12) * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = b.motes;
      for (const m of this.motes) {
        m.y -= (b.weather === 'motes' ? m.v : -m.v) * dt;
        m.x += Math.sin(t * 0.6 + m.d) * 16 * dt + wind * 26 * dt;
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

// ── метки узлов на дороге ────────────────────────────────────
export type MarkerKind = 'foe' | 'elite' | 'boss' | 'rest' | 'find' | 'trade' | 'omen';

/** Ориентир, стоящий на дороге впереди */
export function drawMarker(
  ctx: CanvasRenderingContext2D,
  kind: MarkerKind,
  b: Biome,
  x: number,
  y: number,
  s: number,
  t: number,
  count = 1,
): void {
  if (count > 1 && (kind === 'foe' || kind === 'elite')) {
    for (let i = count - 1; i >= 1; i--) {
      const dx = (i % 2 ? 1 : -1) * (16 + i * 9) * s;
      ctx.save();
      ctx.globalAlpha = 0.62;
      drawMarker(ctx, kind, b, x + dx, y - 5 * s * i, s * (0.82 - i * 0.06), t + i * 1.7, 1);
      ctx.restore();
    }
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.ellipse(0, 2, 30, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(30,24,44,0.3)';
  ctx.fill();

  const ink = dark(b.tint.deep, 0.3);
  const warm = '#ffb469';

  if (kind === 'rest') {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (const a of [-0.5, 0.2, 0.9]) {
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * -20, -2);
      ctx.lineTo(Math.cos(a) * 20, -11);
      ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const k = 1 - i * 0.28;
      const wob = Math.sin(t * 6 + i) * 3;
      ctx.beginPath();
      ctx.moveTo(-14 * k, -9);
      ctx.quadraticCurveTo(-6 * k + wob, -32 * k, wob * 0.5, -50 * k);
      ctx.quadraticCurveTo(6 * k + wob, -32 * k, 14 * k, -9);
      ctx.closePath();
      ctx.fillStyle = i === 0 ? 'rgba(255,120,50,0.9)' : i === 1 ? 'rgba(255,190,90,0.92)' : 'rgba(255,244,200,0.95)';
      ctx.fill();
    }
    ctx.save();
    blur(ctx, 18);
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.arc(0, -24, 44, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,150,60,0.4)';
    ctx.fill();
    ctx.restore();
    // искры от костра
    for (let i = 0; i < 7; i++) {
      const ph = (t * 0.6 + i * 0.31) % 1;
      ctx.beginPath();
      ctx.arc(Math.sin(i * 3 + t) * 12, -46 - ph * 46, 1.6 * (1 - ph), 0, Math.PI * 2);
      ctx.fillStyle = rgba('#ffca7a', (1 - ph) * 0.9);
      ctx.fill();
    }
  } else if (kind === 'find') {
    ctx.fillStyle = mix(b.tint.warm, '#5a3a22', 0.66);
    ctx.fillRect(-26, -32, 52, 32);
    ctx.beginPath();
    ctx.moveTo(-26, -32);
    ctx.quadraticCurveTo(0, -54, 26, -32);
    ctx.closePath();
    ctx.fillStyle = mix(b.tint.warm, '#7a5230', 0.72);
    ctx.fill();
    ctx.fillStyle = warm;
    ctx.fillRect(-5, -37, 10, 15);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.4;
    ctx.strokeRect(-26, -32, 52, 32);
    ctx.save();
    blur(ctx, 12);
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.arc(0, -30, 26, 0, Math.PI * 2);
    ctx.fillStyle = rgba(warm, 0.25 + Math.sin(t * 2) * 0.1);
    ctx.fill();
    ctx.restore();
  } else if (kind === 'trade') {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-32, 0);
    ctx.lineTo(-28, -48);
    ctx.moveTo(32, 0);
    ctx.lineTo(28, -48);
    ctx.stroke();
    const flap = Math.sin(t * 1.6) * 4;
    ctx.beginPath();
    ctx.moveTo(-42, -48);
    ctx.quadraticCurveTo(0, -66 + flap, 42, -48);
    ctx.lineTo(33, -37);
    ctx.quadraticCurveTo(0, -52 + flap, -33, -37);
    ctx.closePath();
    ctx.fillStyle = mix(b.lamp, '#b3462f', 0.55);
    ctx.fill();
    ctx.fillStyle = rgba(warm, 0.85);
    ctx.beginPath();
    ctx.arc(0, -28, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'omen') {
    const stone: P[] = [[-22, 0], [-18, -44], [-5, -58], [13, -54], [22, -20], [17, 0]];
    poly(ctx, stone);
    const g = ctx.createLinearGradient(-24, -58, 24, 0);
    g.addColorStop(0, light(b.tint.cool, 0.24));
    g.addColorStop(1, dark(b.tint.cool, 0.35));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2;
    ctx.stroke();
    const gl = 0.6 + Math.sin(t * 3) * 0.3;
    ctx.save();
    ctx.strokeStyle = rgba('#e8d6ff', gl);
    ctx.shadowColor = '#c9a6ff';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(-2, -32, 10, 0.4, 5.4);
    ctx.moveTo(-2, -48);
    ctx.lineTo(-2, -16);
    ctx.stroke();
    ctx.restore();
  } else {
    const tall = kind === 'boss' ? 116 : kind === 'elite' ? 90 : 72;
    const wide = kind === 'boss' ? 38 : 28;
    const sway = Math.sin(t * 1.4) * 3;
    ctx.save();
    blur(ctx, 3);
    const body: P[] = [
      [-wide * 0.5, 0],
      [-wide * 0.62, -tall * 0.5],
      [-wide * 0.3 + sway * 0.4, -tall * 0.86],
      [sway, -tall],
      [wide * 0.3 + sway * 0.4, -tall * 0.86],
      [wide * 0.62, -tall * 0.5],
      [wide * 0.5, 0],
    ];
    poly(ctx, body);
    const g = ctx.createLinearGradient(0, -tall, 0, 0);
    g.addColorStop(0, 'rgba(22,16,36,0.92)');
    g.addColorStop(1, 'rgba(22,16,36,0.45)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    // рваный подол тени
    ctx.save();
    blur(ctx, 6);
    for (let i = 0; i < 6; i++) {
      const px = -wide * 0.5 + (i / 5) * wide;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px + 4, -12 - Math.sin(t * 2 + i) * 8);
      ctx.lineTo(px + 8, 0);
      ctx.closePath();
      ctx.fillStyle = 'rgba(22,16,36,0.5)';
      ctx.fill();
    }
    ctx.restore();
    const eye = kind === 'boss' ? '#ff8a5c' : kind === 'elite' ? '#ffd166' : '#c8a4ff';
    for (const s2 of [-1, 1]) {
      const ex = s2 * wide * 0.34 + sway;
      const ey = -tall * 0.82;
      ctx.save();
      blur(ctx, 5);
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.arc(ex, ey, 6, 0, Math.PI * 2);
      ctx.fillStyle = rgba(eye, 0.75 + Math.sin(t * 4 + s2) * 0.2);
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.arc(ex, ey, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = eye;
      ctx.fill();
    }
    if (kind !== 'foe') {
      ctx.save();
      blur(ctx, 20);
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.arc(0, -tall * 0.6, kind === 'boss' ? 74 : 54, 0, Math.PI * 2);
      ctx.fillStyle = rgba(eye, 0.2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}
