import { rng } from '../game/engine/rng';

/**
 * Обстановка залов: факелы, жаровни, бочки, кости, саркофаги.
 * Всё рисуется в офскрин один раз. Это предметы, а не люди —
 * жёсткие формы код рисует честно.
 */

export type PropKind =
  | 'torch'
  | 'brazier'
  | 'barrel'
  | 'bones'
  | 'skull'
  | 'sarcophagus'
  | 'chain'
  | 'banner'
  | 'rubble'
  | 'crystal'
  | 'cage';

export interface PropArt {
  canvas: HTMLCanvasElement;
  /** высота в клетках */
  scale: number;
  /** от чего отсчитывается низ: 0 — пол, 1 — свод */
  hang: number;
  /** доля цвета, не гасимая мглой */
  emissive: number;
  /** анимированное пламя рисуется поверх, кадрами */
  frames?: HTMLCanvasElement[];
  /** ореол вокруг предмета — рисуется в мире, а не в спрайте:
   *  внутри спрайта он упирался бы в его границы и давал светлый прямоугольник */
  glow?: string;
}

const W = 192;
const H = 256;
const cache = new Map<string, PropArt>();

function make(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) draw(ctx);
  return c;
}

/** язык пламени: несколько слоёв с разным колыханием */
function fire(ctx: CanvasRenderingContext2D, x: number, y: number, hgt: number, ph: number, cool = false): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const k = i / 4;
    const w = hgt * (0.32 - k * 0.2);
    const wob = Math.sin(ph * 2 + i * 1.7) * hgt * 0.07;
    const top = y - hgt * (0.5 + k * 0.55) - Math.abs(wob) * 0.4;
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.quadraticCurveTo(x - w * 0.8, y - hgt * 0.45, x + wob, top);
    ctx.quadraticCurveTo(x + w * 0.8, y - hgt * 0.45, x + w, y);
    ctx.closePath();
    const g = ctx.createLinearGradient(x, y, x, top);
    if (cool) {
      g.addColorStop(0, i < 2 ? 'rgba(60,140,255,0.5)' : 'rgba(170,220,255,0.5)');
      g.addColorStop(1, 'rgba(220,240,255,0)');
    } else {
      g.addColorStop(0, i < 2 ? 'rgba(255,110,30,0.55)' : 'rgba(255,215,140,0.5)');
      g.addColorStop(1, 'rgba(255,250,210,0)');
    }
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.restore();
}

function wood(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, r: () => number): void {
  const g = ctx.createLinearGradient(x0, y0, x0 + w, y0 + h);
  g.addColorStop(0, '#4b3421');
  g.addColorStop(0.45, '#312114');
  g.addColorStop(1, '#1b120c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x0, y0, w, h, w * 0.12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 5; i++) {
    const x = x0 + (w * i) / 5 + (r() - 0.5) * 3;
    ctx.beginPath();
    ctx.moveTo(x, y0 + 3);
    ctx.lineTo(x, y0 + h - 3);
    ctx.stroke();
  }
  ctx.strokeStyle = '#6b6053';
  ctx.lineWidth = 5;
  for (const t of [0.18, 0.8]) {
    ctx.beginPath();
    ctx.moveTo(x0, y0 + h * t);
    ctx.lineTo(x0 + w, y0 + h * t);
    ctx.stroke();
  }
}

