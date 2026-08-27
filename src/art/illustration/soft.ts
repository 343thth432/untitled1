import type { Appearance } from '../../game/types';
import { dark, hex, light, mix, rgba, spline, type P } from './paint';

/**
 * Инструменты «живописной» отрисовки: мягкая светотень вместо cel-заливок
 * и обводок. Всё строится на размытии — так форма читается объёмом,
 * а не контуром.
 */

let blurScale = 1;

/** размытие задаётся в пикселях канваса, а части рисуются с масштабом */
export function setBlurScale(s: number): void {
  blurScale = s;
}

export function blurOn(ctx: CanvasRenderingContext2D, px: number): void {
  ctx.filter = px > 0 ? `blur(${(px * blurScale).toFixed(2)}px)` : 'none';
}

export function blurOff(ctx: CanvasRenderingContext2D): void {
  ctx.filter = 'none';
}

export function path(ctx: CanvasRenderingContext2D, pts: P[], smooth = 14): void {
  const line = smooth > 1 ? spline(pts, smooth, true) : pts;
  ctx.beginPath();
  ctx.moveTo(line[0][0], line[0][1]);
  for (let i = 1; i < line.length; i++) ctx.lineTo(line[i][0], line[i][1]);
  ctx.closePath();
}

export function open(ctx: CanvasRenderingContext2D, pts: P[], smooth = 14): void {
  const line = smooth > 1 ? spline(pts, smooth, false) : pts;
  ctx.beginPath();
  ctx.moveTo(line[0][0], line[0][1]);
  for (let i = 1; i < line.length; i++) ctx.lineTo(line[i][0], line[i][1]);
}

/** мягкое пятно тени/света внутри уже установленной маски */
export function smudge(
  ctx: CanvasRenderingContext2D,
  pts: P[],
  color: string,
  alpha: number,
  softness: number,
  smooth = 14,
): void {
  ctx.save();
  blurOn(ctx, softness);
  ctx.globalAlpha = alpha;
  path(ctx, pts, smooth);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/** мягкий мазок вдоль линии — складка, блик, жилка */
export function stroke(
  ctx: CanvasRenderingContext2D,
  pts: P[],
  color: string,
  width: number,
  alpha: number,
  softness: number,
): void {
  ctx.save();
  blurOn(ctx, softness);
  ctx.globalAlpha = alpha;
  open(ctx, pts, 12);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

/** затемнение по внутреннему краю формы — заменяет контур */
export function edge(
  ctx: CanvasRenderingContext2D,
  pts: P[],
  color: string,
  width: number,
  alpha: number,
  softness = 0,
  smooth = 14,
): void {
  ctx.save();
  path(ctx, pts, smooth);
  ctx.clip();
  blurOn(ctx, softness || width * 0.45);
  ctx.globalAlpha = alpha;
  path(ctx, pts, smooth);
  ctx.strokeStyle = color;
  ctx.lineWidth = width * 2;
  ctx.stroke();
  ctx.restore();
}

/** мягкое затемнение только по боковым кромкам (без «шапок» на суставах) */
export function edgeSides(
  ctx: CanvasRenderingContext2D,
  mask: P[],
  sides: P[][],
  color: string,
  width: number,
  alpha: number,
  softness: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(mask[0][0], mask[0][1]);
  for (let i = 1; i < mask.length; i++) ctx.lineTo(mask[i][0], mask[i][1]);
  ctx.closePath();
  ctx.clip();
  blurOn(ctx, softness);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width * 2;
  ctx.lineCap = 'round';
  for (const line of sides) {
    ctx.beginPath();
    ctx.moveTo(line[0][0], line[0][1]);
    for (let i = 1; i < line.length; i++) ctx.lineTo(line[i][0], line[i][1]);
    ctx.stroke();
  }
  ctx.restore();
}

/** тонкая тёмная линия силуэта — чтобы форма не расплывалась на мелком масштабе */
export function contour(
  ctx: CanvasRenderingContext2D,
  pts: P[],
  color: string,
  width: number,
  alpha: number,
  smooth = 14,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  path(ctx, pts, smooth);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

/** блик: вытянутое размытое пятно */
export function gloss(
  ctx: CanvasRenderingContext2D,
  at: P,
  rx: number,
  ry: number,
  rot: number,
  color: string,
  alpha: number,
  softness: number,
): void {
  ctx.save();
  blurOn(ctx, softness);
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.ellipse(at[0], at[1], rx, ry, rot, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/** радиальное пятно (румянец, подповерхностное свечение) */
export function bloom(
  ctx: CanvasRenderingContext2D,
  at: P,
  r: number,
  color: string,
  alpha: number,
): void {
  const g = ctx.createRadialGradient(at[0], at[1], r * 0.05, at[0], at[1], r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.55, rgba(color, alpha * 0.42));
  g.addColorStop(1, rgba(color, 0));
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(at[0] - r, at[1] - r, r * 2, r * 2);
  ctx.restore();
}

// ── палитры ──────────────────────────────────────────────────

export interface Skin {
  spec: string;
  lit: string;
  mid: string;
  warm: string;
  shade: string;
  deep: string;
  sss: string;
  line: string;
}

export function skin(look: Appearance): Skin {
  const s = look.skin;
  return {
    spec: mix(light(s, 0.5), '#fff6ec', 0.5),
    lit: light(s, 0.16),
    mid: s,
    warm: mix(s, '#e79b7f', 0.22),
    shade: dark(mix(s, '#b07a86', 0.34), 0.1),
    deep: dark(mix(s, '#8a4f5e', 0.46), 0.2),
    sss: mix(s, '#d9614f', 0.38),
    line: dark(mix(s, '#7a4250', 0.6), 0.34),
  };
}

export interface Cloth {
  spec: string;
  lit: string;
  mid: string;
  shade: string;
  deep: string;
  line: string;
}

export function cloth(c: string, sheen = 0.3): Cloth {
  const l = hex(c);
  const lum = (l.r * 0.299 + l.g * 0.587 + l.b * 0.114) / 255;
  return {
    spec: light(c, 0.42 + sheen * 0.4),
    lit: light(c, 0.18 + sheen * 0.14),
    mid: c,
    shade: dark(mix(c, '#3a3350', 0.2), 0.24),
    deep: dark(mix(c, '#241f38', 0.34), 0.44),
    line: dark(mix(c, '#191430', 0.5), 0.3 + lum * 0.2),
  };
}

export interface Metal {
  spec: string;
  lit: string;
  mid: string;
  shade: string;
  deep: string;
  line: string;
}

export function metal(c: string): Metal {
  return {
    spec: mix(light(c, 0.72), '#ffffff', 0.55),
    lit: light(c, 0.34),
    mid: c,
    shade: dark(c, 0.3),
    deep: dark(mix(c, '#221a33', 0.4), 0.46),
    line: dark(mix(c, '#171226', 0.5), 0.34),
  };
}

/** вертикальный градиент кожи: свет сверху-слева, отражённый снизу */
export function skinFill(
  ctx: CanvasRenderingContext2D,
  t: Skin,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, t.lit);
  g.addColorStop(0.34, t.mid);
  g.addColorStop(0.68, t.warm);
  g.addColorStop(1, t.shade);
  return g;
}
