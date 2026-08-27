import { rng } from '../game/engine/rng';
import type { MarkKind } from './map';

/**
 * Метки на клетках — предметы и силуэты в темноте. Рисуются один раз
 * в офскрин и дальше только масштабируются: это не «нарисованные люди»,
 * а тёмные формы со свечением, что кодом выходит честно.
 */

export interface MarkArt {
  canvas: HTMLCanvasElement;
  /** сколько клетки занимает по высоте */
  scale: number;
  /** доля свечения, которое не гасится мглой */
  emissive: number;
  /** цвет ореола вокруг метки */
  glow: string;
  label: string;
}

const W = 256;
const H = 320;
const cache = new Map<string, MarkArt>();

function make(draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (ctx) draw(ctx);
  return c;
}

function glowBall(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, inner: string, outer: string): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(0.4, outer);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** тёмная фигура в плаще: тело, капюшон, подол */
export function figure(ctx: CanvasRenderingContext2D, cx: number, base: number, hgt: number, wide: number, eye: string, rim: string): void {
  const top = base - hgt;
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.bezierCurveTo(cx + wide * 0.5, top + hgt * 0.06, cx + wide * 0.42, top + hgt * 0.22, cx + wide * 0.5, top + hgt * 0.34);
  ctx.bezierCurveTo(cx + wide * 0.95, top + hgt * 0.5, cx + wide * 1.05, base - hgt * 0.06, cx + wide * 1.1, base);
  ctx.lineTo(cx - wide * 1.1, base);
  ctx.bezierCurveTo(cx - wide * 1.05, base - hgt * 0.06, cx - wide * 0.95, top + hgt * 0.5, cx - wide * 0.5, top + hgt * 0.34);
  ctx.bezierCurveTo(cx - wide * 0.42, top + hgt * 0.22, cx - wide * 0.5, top + hgt * 0.06, cx, top);
  ctx.closePath();
  const g = ctx.createLinearGradient(cx - wide, top, cx + wide, base);
  g.addColorStop(0, '#10121e');
  g.addColorStop(0.5, '#070810');
  g.addColorStop(1, '#04050a');
  ctx.fillStyle = g;
  ctx.fill();

  // контровой по краю — иначе силуэт сливается со мглой
  ctx.save();
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  const r1 = ctx.createLinearGradient(cx - wide * 1.1, 0, cx - wide * 0.55, 0);
  r1.addColorStop(0, rim);
  r1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = r1;
  ctx.fillRect(cx - wide * 1.2, top, wide * 0.7, hgt + 10);
  const r2 = ctx.createLinearGradient(cx + wide * 1.1, 0, cx + wide * 0.6, 0);
  r2.addColorStop(0, rim);
  r2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = r2;
  ctx.fillRect(cx + wide * 0.5, top, wide * 0.72, hgt + 10);
  ctx.restore();

  // глаза
  ctx.globalCompositeOperation = 'lighter';
  const ey = top + hgt * 0.13;
  for (const s of [-1, 1]) {
    glowBall(ctx, cx + s * wide * 0.2, ey, wide * 0.34, eye, 'rgba(0,0,0,0)');
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx + s * wide * 0.2, ey, wide * 0.075, wide * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

function flame(ctx: CanvasRenderingContext2D, x: number, y: number, hgt: number, t: number): void {
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const k = i / 4;
    const w = hgt * (0.34 - k * 0.22);
    const top = y - hgt * (0.45 + k * 0.55);
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.quadraticCurveTo(x - w * 0.7, y - hgt * 0.5, x + Math.sin(t + i) * w * 0.3, top);
    ctx.quadraticCurveTo(x + w * 0.7, y - hgt * 0.5, x + w, y);
    ctx.closePath();
    const g = ctx.createLinearGradient(x, y, x, top);
    g.addColorStop(0, i < 2 ? 'rgba(255,120,40,0.55)' : 'rgba(255,220,150,0.5)');
    g.addColorStop(1, 'rgba(255,255,220,0)');
    ctx.fillStyle = g;
    ctx.fill();
  }
  glowBall(ctx, x, y - hgt * 0.35, hgt * 1.5, 'rgba(255,190,110,0.5)', 'rgba(255,120,40,0.14)');
  ctx.globalCompositeOperation = 'source-over';
}

function woodBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const g = ctx.createLinearGradient(x - w, y - h, x + w, y);
  g.addColorStop(0, '#4a3220');
  g.addColorStop(0.55, '#2e1e13');
  g.addColorStop(1, '#1a110b');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x - w, y - h, w * 2, h, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,150,110,0.35)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#6b5a3e';
  for (const s of [-0.6, 0, 0.6]) ctx.fillRect(x + s * w - 5, y - h, 10, h);
}