function stone(ctx: CanvasRenderingContext2D, pts: [number, number][], lit: string, dim: string): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
  ctx.closePath();
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const g = ctx.createLinearGradient(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
  g.addColorStop(0, lit);
  g.addColorStop(1, dim);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function boneShape(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, ang: number, w: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = '#b9b09a';
  ctx.beginPath();
  ctx.roundRect(-len / 2, -w / 2, len, w, w / 2);
  ctx.fill();
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc((s * len) / 2, -w * 0.45, w * 0.62, 0, Math.PI * 2);
    ctx.arc((s * len) / 2, w * 0.45, w * 0.62, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function skull(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = '#c3baa4';
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.2, s * 0.62, s * 0.58, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x - s * 0.36, y + s * 0.2, s * 0.72, s * 0.34, s * 0.14);
  ctx.fill();
  ctx.fillStyle = '#1a1712';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + d * s * 0.26, y - s * 0.22, s * 0.19, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.02);
  ctx.lineTo(x + s * 0.12, y + s * 0.16);
  ctx.lineTo(x - s * 0.12, y + s * 0.16);
  ctx.closePath();
  ctx.fill();
}

function build(kind: PropKind, seed: string): PropArt {
  const r = rng(seed);
  const base = H - 6;
  const FRAMES = 6;

  switch (kind) {
    case 'torch': {
      const canvas = make(W, H, (ctx) => {
        // кронштейн и держатель на стене
        ctx.strokeStyle = '#2b2b33';
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(W / 2, base);
        ctx.lineTo(W / 2, base - 96);
        ctx.stroke();
        ctx.fillStyle = '#3a3a44';
        ctx.beginPath();
        ctx.moveTo(W / 2 - 22, base - 96);
        ctx.lineTo(W / 2 + 22, base - 96);
        ctx.lineTo(W / 2 + 15, base - 132);
        ctx.lineTo(W / 2 - 15, base - 132);
        ctx.closePath();
        ctx.fill();
      });
      const frames = Array.from({ length: FRAMES }, (_, i) =>
        make(W, H, (ctx) => fire(ctx, W / 2, base - 126, 96, (i / FRAMES) * Math.PI * 2)),
      );
      return { canvas, scale: 0.62, hang: 0.52, emissive: 1, frames, glow: 'rgba(255,175,85,0.55)' };
    }
    case 'brazier': {
      const canvas = make(W, H, (ctx) => {
        ctx.strokeStyle = '#2f2f38';
        ctx.lineWidth = 8;
        for (const s of [-1, 0, 1]) {
          ctx.beginPath();
          ctx.moveTo(W / 2 + s * 30, base);
          ctx.lineTo(W / 2 + s * 8, base - 96);
          ctx.stroke();
        }
        stone(
          ctx,
          [
            [W / 2 - 46, base - 96],
            [W / 2 + 46, base - 96],
            [W / 2 + 34, base - 140],
            [W / 2 - 34, base - 140],
          ],
          '#54545f',
          '#25252d',
        );
        ctx.fillStyle = '#241a12';
        ctx.beginPath();
        ctx.ellipse(W / 2, base - 138, 34, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      const frames = Array.from({ length: FRAMES }, (_, i) =>
        make(W, H, (ctx) => fire(ctx, W / 2, base - 136, 108, (i / FRAMES) * Math.PI * 2)),
      );
      return { canvas, scale: 0.86, hang: 0, emissive: 1, frames, glow: 'rgba(255,175,85,0.6)' };
    }
    case 'crystal': {
      const canvas = make(W, H, (ctx) => {
        stone(ctx, [[W / 2 - 40, base], [W / 2 + 40, base], [W / 2 + 26, base - 26], [W / 2 - 26, base - 26]], '#3b3f52', '#1c1f2c');
        for (let i = 0; i < 3; i++) {
          const x = W / 2 + (i - 1) * 26;
          const h = 92 - Math.abs(i - 1) * 30;
          ctx.beginPath();
          ctx.moveTo(x, base - 22 - h);
          ctx.lineTo(x + 15, base - 22 - h * 0.42);
          ctx.lineTo(x + 10, base - 20);
          ctx.lineTo(x - 10, base - 20);
          ctx.lineTo(x - 15, base - 22 - h * 0.42);
          ctx.closePath();
          const g = ctx.createLinearGradient(x - 15, base - 22 - h, x + 15, base - 20);
          g.addColorStop(0, 'rgba(190,230,255,0.95)');
          g.addColorStop(0.5, 'rgba(90,150,235,0.85)');
          g.addColorStop(1, 'rgba(40,70,150,0.9)');
          ctx.fillStyle = g;
          ctx.fill();
        }
      });
      return { canvas, scale: 0.72, hang: 0, emissive: 0.95, glow: 'rgba(120,190,255,0.5)' };
    }
    case 'barrel':
      return {
        canvas: make(W, H, (ctx) => {
          wood(ctx, W / 2 - 42, base - 108, 84, 108, r);
          ctx.fillStyle = '#3a2919';
          ctx.beginPath();
          ctx.ellipse(W / 2, base - 108, 42, 11, 0, 0, Math.PI * 2);
          ctx.fill();
        }),
        scale: 0.62,
        hang: 0,
        emissive: 0,
      };
    case 'bones':
      return {
        canvas: make(W, H, (ctx) => {
          for (let i = 0; i < 7; i++) {
            boneShape(ctx, W / 2 + (r() - 0.5) * 110, base - 8 - r() * 22, 34 + r() * 30, (r() - 0.5) * 2.4, 8 + r() * 4);
          }
          skull(ctx, W / 2 + (r() - 0.5) * 40, base - 26, 26);
        }),
        scale: 0.42,
        hang: 0,
        emissive: 0,
      };
    case 'skull':
      return {
        canvas: make(W, H, (ctx) => skull(ctx, W / 2, base - 22, 30)),
        scale: 0.3,
        hang: 0,
        emissive: 0,
      };
    case 'sarcophagus':
      return {
        canvas: make(W, H, (ctx) => {
          stone(
            ctx,
            [[W / 2 - 62, base], [W / 2 + 62, base], [W / 2 + 54, base - 70], [W / 2 - 54, base - 70]],
            '#5b5b66',
            '#26262e',
          );
          stone(
            ctx,
            [[W / 2 - 58, base - 68], [W / 2 + 58, base - 68], [W / 2 + 46, base - 92], [W / 2 - 46, base - 92]],
            '#6a6a76',
            '#333340',
          );
          ctx.strokeStyle = 'rgba(200,190,160,0.28)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(W / 2, base - 60);
          ctx.lineTo(W / 2, base - 16);
          ctx.moveTo(W / 2 - 16, base - 46);
          ctx.lineTo(W / 2 + 16, base - 46);
          ctx.stroke();
        }),
        scale: 0.56,
        hang: 0,
        emissive: 0,
      };
    case 'chain':
      return {
        canvas: make(W, H, (ctx) => {
          ctx.strokeStyle = '#4a4a55';
          ctx.lineWidth = 6;
          for (const s of [-1, 1]) {
            const x = W / 2 + s * 26;
            for (let i = 0; i < 14; i++) {
              ctx.beginPath();
              ctx.ellipse(x + Math.sin(i * 0.7) * 3, 12 + i * 14, 6, 9, 0, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        }),
        scale: 1,
        hang: 1,
        emissive: 0,
      };
    case 'banner':
      return {
        canvas: make(W, H, (ctx) => {
          const g = ctx.createLinearGradient(W / 2 - 40, 0, W / 2 + 40, H);
          g.addColorStop(0, '#4a1c26');
          g.addColorStop(1, '#1d0c12');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(W / 2 - 40, 10);
          ctx.lineTo(W / 2 + 40, 10);
          ctx.lineTo(W / 2 + 34, 190);
          ctx.lineTo(W / 2 + 12, 168);
          ctx.lineTo(W / 2 - 10, 196);
          ctx.lineTo(W / 2 - 34, 170);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(210,180,110,0.5)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(W / 2, 84, 24, 0, Math.PI * 2);
          ctx.moveTo(W / 2, 60);
          ctx.lineTo(W / 2, 122);
          ctx.stroke();
        }),
        scale: 0.95,
        hang: 1,
        emissive: 0,
      };
    case 'cage':
      return {
        canvas: make(W, H, (ctx) => {
          ctx.strokeStyle = '#3c3c46';
          ctx.lineWidth = 5;
          for (let i = -3; i <= 3; i++) {
            ctx.beginPath();
            ctx.moveTo(W / 2 + i * 13, 60);
            ctx.lineTo(W / 2 + i * 16, 190);
            ctx.stroke();
          }
          for (const y of [70, 130, 186]) {
            ctx.beginPath();
            ctx.ellipse(W / 2, y, 44 + (y - 70) * 0.06, 10, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(W / 2, 8);
          ctx.lineTo(W / 2, 62);
          ctx.stroke();
          skull(ctx, W / 2, 150, 22);
        }),
        scale: 1.05,
        hang: 1,
        emissive: 0,
      };
    default:
      return {
        canvas: make(W, H, (ctx) => {
          for (let i = 0; i < 6; i++) {
            stone(
              ctx,
              [
                [W / 2 - 50 + i * 18, base - r() * 8],
                [W / 2 - 34 + i * 18, base - 14 - r() * 12],
                [W / 2 - 22 + i * 18, base - 2],
              ],
              '#565660',
              '#22222a',
            );
          }
        }),
        scale: 0.22,
        hang: 0,
        emissive: 0,
      };
  }
}

export function propArt(kind: PropKind, seed: string): PropArt {
  const key = `${kind}|${seed}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = build(kind, seed);
    cache.set(key, hit);
  }
  return hit;
}

export const PROP_ART = { W, H };
