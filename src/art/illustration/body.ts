import type { Appearance } from '../../game/types';
import { dark, light, mix, rgba, seeded, type P } from './paint';
import {
  bloom,
  blurOff,
  blurOn,
  cloth,
  contour,
  edge,
  edgeSides,
  NIGHT,
  bodyGradient,
  fadeJoint,
  gloss,
  metal,
  path,
  rimPass,
  setBlurScale,
  skin,
  skinFill,
  smudge,
  stroke,
  type Cloth,
} from './soft';
import { HEAD, drawAccessory, drawEyes, drawBrows, drawEars, drawFaceBase, drawHairBack, drawHairFront, drawMouth, drawNose, hairTone } from './head';

/** Пространство фигуры: 560×1120, ~7.3 головы */
export const BW = 560;
export const BH = 1120;
const CX = 280;

/** Скелет реалистичной женской фигуры */
export const SK = {
  cx: CX,
  headTop: 34,
  chin: 190,
  neckBase: 218,
  shoulderY: 248,
  shoulderX: 74,
  bustY: 324,
  waistY: 432,
  elbowY: 428,
  elbowX: 96,
  wristY: 566,
  wristX: 108,
  hipY: 540,
  hipX: 30,
  kneeY: 812,
  kneeX: 48,
  ankleY: 1010,
  ankleX: 50,
  ground: 1064,
};

/** Голова: пространство 440×640 ужимается так, что подбородок ложится на SK.chin */
const HEAD_SCALE = 164 / (HEAD.chin - HEAD.top);

export function headTransform(ctx: CanvasRenderingContext2D): void {
  ctx.translate(CX, SK.chin);
  ctx.scale(HEAD_SCALE, HEAD_SCALE);
  ctx.translate(-HEAD.cx, -HEAD.chin);
}

// ── геометрия сегмента ───────────────────────────────────────
interface Seg {
  a: P;
  b: P;
  widths: number[];
  bow?: number;
  overA?: number;
  overB?: number;
}

interface Geom {
  mid: P[];
  left: P[];
  right: P[];
  outline: P[];
  u: P;
  n: P;
  w: number[];
}

function wAt(widths: number[], t: number): number {
  const k = Math.max(0, Math.min(1, t)) * (widths.length - 1);
  const i = Math.floor(k);
  const j = Math.min(widths.length - 1, i + 1);
  return widths[i] + (widths[j] - widths[i]) * (k - i);
}

function segGeom(s: Seg, steps = 28): Geom {
  const [ax, ay] = s.a;
  const [bx, by] = s.b;
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const u: P = [(bx - ax) / len, (by - ay) / len];
  const n: P = [-u[1], u[0]];
  const bow = s.bow ?? 0;
  const t0 = -(s.overA ?? 0) / len;
  const t1 = 1 + (s.overB ?? 0) / len;
  const mid: P[] = [];
  const left: P[] = [];
  const right: P[] = [];
  const w: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = t0 + (t1 - t0) * (i / steps);
    const b = bow * Math.sin(Math.PI * Math.max(0, Math.min(1, t)));
    const px = ax + u[0] * len * t + n[0] * b;
    const py = ay + u[1] * len * t + n[1] * b;
    const ww = wAt(s.widths, t);
    mid.push([px, py]);
    w.push(ww);
    left.push([px - n[0] * ww, py - n[1] * ww]);
    right.push([px + n[0] * ww, py + n[1] * ww]);
  }
  const arc = (p: P, ww: number, dir: number): P[] => {
    const out: P[] = [];
    for (let k = 1; k < 9; k++) {
      const th = (k / 9) * Math.PI;
      out.push([
        p[0] + (n[0] * Math.cos(th) * dir + u[0] * Math.sin(th) * dir) * ww,
        p[1] + (n[1] * Math.cos(th) * dir + u[1] * Math.sin(th) * dir) * ww,
      ]);
    }
    return out;
  };
  return {
    mid,
    left,
    right,
    outline: [
      ...left,
      ...arc(mid[steps], w[steps], 1).reverse(),
      ...right.slice().reverse(),
      ...arc(mid[0], w[0], -1).reverse(),
    ],
    u,
    n,
    w,
  };
}

/** тонкая линия только по бокам сегмента */
function contourSides(ctx: CanvasRenderingContext2D, g: Geom, color: string, width: number): void {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  for (const line of [g.left, g.right]) {
    ctx.beginPath();
    ctx.moveTo(line[0][0], line[0][1]);
    for (let i = 1; i < line.length; i++) ctx.lineTo(line[i][0], line[i][1]);
    ctx.stroke();
  }
  ctx.restore();
}

function inset(g: Geom, side: 1 | -1, k: number): P[] {
  const src = side > 0 ? g.right : g.left;
  return src.map((p, i) => [p[0] - g.n[0] * side * g.w[i] * k, p[1] - g.n[1] * side * g.w[i] * k] as P);
}

function band(g: Geom, side: 1 | -1, kFrom: number, kTo: number): P[] {
  const a = inset(g, side, kFrom);
  const b = inset(g, side, kTo);
  return [...a, ...b.reverse()];
}