function build(kind: MarkKind, count: number, seed: string): MarkArt {
  const r = rng(seed);
  const base = H - 8;
  switch (kind) {
    case 'foe':
    case 'elite':
    case 'boss': {
      const boss = kind === 'boss';
      const elite = kind === 'elite';
      const eye = boss ? 'rgba(255,90,70,0.95)' : elite ? 'rgba(180,120,255,0.9)' : 'rgba(120,200,255,0.85)';
      const rim = boss ? 'rgba(255,120,80,0.34)' : elite ? 'rgba(170,140,255,0.3)' : 'rgba(140,190,255,0.26)';
      const n = boss ? 1 : Math.max(1, count);
      const canvas = make((ctx) => {
        for (let i = n - 1; i >= 0; i--) {
          const off = i === 0 ? 0 : (i % 2 ? 1 : -1) * (34 + i * 12);
          const k = i === 0 ? 1 : 0.82 - i * 0.05;
          ctx.save();
          ctx.globalAlpha = i === 0 ? 1 : 0.85;
          figure(
            ctx,
            W / 2 + off,
            base - (i === 0 ? 0 : 8),
            (boss ? 300 : 246) * k,
            (boss ? 58 : 40) * k,
            eye,
            rim,
          );
          ctx.restore();
        }
        if (boss) {
          // рога
          ctx.strokeStyle = 'rgba(30,24,34,1)';
          ctx.lineWidth = 11;
          ctx.lineCap = 'round';
          for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(W / 2 + s * 26, base - 292);
            ctx.quadraticCurveTo(W / 2 + s * 76, base - 320, W / 2 + s * 60, base - 366);
            ctx.stroke();
          }
        }
      });
      return {
        canvas,
        scale: boss ? 1.05 : 0.86,
        emissive: 0.45,
        glow: boss ? 'rgba(255,90,60,0.5)' : elite ? 'rgba(170,120,255,0.42)' : 'rgba(120,180,255,0.34)',
        label: boss ? 'Владыка' : elite ? 'Дозор' : 'Тварь',
      };
    }
    case 'rest': {
      const canvas = make((ctx) => {
        // камни очага
        ctx.fillStyle = '#22242c';
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(W / 2 + Math.cos(a) * 74, base - 8 + Math.sin(a) * 16, 16 + r() * 6, 11, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = '#3a2a1c';
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(W / 2 - s * 44, base - 10);
          ctx.lineTo(W / 2 + s * 30, base - 62);
          ctx.stroke();
        }
        flame(ctx, W / 2, base - 22, 120, 1.2);
      });
      return { canvas, scale: 0.52, emissive: 0.95, glow: 'rgba(255,170,90,0.6)', label: 'Привал' };
    }
    case 'find': {
      const canvas = make((ctx) => {
        woodBox(ctx, W / 2, base - 4, 74, 78);
        ctx.fillStyle = '#c8a94e';
        ctx.beginPath();
        ctx.roundRect(W / 2 - 13, base - 52, 26, 26, 5);
        ctx.fill();
        glowBall(ctx, W / 2, base - 56, 92, 'rgba(255,214,130,0.45)', 'rgba(255,170,60,0.12)');
      });
      return { canvas, scale: 0.42, emissive: 0.7, glow: 'rgba(255,200,110,0.45)', label: 'Тайник' };
    }
    case 'trade': {
      const canvas = make((ctx) => {
        ctx.strokeStyle = '#3a2c1e';
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(W / 2 + 62, base);
        ctx.lineTo(W / 2 + 62, base - 210);
        ctx.lineTo(W / 2 + 4, base - 210);
        ctx.stroke();
        woodBox(ctx, W / 2 - 10, base - 4, 78, 62);
        // фонарь
        ctx.fillStyle = '#2a2a34';
        ctx.beginPath();
        ctx.roundRect(W / 2 - 16, base - 208, 32, 40, 5);
        ctx.fill();
        glowBall(ctx, W / 2, base - 188, 120, 'rgba(255,226,160,0.5)', 'rgba(255,180,80,0.14)');
      });
      return { canvas, scale: 0.72, emissive: 0.75, glow: 'rgba(255,210,130,0.42)', label: 'Торговец' };
    }
    case 'omen': {
      const canvas = make((ctx) => {
        ctx.beginPath();
        ctx.moveTo(W / 2, base - 210);
        ctx.lineTo(W / 2 + 54, base - 120);
        ctx.lineTo(W / 2 + 34, base - 12);
        ctx.lineTo(W / 2 - 34, base - 12);
        ctx.lineTo(W / 2 - 54, base - 120);
        ctx.closePath();
        const g = ctx.createLinearGradient(W / 2 - 54, base - 210, W / 2 + 54, base);
        g.addColorStop(0, '#2b2740');
        g.addColorStop(1, '#12111e');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(170,140,255,0.85)';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(W / 2 - 18, base - 160);
        ctx.lineTo(W / 2 + 16, base - 118);
        ctx.moveTo(W / 2 + 16, base - 160);
        ctx.lineTo(W / 2 - 18, base - 118);
        ctx.moveTo(W / 2, base - 104);
        ctx.lineTo(W / 2, base - 62);
        ctx.stroke();
        glowBall(ctx, W / 2, base - 130, 130, 'rgba(160,130,255,0.4)', 'rgba(120,90,220,0.12)');
        ctx.globalCompositeOperation = 'source-over';
      });
      return { canvas, scale: 0.66, emissive: 0.8, glow: 'rgba(160,120,255,0.45)', label: 'Знамение' };
    }
    default: {
      const canvas = make((ctx) => {
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(W / 2, base, W / 2, base - 250);
        g.addColorStop(0, 'rgba(150,200,255,0.55)');
        g.addColorStop(1, 'rgba(120,170,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(W / 2 - 84, base);
        ctx.lineTo(W / 2 - 54, base - 236);
        ctx.lineTo(W / 2 + 54, base - 236);
        ctx.lineTo(W / 2 + 84, base);
        ctx.closePath();
        ctx.fill();
        glowBall(ctx, W / 2, base - 120, 160, 'rgba(170,215,255,0.4)', 'rgba(90,140,255,0.1)');
        ctx.globalCompositeOperation = 'source-over';
      });
      return { canvas, scale: 0.95, emissive: 1, glow: 'rgba(150,200,255,0.5)', label: 'Спуск' };
    }
  }
}

export function glowOrb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  inner: string,
  outer: string,
): void {
  glowBall(ctx, x, y, r, inner, outer);
}

export function markArt(kind: MarkKind, count: number, seed: string): MarkArt {
  const key = `${kind}|${count}|${seed}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = build(kind, count, seed);
    cache.set(key, hit);
  }
  return hit;
}