function raw(ctx: CanvasRenderingContext2D, pts: P[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

/** объём цилиндра: свет, полутон, ядро тени, рефлекс */
function shadeTube(
  ctx: CanvasRenderingContext2D,
  g: Geom,
  side: 1 | -1,
  t: { spec: string; lit: string; shade: string; deep: string; sss: string },
  soft: number,
): void {
  ctx.save();
  raw(ctx, g.outline);
  ctx.clip();
  smudge(ctx, band(g, side, 0, 0.66), t.shade, 0.85, soft, 1);
  smudge(ctx, band(g, side, 0.62, 0.86), t.sss, 0.28, soft, 1);
  smudge(ctx, band(g, side, 0, 0.14), t.deep, 0.34, soft * 0.8, 1);
  smudge(ctx, band(g, side, -0.02, 0.1), t.lit, 0.4, soft * 0.7, 1);
  smudge(ctx, band(g, -side as 1 | -1, 0, 0.2), t.lit, 0.5, soft, 1);
  smudge(ctx, band(g, -side as 1 | -1, 0.16, 0.4), t.spec, 0.3, soft * 1.3, 1);
  ctx.restore();
}

function occlude(ctx: CanvasRenderingContext2D, g: Geom, at: 'a' | 'b', color: string, soft: number): void {
  const i = at === 'a' ? 0 : g.mid.length - 1;
  const p = g.mid[i];
  const w = g.w[i];
  ctx.save();
  raw(ctx, g.outline);
  ctx.clip();
  blurOn(ctx, soft);
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(p[0], p[1], w * 1.3, w * 0.6, Math.atan2(g.u[1], g.u[0]) + Math.PI / 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

interface LimbOpts {
  capA?: boolean;
  marks?: Mark[];
  occA?: boolean;
}

type Mark = 'knee' | 'ankle' | 'elbow' | 'shoulder' | 'calf' | 'thigh' | 'wristBone';

function drawLimb(
  ctx: CanvasRenderingContext2D,
  look: Appearance,
  s: Seg,
  side: 1 | -1,
  o: LimbOpts = {},
): Geom {
  const t = skin(look);
  const g = segGeom(s);
  raw(ctx, g.outline);
  ctx.fillStyle = skinFill(ctx, t, s.a[0] - 60, s.a[1], s.b[0] + 60, s.b[1]);
  ctx.fill();
  shadeTube(ctx, g, side, t, Math.max(6, g.w[0] * 0.5));
  if (o.occA) occlude(ctx, g, 'a', t.deep, g.w[0] * 0.7);
  if (o.marks) drawMarks(ctx, look, g, o.marks, side);
  edgeSides(ctx, g.outline, [g.left, g.right], t.line, Math.max(6, g.w[0] * 0.4), 0.32, g.w[0] * 0.3);
  contourSides(ctx, g, rgba(t.line, 0.26), 1.5);
  return g;
}

function atSeg(g: Geom, t: number): { p: P; w: number; u: P; n: P } {
  const i = Math.max(0, Math.min(g.mid.length - 1, Math.round(t * (g.mid.length - 1))));
  return { p: g.mid[i], w: g.w[i], u: g.u, n: g.n };
}

function drawMarks(
  ctx: CanvasRenderingContext2D,
  look: Appearance,
  g: Geom,
  marks: Mark[],
  side: 1 | -1,
): void {
  const t = skin(look);
  ctx.save();
  raw(ctx, g.outline);
  ctx.clip();
  for (const m of marks) {
    if (m === 'knee') {
      const s = atSeg(g, 0.1);
      bloom(ctx, s.p, s.w * 1.7, '#d4657a', 0.16);
      gloss(ctx, [s.p[0] - s.n[0] * s.w * 0.2, s.p[1] + 4], s.w * 0.6, s.w * 0.42, 0, t.spec, 0.3, 7);
      stroke(
        ctx,
        [
          [s.p[0] - s.n[0] * s.w * 0.62, s.p[1] + 14],
          [s.p[0], s.p[1] + 22],
          [s.p[0] + s.n[0] * s.w * 0.6, s.p[1] + 12],
        ],
        t.shade,
        5,
        0.34,
        4,
      );
    } else if (m === 'ankle') {
      const s = atSeg(g, 0.88);
      gloss(ctx, [s.p[0] + s.n[0] * s.w * 0.6 * side, s.p[1]], 5, 8, 0, t.spec, 0.4, 4);
      gloss(ctx, [s.p[0] - s.n[0] * s.w * 0.5 * side, s.p[1] + 6], 4, 7, 0, t.spec, 0.24, 4);
    } else if (m === 'calf') {
      const a = atSeg(g, 0.18);
      const b = atSeg(g, 0.52);
      stroke(
        ctx,
        [
          [a.p[0] - a.n[0] * a.w * 0.4, a.p[1]],
          [b.p[0] - b.n[0] * b.w * 0.52, b.p[1]],
        ],
        t.spec,
        a.w * 0.42,
        0.24,
        8,
      );
      stroke(
        ctx,
        [
          [a.p[0] + a.n[0] * a.w * 0.5, a.p[1] + 10],
          [b.p[0] + b.n[0] * b.w * 0.42, b.p[1]],
        ],
        t.shade,
        a.w * 0.4,
        0.24,
        8,
      );
    } else if (m === 'thigh') {
      const a = atSeg(g, 0.24);
      const b = atSeg(g, 0.72);
      stroke(
        ctx,
        [
          [a.p[0] - a.n[0] * a.w * 0.36, a.p[1]],
          [b.p[0] - b.n[0] * b.w * 0.42, b.p[1]],
        ],
        t.spec,
        a.w * 0.4,
        0.2,
        10,
      );
      // приводящая мышца
      stroke(
        ctx,
        [
          [a.p[0] + a.n[0] * a.w * 0.66 * side, a.p[1] - 10],
          [b.p[0] + b.n[0] * b.w * 0.5 * side, b.p[1] + 20],
        ],
        t.shade,
        a.w * 0.34,
        0.26,
        9,
      );
    } else if (m === 'elbow') {
      const s = atSeg(g, 0.12);
      bloom(ctx, s.p, s.w * 1.5, '#d4657a', 0.13);
      stroke(
        ctx,
        [
          [s.p[0] - s.n[0] * s.w * 0.5, s.p[1] + 6],
          [s.p[0] + s.n[0] * s.w * 0.5, s.p[1] + 2],
        ],
        t.shade,
        3.5,
        0.3,
        3,
      );
    } else if (m === 'shoulder') {
      const s = atSeg(g, 0.16);
      gloss(ctx, [s.p[0] - s.n[0] * s.w * 0.2, s.p[1]], s.w * 0.8, s.w * 0.5, 0, t.spec, 0.28, 10);
      stroke(
        ctx,
        [
          [s.p[0] - s.n[0] * s.w * 0.7, s.p[1] + s.w * 0.9],
          [s.p[0], s.p[1] + s.w * 1.5],
          [s.p[0] + s.n[0] * s.w * 0.7, s.p[1] + s.w * 0.8],
        ],
        t.shade,
        4.5,
        0.24,
        5,
      );
    } else if (m === 'wristBone') {
      const s = atSeg(g, 0.9);
      gloss(ctx, [s.p[0] + s.n[0] * s.w * 0.5 * side, s.p[1]], 4, 6, 0, t.spec, 0.34, 3);
    }
  }
  ctx.restore();
}

function subSeg(s: Seg, t0: number, t1: number, grow = 0): Seg {
  const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]) || 1;
  const u: P = [(s.b[0] - s.a[0]) / len, (s.b[1] - s.a[1]) / len];
  const n: P = [-u[1], u[0]];
  const at = (t: number): P => {
    const bo = (s.bow ?? 0) * Math.sin(Math.PI * Math.max(0, Math.min(1, t)));
    return [s.a[0] + u[0] * len * t + n[0] * bo, s.a[1] + u[1] * len * t + n[1] * bo];
  };
  const widths: number[] = [];
  for (let i = 0; i < 5; i++) widths.push(wAt(s.widths, t0 + (t1 - t0) * (i / 4)) + grow);
  return { a: at(t0), b: at(t1), widths, bow: (s.bow ?? 0) * 0.35 };
}

/** ткань на конечности: чулок, перчатка, рукав */
function drawSleeve(
  ctx: CanvasRenderingContext2D,
  s: Seg,
  c: Cloth,
  side: 1 | -1,
  trim?: string,
  sheer = false,
): void {
  const g = segGeom(s);
  raw(ctx, g.outline);
  const grd = ctx.createLinearGradient(s.a[0] - 50, s.a[1], s.b[0] + 50, s.b[1]);
  grd.addColorStop(0, c.lit);
  grd.addColorStop(0.4, c.mid);
  grd.addColorStop(1, c.shade);
  ctx.fillStyle = grd;
  ctx.save();
  if (sheer) ctx.globalAlpha = 0.88;
  ctx.fill();
  ctx.restore();
  ctx.save();
  raw(ctx, g.outline);
  ctx.clip();
  smudge(ctx, band(g, side, 0, 0.6), c.shade, 0.8, 10, 1);
  smudge(ctx, band(g, side, 0, 0.14), c.deep, 0.45, 8, 1);
  smudge(ctx, band(g, -side as 1 | -1, 0.1, 0.34), c.spec, 0.45, 12, 1);
  ctx.restore();
  edgeSides(ctx, g.outline, [g.left, g.right], c.line, 7, 0.36, 5);
  contourSides(ctx, g, rgba(c.line, 0.3), 1.4);
  if (trim) {
    const w0 = g.w[0];
    stroke(ctx, [g.left[0], g.mid[0], g.right[0]], trim, 9, 0.95, 1.5);
    stroke(ctx, [g.left[0], g.mid[0], g.right[0]], light(trim, 0.5), 3, 0.7, 1);
    // кружевная кромка
    for (let i = 0; i <= 7; i++) {
      const q: P = [
        g.mid[0][0] - g.n[0] * w0 + g.n[0] * ((2 * w0 * i) / 7),
        g.mid[0][1] - g.n[1] * w0 + g.n[1] * ((2 * w0 * i) / 7),
      ];
      ctx.beginPath();
      ctx.arc(q[0] + g.u[0] * 4, q[1] + g.u[1] * 4, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = rgba(light(trim, 0.55), 0.8);
      ctx.fill();
    }
  }
}

// ── кисть ────────────────────────────────────────────────────
function drawHand(ctx: CanvasRenderingContext2D, look: Appearance, g: Geom, side: 1 | -1): void {
  const t = skin(look);
  const w = g.mid[g.mid.length - 1];
  const u = g.u;
  const n = g.n;
  const at = (fu: number, fn: number): P => [
    w[0] + u[0] * fu + n[0] * fn * side,
    w[1] + u[1] * fu + n[1] * fn * side,
  ];

  // пальцы: четыре, слегка подогнуты
  const finger = (i: number): void => {
    const base = -11 + i * 8;
    const len = 30 - Math.abs(i - 1) * 4;
    const a = at(16, base);
    const b = at(16 + len * 0.62, base + 3 + i * 0.6);
    const c2 = at(16 + len, base + 7 + i * 1.4);
    const wdt = 6.4 - i * 0.5;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.quadraticCurveTo(b[0], b[1], c2[0], c2[1]);
    ctx.strokeStyle = t.mid;
    ctx.lineWidth = wdt * 2;
    ctx.stroke();
    ctx.strokeStyle = rgba(t.shade, 0.55);
    ctx.lineWidth = wdt * 2;
    ctx.setLineDash([]);
    ctx.stroke();
    ctx.restore();
    stroke(ctx, [a, b, c2], t.mid, wdt * 1.9, 1, 0.6);
    stroke(
      ctx,
      [
        [a[0] - n[0] * wdt * 0.5 * side, a[1] - n[1] * wdt * 0.5 * side],
        [c2[0] - n[0] * wdt * 0.4 * side, c2[1] - n[1] * wdt * 0.4 * side],
      ],
      t.spec,
      wdt * 0.7,
      0.3,
      1.4,
    );
    stroke(ctx, [a, b, c2], rgba(t.line, 0.3), wdt * 2.1, 0.35, 2.4);
  };
  for (let i = 3; i >= 0; i--) finger(i);

  // ладонь
  const palm: P[] = [
    at(-8, -14),
    at(10, -18),
    at(24, -14),
    at(28, 2),
    at(24, 17),
    at(8, 22),
    at(-8, 15),
  ];
  path(ctx, palm, 10);
  ctx.fillStyle = skinFill(ctx, t, at(-10, -18)[0], at(-10, -18)[1], at(30, 22)[0], at(30, 22)[1]);
  ctx.fill();
  ctx.save();
  path(ctx, palm, 10);
  ctx.clip();
  smudge(ctx, [at(4, 4), at(26, 6), at(28, 18), at(2, 20)], t.shade, 0.55, 7);
  gloss(ctx, at(8, -5), 11, 6, 0.3, t.spec, 0.32, 6);
  ctx.restore();
  edge(ctx, palm, t.line, 6, 0.3, 4, 10);

  // большой палец
  const th0 = at(-2, -13);
  const th1 = at(12, -24);
  const th2 = at(26, -22);
  stroke(ctx, [th0, th1, th2], t.mid, 13, 1, 0.8);
  stroke(
    ctx,
    [
      [th0[0] - n[0] * 3 * side, th0[1] - n[1] * 3 * side],
      [th2[0] - n[0] * 2 * side, th2[1] - n[1] * 2 * side],
    ],
    t.spec,
    4,
    0.32,
    1.6,
  );
  stroke(ctx, [th0, th1, th2], rgba(t.line, 0.3), 14, 0.35, 2.6);
}

// ── стопа ────────────────────────────────────────────────────
function drawFoot(ctx: CanvasRenderingContext2D, at: P, side: 1 | -1, c: Cloth, tr: string): void {
  const x = at[0];
  const y = at[1];
  const f = side;
  const boot: P[] = [
    [x - 17 * f, y - 24],
    [x + 18 * f, y - 22],
    [x + 23 * f, y + 10],
    [x + 46 * f, y + 30],
    [x + 50 * f, y + 44],
    [x + 8 * f, y + 47],
    [x - 19 * f, y + 36],
  ];
  path(ctx, boot, 12);
  const g = ctx.createLinearGradient(x - 30 * f, y - 24, x + 46 * f, y + 46);
  g.addColorStop(0, c.lit);
  g.addColorStop(0.35, c.mid);
  g.addColorStop(1, c.deep);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  path(ctx, boot, 12);
  ctx.clip();
  smudge(ctx, [[x + 6 * f, y - 24], [x + 24 * f, y - 18], [x + 50 * f, y + 46], [x + 12 * f, y + 47]], c.deep, 0.6, 9);
  gloss(ctx, [x - 6 * f, y + 2], 9, 20, 0.1, c.spec, 0.5, 7);
  gloss(ctx, [x + 30 * f, y + 30], 14, 6, 0.5, c.spec, 0.4, 6);
  ctx.restore();
  edge(ctx, boot, c.line, 7, 0.4, 5, 12);
  contour(ctx, boot, rgba(c.line, 0.3), 1.4, 1, 12);

  const heel: P[] = [
    [x - 17 * f, y + 32],
    [x - 5 * f, y + 34],
    [x - 3 * f, y + 62],
    [x - 13 * f, y + 62],
  ];
  path(ctx, heel, 8);
  const hg = ctx.createLinearGradient(x - 18 * f, y + 32, x + 2 * f, y + 62);
  hg.addColorStop(0, light(tr, 0.4));
  hg.addColorStop(0.5, tr);
  hg.addColorStop(1, dark(tr, 0.35));
  ctx.fillStyle = hg;
  ctx.fill();
  edge(ctx, heel, dark(tr, 0.5), 4, 0.4, 3, 8);
  // ремешок
  stroke(ctx, [[x - 19 * f, y - 12], [x, y - 17], [x + 19 * f, y - 10]], tr, 7, 0.95, 1.5);
  stroke(ctx, [[x - 19 * f, y - 14], [x, y - 19], [x + 19 * f, y - 12]], light(tr, 0.5), 2.4, 0.7, 1);
}

// ── торс ─────────────────────────────────────────────────────
function torsoShape(look: Appearance): P[] {
  const f = look.figure;
  const hip = 92 + f * 12;
  const waist = 48 + f * 6;
  const rib = 60 + f * 4;
  return [
    [CX - 25, SK.chin - 40],
    [CX - 30, SK.neckBase],
    [CX - 56, SK.shoulderY - 12],
    [CX - 88, SK.shoulderY + 12],
    [CX - 78, 318],
    [CX - rib, 372],
    [CX - waist - 4, 404],
    [CX - waist, SK.waistY],
    [CX - 62, 488],
    [CX - hip, 546],
    [CX - hip + 6, 606],
    [CX - 54, 636],
    [CX, 650],
    [CX + 54, 636],
    [CX + hip - 6, 606],
    [CX + hip, 546],
    [CX + 62, 488],
    [CX + waist, SK.waistY],
    [CX + waist + 4, 404],
    [CX + rib, 372],
    [CX + 78, 318],
    [CX + 88, SK.shoulderY + 12],
    [CX + 56, SK.shoulderY - 12],
    [CX + 30, SK.neckBase],
    [CX + 25, SK.chin - 40],
  ];
}

function drawTorso(ctx: CanvasRenderingContext2D, look: Appearance): void {
  const t = skin(look);
  const f = look.figure;
  const pts = torsoShape(look);

  path(ctx, pts, 14);
  ctx.fillStyle = skinFill(ctx, t, CX - 110, 240, CX + 110, 650);
  ctx.fill();

  ctx.save();
  path(ctx, pts, 14);
  ctx.clip();

  // основная светотень: свет сверху-слева
  smudge(
    ctx,
    [[CX + 20, 200], [CX + 100, 268], [CX + 66, 372], [CX + 44, 440], [CX + 74, 520], [CX + 104, 620], [CX + 10, 656], [CX + 30, 460]],
    t.shade,
    0.8,
    28,
  );
  smudge(ctx, [[CX + 54, 300], [CX + 96, 268], [CX + 82, 470], [CX + 96, 600], [CX + 56, 600]], t.sss, 0.22, 26);
  smudge(
    ctx,
    [[CX - 96, 280], [CX - 66, 262], [CX - 62, 380], [CX - 52, 470], [CX - 80, 560], [CX - 96, 470]],
    t.lit,
    0.5,
    24,
  );
  // шея и ключицы
  smudge(ctx, [[CX - 30, SK.chin - 18], [CX + 30, SK.chin - 18], [CX + 27, SK.chin + 26], [CX, SK.chin + 36], [CX - 27, SK.chin + 24]], t.deep, 0.45, 14);
  stroke(ctx, [[CX - 74, SK.shoulderY - 4], [CX - 32, SK.shoulderY + 6], [CX - 6, SK.shoulderY - 2]], t.shade, 6, 0.4, 4);
  stroke(ctx, [[CX + 74, SK.shoulderY - 4], [CX + 32, SK.shoulderY + 6], [CX + 6, SK.shoulderY - 2]], t.shade, 6, 0.34, 4);
  stroke(ctx, [[CX - 70, SK.shoulderY - 9], [CX - 32, SK.shoulderY + 1], [CX - 6, SK.shoulderY - 7]], t.spec, 3.4, 0.4, 3);
  stroke(ctx, [[CX + 70, SK.shoulderY - 9], [CX + 32, SK.shoulderY + 1], [CX + 6, SK.shoulderY - 7]], t.spec, 3.4, 0.34, 3);
  smudge(ctx, [[CX - 12, SK.shoulderY - 8], [CX + 12, SK.shoulderY - 8], [CX + 8, SK.shoulderY + 8], [CX - 8, SK.shoulderY + 8]], t.deep, 0.4, 6);
  // дельтовидные: объём плеча, чтобы рука росла из тела
  for (const s2 of [-1, 1] as const) {
    gloss(ctx, [CX + s2 * 70, SK.shoulderY + 14], 26, 20, s2 * 0.3, t.spec, 0.34, 14);
    smudge(
      ctx,
      [
        [CX + s2 * 46, SK.shoulderY + 32],
        [CX + s2 * 84, SK.shoulderY + 26],
        [CX + s2 * 80, 322],
        [CX + s2 * 50, 314],
      ],
      t.shade,
      0.4,
      14,
    );
    stroke(
      ctx,
      [[CX + s2 * 44, SK.shoulderY + 6], [CX + s2 * 74, SK.shoulderY + 40], [CX + s2 * 62, 320]],
      t.shade,
      6,
      0.3,
      6,
    );
  }

  // грудная клетка и рёбра
  stroke(ctx, [[CX - 56, 386], [CX - 34, 400]], t.shade, 5, 0.22, 5);
  stroke(ctx, [[CX + 56, 386], [CX + 34, 400]], t.shade, 5, 0.24, 5);
  // средняя линия живота
  stroke(ctx, [[CX + 1, 392], [CX - 1, 440], [CX + 2, 470]], t.shade, 4, 0.3, 4);
  // «кубики» — очень мягко
  for (const s of [-1, 1] as const) {
    stroke(ctx, [[CX + s * 6, 404], [CX + s * 30, 408]], t.shade, 4, 0.16, 5);
    stroke(ctx, [[CX + s * 6, 438], [CX + s * 28, 442]], t.shade, 4, 0.16, 5);
  }
  // пупок
  smudge(ctx, [[CX - 5, 458], [CX + 5, 458], [CX + 4, 472], [CX - 4, 472]], t.deep, 0.55, 4);
  gloss(ctx, [CX, 476], 6, 3, 0, t.spec, 0.3, 4);
  // косые мышцы и линии таза
  stroke(ctx, [[CX - 60, 502], [CX - 32, 560], [CX - 14, 594]], t.shade, 7, 0.3, 6);
  stroke(ctx, [[CX + 60, 502], [CX + 32, 560], [CX + 14, 594]], t.shade, 7, 0.26, 6);
  stroke(ctx, [[CX - 66, 496], [CX - 36, 552], [CX - 18, 588]], t.spec, 3.4, 0.24, 4);
  // складка бедра
  stroke(ctx, [[CX - 78, 596], [CX - 34, 624]], t.shade, 6, 0.3, 5);
  stroke(ctx, [[CX + 78, 596], [CX + 34, 624]], t.shade, 6, 0.26, 5);
  // подвздошные косточки
  gloss(ctx, [CX - 58, 508], 12, 7, -0.3, t.spec, 0.3, 6);
  gloss(ctx, [CX + 58, 508], 11, 7, 0.3, t.spec, 0.24, 6);
  ctx.restore();

  edge(ctx, pts, t.line, 13, 0.3, 9, 14);
  contour(ctx, pts, rgba(t.line, 0.24), 1.6, 1, 14);

  // ── грудь ────────────────────────────────────────────────
  const br = 36 + f * 24;
  const bx = 30 + f * 8;
  for (const s of [-1, 1] as const) {
    const bcx = CX + s * bx;
    const bcy = SK.bustY;
    const b: P[] = [
      [bcx - s * 22, bcy - br * 0.98],
      [bcx + s * br * 0.66, bcy - br * 0.74],
      [bcx + s * br * 1.02, bcy + br * 0.06],
      [bcx + s * br * 0.7, bcy + br * 0.84],
      [bcx - s * br * 0.12, bcy + br * 0.94],
      [bcx - s * br * 0.58, bcy + br * 0.42],
    ];
    path(ctx, b, 14);
    const grd = ctx.createRadialGradient(
      bcx - s * br * 0.24,
      bcy - br * 0.4,
      br * 0.1,
      bcx,
      bcy,
      br * 1.5,
    );
    grd.addColorStop(0, t.lit);
    grd.addColorStop(0.42, t.mid);
    grd.addColorStop(0.78, t.warm);
    grd.addColorStop(1, t.shade);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.save();
    path(ctx, b, 14);
    ctx.clip();
    smudge(
      ctx,
      [
        [bcx - s * br * 0.6, bcy + br * 0.34],
        [bcx + s * br * 0.8, bcy + br * 0.22],
        [bcx + s * br * 0.72, bcy + br * 0.96],
        [bcx - s * br * 0.2, bcy + br * 1.02],
      ],
      t.deep,
      0.5,
      12,
    );
    smudge(
      ctx,
      [
        [bcx - s * br * 0.5, bcy + br * 0.5],
        [bcx + s * br * 0.7, bcy + br * 0.4],
        [bcx + s * br * 0.64, bcy + br * 0.86],
        [bcx - s * br * 0.16, bcy + br * 0.9],
      ],
      t.sss,
      0.3,
      12,
    );
    gloss(ctx, [bcx - s * br * 0.16, bcy - br * 0.3], br * 0.42, br * 0.28, s * -0.4, t.spec, 0.4, 12);
    ctx.restore();
    edge(ctx, b, t.line, 9, 0.24, 7, 14);
  }
  // ложбинка
  stroke(ctx, [[CX, SK.bustY - br * 0.62], [CX - 1, SK.bustY], [CX + 1, SK.bustY + br * 0.52]], t.deep, 7, 0.45, 5);
  stroke(ctx, [[CX - 6, SK.bustY - br * 0.4], [CX - 7, SK.bustY + br * 0.2]], t.spec, 3, 0.2, 4);
}

// ── костюм ───────────────────────────────────────────────────
function fabric(
  ctx: CanvasRenderingContext2D,
  pts: P[],
  c: Cloth,
  soft = 10,
  smooth = 14,
): void {
  path(ctx, pts, smooth);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const g = ctx.createLinearGradient(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
  g.addColorStop(0, c.lit);
  g.addColorStop(0.36, c.mid);
  g.addColorStop(0.82, c.shade);
  g.addColorStop(1, c.deep);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  path(ctx, pts, smooth);
  ctx.clip();
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  smudge(ctx, [[x1 - 30, y0 - 14], [x1 + 16, y0 - 14], [x1 + 16, y1 + 16], [x1 - 42, y1 + 16]], c.deep, 0.5, soft * 1.6, 1);
  ctx.restore();
  edge(ctx, pts, c.line, soft, 0.36, soft * 0.7, smooth);
  contour(ctx, pts, rgba(c.line, 0.3), 1.5, 1, smooth);
}

function fold(ctx: CanvasRenderingContext2D, a: P, b: P, c: Cloth, w: number, up = false): void {
  stroke(ctx, [a, [(a[0] + b[0]) / 2 + (up ? 3 : -3), (a[1] + b[1]) / 2], b], up ? c.spec : c.deep, w, up ? 0.4 : 0.42, w * 0.7);
}

/** одиночный завиток: спираль, затухающая к центру */
function scroll(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  s: 1 | -1,
  turns: number,
  col: string,
  w: number,
  a: number,
): void {
  const pts: P[] = [];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const ang = -Math.PI * 0.4 + t * Math.PI * 2 * turns;
    const rr = r * (1 - t * 0.84);
    pts.push([x + s * rr * Math.cos(ang), y + rr * Math.sin(ang)]);
  }
  stroke(ctx, pts, col, w, a, 1.1);
}

/**
 * Серебряная филигрань по тёмной броне: стебель вдоль пластины и
 * зеркальные завитки. Рисуется дважды — тёмный оттиск со сдвигом
 * даёт впечатление гравировки, светлый сверху — саму нить.
 */
function filigree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y0: number,
  y1: number,
  half: number,
  silver: string,
  shade: string,
  curls = 3,
): void {
  const h = y1 - y0;
  const pass = (dx: number, dy: number, col: string, w: number, a: number): void => {
    for (const s of [-1, 1] as const) {
      const stem: P[] = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        stem.push([x + dx + s * Math.sin(t * 2.4) * half * 0.62, y0 + dy + t * h]);
      }
      stroke(ctx, stem, col, w, a, 1.2);
      for (let k = 0; k < curls; k++) {
        const t = 0.16 + (k / Math.max(1, curls - 1)) * 0.7;
        const bx = x + dx + s * Math.sin(t * 2.4) * half * 0.62;
        const by = y0 + dy + t * h;
        const r = half * (0.3 + (k % 2) * 0.12);
        scroll(ctx, bx + s * r * 0.7, by, r, s, 0.82, col, w * 0.8, a * 0.9);
      }
    }
  };
  pass(1.4, 1.6, shade, 2.6, 0.5);
  pass(0, 0, silver, 2, 0.72);
}

function drawOutfit(ctx: CanvasRenderingContext2D, look: Appearance, rnd: () => number): void {
  const st = look.outfitStyle;
  const c = cloth(look.outfit, st === 'leotard' || st === 'harness' ? 0.62 : 0.28);
  const tr = look.outfitTrim;
  // отделка — серебро, сами пластины — вороная сталь
  const m = metal(mix(look.outfit, '#12151f', 0.4));
  const sv = metal(tr);
  const f = look.figure;
  const br = 36 + f * 24;
  const bustTop = SK.bustY - br - 6;
  const bustBot = SK.bustY + br * 0.96;

  const plate = (pts: P[]): void => {
    path(ctx, pts, 14);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const g = ctx.createLinearGradient(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
    g.addColorStop(0, m.spec);
    g.addColorStop(0.24, m.lit);
    g.addColorStop(0.52, m.mid);
    g.addColorStop(0.74, m.deep);
    g.addColorStop(0.9, m.lit);
    g.addColorStop(1, m.shade);
    ctx.fillStyle = g;
    ctx.fill();
    edge(ctx, pts, m.line, 9, 0.42, 6, 14);
    // серебряный кант по краю пластины
    contour(ctx, pts, rgba(sv.mid, 0.5), 2.4, 1, 14);
    contour(ctx, pts, rgba(sv.spec, 0.42), 1, 1, 14);
  };

  // ── верх ─────────────────────────────────────────────────
  if (st === 'sarashi') {
    for (let i = 0; i < 4; i++) {
      const y = bustTop + 8 + i * (br * 0.5);
      fabric(
        ctx,
        [[CX - 82, y - 6], [CX, y + 10], [CX + 82, y - 6], [CX + 80, y + 18], [CX, y + 34], [CX - 80, y + 18]],
        i % 2 ? cloth(light(look.outfit, 0.12)) : c,
        8,
      );
    }
    stroke(ctx, [[CX + 46, bustTop + 6], [CX + 92, bustTop + 46], [CX + 80, bustTop + 106]], tr, 12, 0.9, 3);
  } else if (st === 'harness') {
    for (const s of [-1, 1] as const) {
      fabric(
        ctx,
        [
          [CX + s * 8, SK.bustY - br * 0.46],
          [CX + s * (br + 26), SK.bustY - br * 0.6],
          [CX + s * (br + 30), SK.bustY + br * 0.24],
          [CX + s * br * 0.72, SK.bustY + br * 0.82],
          [CX + s * 5, SK.bustY + br * 0.44],
        ],
        c,
        8,
      );
      stroke(ctx, [[CX + s * 30, SK.bustY - br * 0.78], [CX + s * 62, SK.shoulderY + 12]], tr, 8, 0.85, 1.6);
      stroke(ctx, [[CX + s * 30, SK.bustY - br * 0.8], [CX + s * 62, SK.shoulderY + 9]], light(tr, 0.45), 2.4, 0.5, 1.2);
    }
    stroke(ctx, [[CX - 84, SK.bustY - br * 0.16], [CX, SK.bustY - br * 0.02], [CX + 84, SK.bustY - br * 0.16]], tr, 10, 0.95, 2);
  } else if (st === 'plate') {
    plate([
      [CX - 80, bustTop + 26],
      [CX - 46, bustTop - 6],
      [CX - 13, bustTop + 30],
      [CX, bustTop + 20],
      [CX + 13, bustTop + 30],
      [CX + 46, bustTop - 6],
      [CX + 80, bustTop + 26],
      [CX + 70, bustBot + 6],
      [CX + 30, 406],
      [CX, 418],
      [CX - 30, 406],
      [CX - 70, bustBot + 6],
    ]);
    stroke(ctx, [[CX, bustTop + 26], [CX, 412]], sv.mid, 3, 0.45, 2);
    stroke(ctx, [[CX + 3, bustTop + 26], [CX + 3, 412]], m.deep, 3, 0.4, 2);
    filigree(ctx, CX, bustTop + 34, bustBot + 2, 44, sv.spec, m.deep, 3);
    for (const s of [-1, 1] as const) {
      stroke(
        ctx,
        [[CX + s * 10, bustTop + 36], [CX + s * 54, bustTop + 30], [CX + s * 68, bustBot - 6], [CX + s * 26, bustBot + 10]],
        m.deep,
        4,
        0.5,
        2,
      );
      stroke(
        ctx,
        [[CX + s * 12, bustTop + 32], [CX + s * 56, bustTop + 26], [CX + s * 70, bustBot - 10], [CX + s * 28, bustBot + 6]],
        sv.spec,
        2.4,
        0.6,
        1.4,
      );
    }
    // брюшная пластина
    plate([
      [CX - 46, 424],
      [CX, 414],
      [CX + 46, 424],
      [CX + 40, 486],
      [CX, 506],
      [CX - 40, 486],
    ]);
    // горжет
    plate([
      [CX - 44, SK.neckBase + 4],
      [CX, SK.neckBase + 20],
      [CX + 44, SK.neckBase + 4],
      [CX + 38, SK.neckBase + 28],
      [CX, SK.neckBase + 44],
      [CX - 38, SK.neckBase + 28],
    ]);
    // заклёпки по кромке кирасы
    for (let i = 0; i < 5; i++) {
      const a = -0.9 + i * 0.45;
      const rx = CX + Math.sin(a) * 72;
      const ry = bustBot + 4 + Math.cos(a) * 8;
      ctx.beginPath();
      ctx.arc(rx, ry, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = m.mid;
      ctx.fill();
      gloss(ctx, [rx - 1, ry - 1.2], 1.6, 1.2, 0, m.spec, 0.9, 0.8);
    }
  } else if (st === 'qipao') {
    fabric(
      ctx,
      [
        [CX - 76, bustTop + 22],
        [CX - 32, bustTop - 8],
        [CX + 18, bustTop + 32],
        [CX + 80, bustTop + 6],
        [CX + 70, 420],
        [CX + 32, 462],
        [CX - 44, 454],
        [CX - 72, 402],
      ],
      c,
      11,
    );
    stroke(ctx, [[CX + 18, bustTop + 32], [CX - 22, 372], [CX - 48, 452]], tr, 11, 0.9, 2);
    fabric(
      ctx,
      [
        [CX - 32, SK.neckBase - 26],
        [CX, SK.neckBase - 18],
        [CX + 32, SK.neckBase - 26],
        [CX + 30, SK.neckBase + 8],
        [CX, SK.neckBase + 18],
        [CX - 30, SK.neckBase + 8],
      ],
      c,
      7,
    );
    for (let i = 0; i < 3; i++) {
      const px = CX - 26 + i * 4;
      const py = 342 + i * 44;
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = light(tr, 0.3);
      ctx.fill();
      gloss(ctx, [px - 1.4, py - 1.6], 2, 1.6, 0, '#ffffff', 0.7, 1);
    }
  } else if (st === 'robe') {
    fabric(
      ctx,
      [
        [CX - 50, bustTop + 26],
        [CX, bustTop + 2],
        [CX + 50, bustTop + 26],
        [CX + 44, bustBot + 22],
        [CX, 458],
        [CX - 44, bustBot + 22],
      ],
      c,
      10,
    );
    for (const s of [-1, 1] as const) {
      stroke(ctx, [[CX + s * 50, bustTop + 26], [CX + s * 68, 386], [CX + s * 58, 462]], tr, 11, 0.9, 2);
    }
  } else {
    fabric(
      ctx,
      [
        [CX - 82, bustTop + 24],
        [CX - 44, bustTop - 6],
        [CX, bustTop + 28],
        [CX + 44, bustTop - 6],
        [CX + 82, bustTop + 24],
        [CX + 74, bustBot + 6],
        [CX, bustBot + 22],
        [CX - 74, bustBot + 6],
      ],
      c,
      10,
    );
    stroke(
      ctx,
      [[CX - 82, bustTop + 26], [CX - 44, bustTop + 2], [CX, bustTop + 32], [CX + 44, bustTop + 2], [CX + 82, bustTop + 26]],
      tr,
      8,
      0.9,
      2,
    );
    if (st === 'leotard' || st === 'coat') {
      for (const s of [-1, 1] as const) {
        stroke(ctx, [[CX + s * 40, bustTop + 20], [CX + s * 62, SK.shoulderY + 10]], c.mid, 8, 0.85, 1.6);
        stroke(ctx, [[CX + s * 40, bustTop + 17], [CX + s * 62, SK.shoulderY + 7]], c.spec, 2.4, 0.4, 1.2);
      }
    }
    fold(ctx, [CX - 42, bustTop + 32], [CX - 32, bustBot], c, 5);
    fold(ctx, [CX + 36, bustTop + 28], [CX + 28, bustBot - 4], c, 5);
    fold(ctx, [CX - 12, bustTop + 40], [CX - 6, bustBot - 8], c, 4, true);
  }

  // ── низ ──────────────────────────────────────────────────
  const highCut = st === 'leotard' || st === 'harness' || st === 'slit';
  const bottom: P[] = highCut
    ? [
        [CX - 74, 528],
        [CX, 518],
        [CX + 74, 528],
        [CX + 46, 592],
        [CX + 18, 638],
        [CX, 650],
        [CX - 18, 638],
        [CX - 46, 592],
      ]
    : [
        [CX - 80, 530],
        [CX, 520],
        [CX + 80, 530],
        [CX + 76, 604],
        [CX + 38, 640],
        [CX, 650],
        [CX - 38, 640],
        [CX - 76, 604],
      ];
  if (st === 'plate') plate(bottom);
  else fabric(ctx, bottom, c, 10);
  fold(ctx, [CX - 40, 540], [CX - 22, 604], c, 5);
  fold(ctx, [CX + 38, 542], [CX + 20, 606], c, 5);

  // пояс
  stroke(ctx, [[CX - 84, 528], [CX, 516], [CX + 84, 528]], tr, 13, 0.85, 2.6);
  stroke(ctx, [[CX - 82, 524], [CX, 512], [CX + 82, 524]], light(tr, 0.4), 4, 0.45, 2.2);
  const gemPts: P[] = [[CX, 514], [CX + 16, 532], [CX, 554], [CX - 16, 532]];
  path(ctx, gemPts, 6);
  const gg = ctx.createLinearGradient(CX - 16, 512, CX + 16, 554);
  gg.addColorStop(0, light(look.aura, 0.6));
  gg.addColorStop(0.5, look.aura);
  gg.addColorStop(1, dark(look.aura, 0.35));
  ctx.fillStyle = gg;
  ctx.fill();
  gloss(ctx, [CX - 5, 526], 5, 3.4, -0.4, '#ffffff', 0.8, 1.6);
  edge(ctx, gemPts, dark(look.aura, 0.55), 4, 0.5, 3, 6);

  // портупея
  if (st === 'harness' || st === 'coat') {
    for (const s of [-1, 1] as const) {
      stroke(ctx, [[CX + s * 12, SK.neckBase + 28], [CX + s * 48, 400], [CX + s * 66, 522]], dark(tr, 0.08), 12, 0.9, 2.4);
      stroke(ctx, [[CX + s * 12, SK.neckBase + 26], [CX + s * 48, 398], [CX + s * 66, 520]], light(tr, 0.34), 3.4, 0.5, 1.6);
    }
  }
  // подвязки
  if (look.stockings) {
    for (const s of [-1, 1] as const) {
      stroke(ctx, [[CX + s * 38, 596], [CX + s * 62, 622], [CX + s * 68, 654]], tr, 6, 0.75, 2.2);
    }
  }
  void rnd;
}

// ── юбка ─────────────────────────────────────────────────────
function hasSkirt(st: Appearance['outfitStyle']): boolean {
  return st === 'slit' || st === 'qipao' || st === 'robe' || st === 'plate' || st === 'coat';
}

function drawSkirt(ctx: CanvasRenderingContext2D, look: Appearance, rnd: () => number): void {
  const st = look.outfitStyle;
  if (!hasSkirt(st)) return;
  const c = cloth(look.outfit, 0.24);
  const tr = look.outfitTrim;
  const long = st === 'plate' ? 740 : st === 'coat' ? 860 : 900;

  for (const s of [-1, 1] as const) {
    const outX = st === 'plate' ? 104 : 112;
    const pts: P[] = [
      [CX + s * 46, 522],
      [CX + s * 92, 530],
      [CX + s * (outX + 16), 686],
      [CX + s * (outX + 34), long - 28],
      [CX + s * (outX + 16), long + 6],
      [CX + s * 96, long - 16],
      [CX + s * 86, 754],
      [CX + s * 76, 610],
    ];
    fabric(ctx, pts, c, 12);
    ctx.save();
    path(ctx, pts, 12);
    ctx.clip();
    for (let i = 0; i < 4; i++) {
      const t = 0.16 + i * 0.22;
      fold(
        ctx,
        [CX + s * (56 + 36 * t), 540 + i * 10],
        [CX + s * (88 + 44 * t) + (rnd() - 0.5) * 8, long - 20],
        c,
        6 + i,
        i % 2 === 1,
      );
    }
    ctx.restore();
    stroke(
      ctx,
      [[CX + s * (outX + 32), long - 36], [CX + s * (outX + 16), long + 2], [CX + s * 94, long - 12]],
      tr,
      8,
      0.9,
      2,
    );
  }

  if (st === 'plate') {
    const m = metal(mix(look.outfit, '#12151f', 0.4));
    const sv = metal(tr);
    for (const s of [-1, 1] as const) {
      const p: P[] = [[CX + s * 34, 530], [CX + s * 90, 538], [CX + s * 98, 662], [CX + s * 40, 646]];
      path(ctx, p, 12);
      const g = ctx.createLinearGradient(CX + s * 30, 526, CX + s * 100, 666);
      g.addColorStop(0, m.spec);
      g.addColorStop(0.3, m.lit);
      g.addColorStop(0.62, m.mid);
      g.addColorStop(0.85, m.deep);
      g.addColorStop(1, m.lit);
      ctx.fillStyle = g;
      ctx.fill();
      edge(ctx, p, m.line, 8, 0.42, 6, 12);
      contour(ctx, p, rgba(sv.mid, 0.46), 2, 1, 12);
      filigree(ctx, CX + s * 66, 556, 640, 22, sv.spec, m.deep, 2);
    }
  }
}

// ── плащ ─────────────────────────────────────────────────────
function drawCape(ctx: CanvasRenderingContext2D, look: Appearance, rnd: () => number): void {
  if (!look.cape) return;
  const c = cloth(mix(look.outfit, dark(look.aura, 0.55), 0.3), 0.2);
  const lining = cloth(mix(look.outfit, look.outfitTrim, 0.18), 0.3);
  const bottom = 900;
  const pts: P[] = [
    [CX - 62, SK.shoulderY - 14],
    [CX + 62, SK.shoulderY - 14],
    [CX + 96, 470],
    [CX + 122, 720],
    [CX + 104, bottom],
    [CX + 52, bottom - 44],
    [CX + 10, bottom + 14],
    [CX - 38, bottom - 40],
    [CX - 98, bottom - 6],
    [CX - 118, 720],
    [CX - 92, 470],
  ];
  fabric(ctx, pts, c, 15);
  ctx.save();
  path(ctx, pts, 15);
  ctx.clip();
  path(ctx, [[CX - 92, 470], [CX - 52, 510], [CX - 56, bottom - 24], [CX - 98, bottom - 6], [CX - 118, 720]], 12);
  const lg = ctx.createLinearGradient(CX - 120, 470, CX - 50, bottom);
  lg.addColorStop(0, lining.lit);
  lg.addColorStop(1, lining.shade);
  ctx.fillStyle = lg;
  ctx.fill();
  for (let i = 0; i < 7; i++) {
    const x = CX - 92 + i * 30;
    fold(ctx, [x, 330], [x + (rnd() - 0.5) * 46, bottom - 20], c, 8 + rnd() * 8, i % 2 === 0);
  }
  ctx.restore();
  stroke(ctx, [[CX - 60, SK.shoulderY - 8], [CX, SK.neckBase + 22], [CX + 60, SK.shoulderY - 8]], look.outfitTrim, 12, 0.95, 2.4);
}

// ── длинные волосы по фигуре ─────────────────────────────────
function drawHairFall(ctx: CanvasRenderingContext2D, look: Appearance, rnd: () => number): void {
  const H = look.hair;
  if (H === 'short' || H === 'bob' || H === 'buns') return;
  const h = hairTone(look);

  /**
   * Хвост волос: пряди расходятся у корня и сходятся к одному острию.
   * Раньше они шли параллельно и читались прямоугольной плитой.
   */
  const tail = (side: -1 | 1, root: P, len: number, wide: number, bow: number): void => {
    const n = 6;
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      const bell = Math.sin(Math.PI * (0.16 + k * 0.74));
      const w = wide * (0.4 + bell * 0.66);
      const l = len * (0.68 + bell * 0.34);
      const rx = root[0] + side * (k - 0.45) * wide * 1.5;
      const ry = root[1] - i * 4 + (rnd() - 0.5) * 10;
      // кончики стягиваются к общей точке — хвост заостряется книзу
      const tx =
        root[0] +
        side * (bow * 0.6 + (0.5 - Math.abs(k - 0.5)) * bow * 0.7) +
        (rnd() - 0.5) * 16;
      hairLock(ctx, h, rnd, [rx, ry], [tx, ry + l], w, side * (12 + k * 26), true);
    }
  };

  if (H === 'twin') {
    tail(-1, [CX - 60, 214], 372, 32, 34);
    tail(1, [CX + 60, 214], 372, 32, 34);
  } else if (H === 'ponytail') {
    tail(1, [CX + 56, 178], 486, 40, 78);
  } else if (H === 'braid') {
    const x = CX + 26;
    for (let i = 0; i < 8; i++) {
      const y = 168 + i * 54;
      const w = 40 - i * 3;
      fabric(
        ctx,
        [[x - w * 0.5, y], [x + w * 0.5, y + 6], [x + w * 0.42, y + 52], [x - w * 0.44, y + 46]],
        { spec: h.shine, lit: h.lit, mid: h.mid, shade: h.cel, deep: h.deep, line: h.deep },
        7,
        10,
      );
    }
  } else {
    tail(-1, [CX - 64, 206], 424, 34, 22);
    tail(1, [CX + 64, 206], 424, 34, 22);
    tail(-1, [CX - 28, 192], 360, 28, 8);
    tail(1, [CX + 28, 192], 360, 28, 8);
  }
}

/** прядь-веретено в пространстве фигуры */
function hairLock(
  ctx: CanvasRenderingContext2D,
  h: ReturnType<typeof hairTone>,
  rnd: () => number,
  root: P,
  tip: P,
  w: number,
  bow: number,
  blunt = false,
): void {
  const dx = tip[0] - root[0];
  const dy = tip[1] - root[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const at = (t: number, o: number): P => [
    root[0] + ux * len * t + nx * (o + bow * Math.sin(Math.PI * t)),
    root[1] + uy * len * t + ny * (o + bow * Math.sin(Math.PI * t)),
  ];
  // у пряди, растущей из-под массы волос, корень срезан ровно:
  // остриё на макушке читалось бы «пилой» над плечами
  const rA: P = blunt ? at(0, w * 0.86) : root;
  const rB: P = blunt ? at(0, -w * 0.86) : root;
  const draw = (): void => {
    ctx.beginPath();
    ctx.moveTo(rA[0], rA[1]);
    const a1 = at(0.26, w * 1.5);
    const a2 = at(0.72, w * 1.05);
    ctx.bezierCurveTo(a1[0], a1[1], a2[0], a2[1], tip[0], tip[1]);
    const b1 = at(0.72, -w * 1.05);
    const b2 = at(0.26, -w * 1.5);
    ctx.bezierCurveTo(b1[0], b1[1], b2[0], b2[1], rB[0], rB[1]);
    ctx.closePath();
  };
  draw();
  const g = ctx.createLinearGradient(root[0] - w * 2, root[1], tip[0] + w * 2, tip[1]);
  g.addColorStop(0, h.lit);
  g.addColorStop(0.36, h.mid);
  g.addColorStop(0.8, h.cel);
  g.addColorStop(1, h.deep);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  draw();
  ctx.clip();
  stroke(ctx, [at(0.1, -w * 0.3), at(0.5, -w * 0.6), at(0.9, -w * 0.2)], h.shine, w * 0.55, 0.3, 6);
  stroke(ctx, [at(0.1, w * 0.6), at(0.5, w * 0.9), at(0.9, w * 0.3)], h.deep, w * 0.6, 0.3, 6);
  for (let j = 0; j < 4; j++) {
    const u = (j + 0.5) / 4 - 0.5;
    stroke(
      ctx,
      [at(0.06, u * w), at(0.5, u * w * 1.8), at(0.92 - rnd() * 0.2, u * w * 0.9)],
      rnd() < 0.35 ? h.shine : h.deep,
      1.5,
      0.3,
      0.8,
    );
  }
  blurOn(ctx, 6);
  ctx.globalAlpha = 0.3;
  draw();
  ctx.strokeStyle = h.deep;
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.restore();
}

// ── сборка частей ────────────────────────────────────────────
export type PartName =
  | 'cape'
  | 'backHair'
  | 'armFarUpper'
  | 'armFarFore'
  | 'legFarThigh'
  | 'legFarShin'
  | 'legNearThigh'
  | 'legNearShin'
  | 'torso'
  | 'skirt'
  | 'head'
  | 'armNearUpper'
  | 'armNearFore';

export const PART_ORDER: PartName[] = [
  'cape',
  'backHair',
  'armFarUpper',
  'armFarFore',
  'legFarShin',
  'legFarThigh',
  'legNearShin',
  'legNearThigh',
  'torso',
  'skirt',
  'head',
  'armNearUpper',
  'armNearFore',
];

export interface Part {
  canvas: HTMLCanvasElement;
  pivot: P;
  joint: P;
  ox: number;
  oy: number;
  w: number;
  h: number;
}

export type Parts = Record<PartName, Part>;

interface Box {
  ox: number;
  oy: number;
  w: number;
  h: number;
  /** множитель разрешения — голове нужно больше пикселей */
  res?: number;
}

const BOX: Record<PartName, Box> = {
  cape: { ox: 140, oy: 230, w: 286, h: 700 },
  backHair: { ox: 142, oy: 0, w: 280, h: 640 },
  armFarUpper: { ox: 140, oy: 214, w: 116, h: 260 },
  armFarFore: { ox: 120, oy: 384, w: 130, h: 300 },
  legFarThigh: { ox: 168, oy: 472, w: 128, h: 400 },
  legFarShin: { ox: 168, oy: 758, w: 130, h: 340 },
  legNearThigh: { ox: 264, oy: 472, w: 128, h: 400 },
  legNearShin: { ox: 262, oy: 758, w: 130, h: 340 },
  torso: { ox: 164, oy: 138, w: 232, h: 534 },
  skirt: { ox: 144, oy: 508, w: 272, h: 420 },
  head: { ox: 182, oy: -34, w: 196, h: 300, res: 2.2 },
  armNearUpper: { ox: 304, oy: 214, w: 116, h: 260 },
  armNearFore: { ox: 310, oy: 384, w: 130, h: 300 },
};

const JOINT_OF: Record<PartName, P> = {
  cape: [CX, SK.shoulderY],
  backHair: [CX, 140],
  armFarUpper: [CX - SK.shoulderX, SK.shoulderY],
  armFarFore: [CX - SK.elbowX, SK.elbowY],
  legFarThigh: [CX - SK.hipX, SK.hipY],
  legFarShin: [CX - SK.kneeX, SK.kneeY],
  legNearThigh: [CX + SK.hipX, SK.hipY],
  legNearShin: [CX + SK.kneeX, SK.kneeY],
  torso: [CX, SK.hipY],
  skirt: [CX, SK.hipY],
  head: [CX, SK.neckBase],
  armNearUpper: [CX + SK.shoulderX, SK.shoulderY],
  armNearFore: [CX + SK.elbowX, SK.elbowY],
};

export const HAND_ANCHOR: P = [CX + SK.wristX + 14, SK.wristY + 14];

/** насколько сильно тень сцены ложится на часть: лицо светлее всего */
const LIGHT_BIAS: Record<PartName, number> = {
  cape: 1.2,
  backHair: 1.12,
  armFarUpper: 1.24,
  armFarFore: 1.24,
  legFarThigh: 1.18,
  legFarShin: 1.22,
  legNearThigh: 1,
  legNearShin: 1.06,
  torso: 1,
  skirt: 1.12,
  head: 0.46,
  armNearUpper: 0.92,
  armNearFore: 0.9,
};

interface Fade {
  at: P;
  dir: P;
  len: number;
}

function makePart(
  name: PartName,
  scale: number,
  rimColor: string,
  draw: (ctx: CanvasRenderingContext2D) => void,
  fade?: Fade,
): Part {
  const b = BOX[name];
  const res = (b.res ?? 1) * scale;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(b.w * res));
  c.height = Math.max(1, Math.round(b.h * res));
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.scale(res, res);
    ctx.translate(-b.ox, -b.oy);
    setBlurScale(res);
    draw(ctx);
    blurOff(ctx);
    setBlurScale(1);
  }
  if (fade) fadeJoint(c, res, b.ox, b.oy, fade.at, fade.dir, fade.len);

  // единый свет сцены: ключ сверху-слева, тень уходит вниз-вправо
  const L = NIGHT;
  const k = LIGHT_BIAS[name];
  bodyGradient(
    c,
    res,
    b.ox,
    b.oy,
    [BW * 0.06, 0],
    [BW * 1.02, BH * 0.74],
    [
      [0, rgba(L.shade, 0)],
      [0.38, rgba(L.shade, L.depth * 0.16 * k)],
      [1, rgba(L.shade, L.depth * 0.66 * k)],
    ],
  );
  // ноги тонут в темноте, лицо остаётся самым светлым
  bodyGradient(
    c,
    res,
    b.ox,
    b.oy,
    [0, SK.waistY - 20],
    [0, SK.ground + 30],
    [
      [0, rgba(L.shade, 0)],
      [0.5, rgba(L.shade, L.sink * 0.28)],
      [1, rgba('#05070f', L.sink)],
    ],
  );

  // контровые: холодный по верхней кромке, тёплый из глубины кадра
  rimPass(c, L.key, 2.2 * res, 2.4 * res, 0.4, 1.2 * res);
  rimPass(c, L.back, -2.6 * res, -1.6 * res, 0.36, 2.2 * res);
  rimPass(c, rimColor, -2.6 * res, 1.6 * res, 0.24, 2.4 * res);
  const j = JOINT_OF[name];
  return {
    canvas: c,
    pivot: [(j[0] - b.ox) * res, (j[1] - b.oy) * res],
    joint: j,
    ox: b.ox,
    oy: b.oy,
    w: b.w,
    h: b.h,
  };
}

function dirTo(a: P, b: P): P {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
}

/**
 * Приводит образ к палитре референса: тёмная броня с оттенком
 * собственного цвета, серебряная нить отделки. Стихия остаётся
 * в ауре и в свечении по кромке, а не в цвете ткани — иначе
 * фигура спорит с ночным фоном и выглядит игрушечной.
 */
function refine(look: Appearance): Appearance {
  return {
    ...look,
    outfit: mix(look.outfit, '#0a0d18', 0.7),
    outfitTrim: dark(mix(look.outfitTrim, '#c6d1e6', 0.55), 0.14),
    stockings: look.stockings ? mix(look.stockings, '#0b0e1a', 0.62) : null,
  };
}

export function buildParts(raw: Appearance, id: string, scale = 1): Parts {
  const look = refine(raw);
  const rim = mix(look.aura, '#ffffff', 0.34);
  const st = look.outfitStyle;
  const sleeved = st === 'coat' || st === 'robe' || st === 'qipao';
  const gloved = st === 'leotard' || st === 'harness' || st === 'plate' || st === 'sarashi';
  const c = cloth(look.outfit, sleeved ? 0.26 : 0.5);
  const sock = look.stockings ? cloth(look.stockings, 0.44) : null;

  const armUpper = (side: 1 | -1) => (ctx: CanvasRenderingContext2D): void => {
    const s: Seg = {
      a: [CX + side * SK.shoulderX, SK.shoulderY],
      b: [CX + side * SK.elbowX, SK.elbowY],
      widths: [30, 27, 24, 22, 20],
      bow: side * 5,
      overA: side > 0 ? 8 : 20,
      overB: 26,
    };
    drawLimb(ctx, look, s, side, { marks: side > 0 ? ['shoulder'] : [] });
    if (st === 'plate') {
      const m = metal(mix(look.outfit, '#12151f', 0.4));
      const sv = metal(look.outfitTrim);
      const sx = CX + side * SK.shoulderX;
      const p: P[] = [
        [sx - side * 34, SK.shoulderY - 18],
        [sx + side * 4, SK.shoulderY - 34],
        [sx + side * 38, SK.shoulderY - 6],
        [sx + side * 41, SK.shoulderY + 34],
        [sx - side * 2, SK.shoulderY + 48],
        [sx - side * 34, SK.shoulderY + 28],
      ];
      path(ctx, p, 14);
      const g = ctx.createLinearGradient(sx - 44, SK.shoulderY - 36, sx + 44, SK.shoulderY + 50);
      g.addColorStop(0, m.spec);
      g.addColorStop(0.28, m.lit);
      g.addColorStop(0.58, m.mid);
      g.addColorStop(0.82, m.deep);
      g.addColorStop(1, m.lit);
      ctx.fillStyle = g;
      ctx.fill();
      edge(ctx, p, m.line, 9, 0.42, 6, 14);
      contour(ctx, p, rgba(sv.mid, 0.5), 2.2, 1, 14);
      contour(ctx, p, rgba(sv.spec, 0.4), 0.9, 1, 14);
      // ламели наплечника
      for (let i = 0; i < 2; i++) {
        const y = SK.shoulderY + 6 + i * 18;
        const lame: P[] = [
          [sx - side * 33, y],
          [sx + side * 4, y - 8],
          [sx + side * 39, y + 2],
          [sx + side * 40, y + 16],
          [sx + side * 2, y + 24],
          [sx - side * 32, y + 16],
        ];
        path(ctx, lame, 12);
        const lg = ctx.createLinearGradient(sx - 40, y - 10, sx + 42, y + 24);
        lg.addColorStop(0, m.lit);
        lg.addColorStop(0.4, m.mid);
        lg.addColorStop(0.78, m.deep);
        lg.addColorStop(1, m.lit);
        ctx.fillStyle = lg;
        ctx.fill();
        edge(ctx, lame, m.line, 6, 0.42, 4, 12);
        stroke(ctx, [[sx - side * 28, y + 1], [sx + side * 34, y + 6]], sv.spec, 2.2, 0.55, 1.4);
      }
    } else if (sleeved) {
      drawSleeve(ctx, subSeg(s, -0.1, 1.06, 3), c, side, look.outfitTrim);
    }
  };

  const armFore = (side: 1 | -1) => (ctx: CanvasRenderingContext2D): void => {
    const s: Seg = {
      a: [CX + side * SK.elbowX, SK.elbowY],
      b: [CX + side * SK.wristX, SK.wristY],
      widths: [22, 20, 17, 15, 13],
      bow: side * 3,
      overA: 22,
      overB: 6,
    };
    const g = drawLimb(ctx, look, s, side, { marks: ['elbow', 'wristBone'], occA: true });
    drawHand(ctx, look, g, side);
    if (gloved) {
      drawSleeve(ctx, subSeg(s, 0.4, 0.86, 2.6), st === 'plate' ? cloth(mix(look.outfit, '#161a26', 0.4), 0.55) : c, side, look.outfitTrim);
    } else if (sleeved) {
      drawSleeve(ctx, subSeg(s, -0.12, 0.68, 5), c, side, look.outfitTrim);
    }
  };

  const legThigh = (side: 1 | -1) => (ctx: CanvasRenderingContext2D): void => {
    const s: Seg = {
      a: [CX + side * SK.hipX, SK.hipY],
      b: [CX + side * SK.kneeX, SK.kneeY],
      widths: [56 + look.figure * 8, 52 + look.figure * 6, 46, 39, 34],
      bow: side * 8,
      overA: 46,
      overB: 22,
    };
    const g = drawLimb(ctx, look, s, side, { marks: ['thigh'] });
    occlude(ctx, g, 'b', skin(look).deep, 22);
    if (sock) drawSleeve(ctx, subSeg(s, 0.26, 1.08, 2.6), sock, side, look.outfitTrim, true);
  };

  const legShin = (side: 1 | -1) => (ctx: CanvasRenderingContext2D): void => {
    const s: Seg = {
      a: [CX + side * SK.kneeX, SK.kneeY],
      b: [CX + side * SK.ankleX, SK.ankleY],
      widths: [34, 35, 30, 22, 15],
      bow: side * -6,
      overA: 24,
      overB: 8,
    };
    drawLimb(ctx, look, s, side, { marks: ['knee', 'calf', 'ankle'], occA: true });
    if (sock) drawSleeve(ctx, subSeg(s, -0.1, 1.06, 2.4), sock, side, undefined, true);
    drawFoot(ctx, [CX + side * SK.ankleX, SK.ankleY + 6], side, c, look.outfitTrim);
  };

  return {
    cape: makePart('cape', scale, rim, (ctx) => drawCape(ctx, look, seeded(`${id}cape`))),
    backHair: makePart('backHair', scale, rim, (ctx) => {
      drawHairFall(ctx, look, seeded(`${id}fall`));
      ctx.save();
      headTransform(ctx);
      drawHairBack(ctx, look, seeded(`${id}hb`));
      ctx.restore();
    }),
    armFarUpper: makePart('armFarUpper', scale, rim, armUpper(-1), {
      at: [CX - SK.shoulderX, SK.shoulderY] as P,
      dir: dirTo([CX - SK.shoulderX, SK.shoulderY] as P, [CX - SK.elbowX, SK.elbowY] as P),
      len: 24,
    }),
    armFarFore: makePart('armFarFore', scale, rim, armFore(-1), {
      at: [CX - SK.elbowX, SK.elbowY] as P,
      dir: dirTo([CX - SK.elbowX, SK.elbowY] as P, [CX - SK.wristX, SK.wristY] as P),
      len: 18,
    }),
    legFarThigh: makePart('legFarThigh', scale, rim, legThigh(-1), {
      at: [CX - SK.hipX, SK.hipY] as P,
      dir: dirTo([CX - SK.hipX, SK.hipY] as P, [CX - SK.kneeX, SK.kneeY] as P),
      len: 46,
    }),
    legFarShin: makePart('legFarShin', scale, rim, legShin(-1), {
      at: [CX - SK.kneeX, SK.kneeY] as P,
      dir: dirTo([CX - SK.kneeX, SK.kneeY] as P, [CX - SK.ankleX, SK.ankleY] as P),
      len: 30,
    }),
    legNearThigh: makePart('legNearThigh', scale, rim, legThigh(1), {
      at: [CX + SK.hipX, SK.hipY] as P,
      dir: dirTo([CX + SK.hipX, SK.hipY] as P, [CX + SK.kneeX, SK.kneeY] as P),
      len: 46,
    }),
    legNearShin: makePart('legNearShin', scale, rim, legShin(1), {
      at: [CX + SK.kneeX, SK.kneeY] as P,
      dir: dirTo([CX + SK.kneeX, SK.kneeY] as P, [CX + SK.ankleX, SK.ankleY] as P),
      len: 30,
    }),
    torso: makePart('torso', scale, rim, (ctx) => {
      drawTorso(ctx, look);
      drawOutfit(ctx, look, seeded(`${id}fit`));
    }),
    skirt: makePart('skirt', scale, rim, (ctx) => drawSkirt(ctx, look, seeded(`${id}skirt`))),
    head: makePart('head', scale, rim, (ctx) => {
      ctx.save();
      headTransform(ctx);
      drawFaceBase(ctx, look);
      drawEars(ctx, look);
      drawEyes(ctx, look, Math.max(0.4, 1 - look.mood) * 0.24);
      drawBrows(ctx, look);
      drawNose(ctx, look);
      drawMouth(ctx, look, look.mood);
      drawHairFront(ctx, look, seeded(`${id}hf`));
      drawAccessory(ctx, look);
      ctx.restore();
    }),
    armNearUpper: makePart('armNearUpper', scale, rim, armUpper(1), {
      at: [CX + SK.shoulderX, SK.shoulderY] as P,
      dir: dirTo([CX + SK.shoulderX, SK.shoulderY] as P, [CX + SK.elbowX, SK.elbowY] as P),
      len: 24,
    }),
    armNearFore: makePart('armNearFore', scale, rim, armFore(1), {
      at: [CX + SK.elbowX, SK.elbowY] as P,
      dir: dirTo([CX + SK.elbowX, SK.elbowY] as P, [CX + SK.wristX, SK.wristY] as P),
      len: 18,
    }),
  };
}

export { skin, cloth, metal };
