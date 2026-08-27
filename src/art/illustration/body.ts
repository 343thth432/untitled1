import type { Appearance } from '../../game/types';
import {
  dark,
  hatch,
  ink,
  light,
  linear,
  mix,
  rgba,
  seeded,
  shape,
  shapeInk,
  spline,
  taper,
  type P,
} from './paint';
import {
  drawAccessory,
  drawBackHair,
  drawFace,
  drawFrontHair,
  drawHead,
  hairPack,
  skinTones,
} from './portrait';

/** Пространство фигуры в полный рост: 560×1120, ~6.4 головы */
export const BW = 560;
export const BH = 1120;
const CX = 280;

/** Скелет фигуры */
export const SK = {
  cx: CX,
  chin: 280,
  neckBase: 318,
  shoulderY: 334,
  shoulderX: 61,
  elbowY: 502,
  elbowX: 86,
  wristY: 642,
  wristX: 94,
  bustY: 428,
  waistY: 534,
  hipY: 616,
  hipX: 36,
  kneeY: 828,
  kneeX: 56,
  ankleY: 1026,
  ankleX: 58,
  ground: 1072,
};

/** Голова из портретного пространства (240,374 — подбородок) */
const HEAD_SCALE = 0.68;

export function headTransform(ctx: CanvasRenderingContext2D): void {
  ctx.translate(CX, SK.chin);
  ctx.scale(HEAD_SCALE, HEAD_SCALE);
  ctx.translate(-240, -374);
}

// ── геометрия сегмента ───────────────────────────────────────
// Сегмент рисуется с перехлёстом и обводкой только по бокам:
// стык прикрывается соседней частью, «шва куклы» не видно.

interface Seg {
  a: P;
  b: P;
  /** полуширины в равных долях длины */
  widths: number[];
  /** боковой изгиб в середине */
  bow?: number;
  /** перехлёст за сустав */
  overA?: number;
  overB?: number;
}

interface Geom {
  mid: P[];
  left: P[];
  right: P[];
  capA: P[];
  capB: P[];
  u: P;
  n: P;
  w: number[];
}

function wAt(widths: number[], t: number): number {
  const k = Math.max(0, Math.min(1, t)) * (widths.length - 1);
  const i = Math.floor(k);
  const j = Math.min(widths.length - 1, i + 1);
  const f = k - i;
  return widths[i] * (1 - f) + widths[j] * f;
}

function segGeom(s: Seg, steps = 26): Geom {
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
    for (let k = 0; k <= 9; k++) {
      const th = (k / 9) * Math.PI;
      const c = Math.cos(th) * dir;
      const si = Math.sin(th) * dir;
      out.push([p[0] + (n[0] * c + u[0] * si) * ww, p[1] + (n[1] * c + u[1] * si) * ww]);
    }
    return out;
  };
  return {
    mid,
    left,
    right,
    capA: arc(mid[0], w[0], -1),
    capB: arc(mid[steps], w[steps], 1).reverse(),
    u,
    n,
    w,
  };
}

function poly(ctx: CanvasRenderingContext2D, pts: P[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

function outline(g: Geom): P[] {
  return [...g.left, ...g.capB.slice().reverse(), ...g.right.slice().reverse(), ...g.capA.slice().reverse()];
}

/** смещённая внутрь кромка: k доля полуширины */
function inset(g: Geom, side: 1 | -1, k: number): P[] {
  const src = side > 0 ? g.right : g.left;
  return src.map((p, i) => [p[0] - g.n[0] * side * g.w[i] * k, p[1] - g.n[1] * side * g.w[i] * k] as P);
}

function band(g: Geom, side: 1 | -1, kFrom: number, kTo: number, i0 = 0, i1 = -1): P[] {
  const a = inset(g, side, kFrom);
  const b = inset(g, side, kTo);
  const hi = i1 < 0 ? a.length - 1 : i1;
  return [...a.slice(i0, hi + 1), ...b.slice(i0, hi + 1).reverse()];
}

function edgeInk(
  ctx: CanvasRenderingContext2D,
  g: Geom,
  color: string,
  wThin: number,
  wThick: number,
  caps: { a?: boolean; b?: boolean } = {},
): void {
  taper(ctx, g.left, [wThin * 0.7, wThin, wThin * 0.9], color, 2);
  taper(ctx, g.right, [wThick * 0.8, wThick, wThick * 0.7], color, 2);
  if (caps.a) taper(ctx, g.capA, [wThin, wThin * 1.1, wThick * 0.9], color, 2);
  if (caps.b) taper(ctx, g.capB, [wThick * 0.9, wThin * 1.1, wThin], color, 2);
}

// ── кожа сегмента ────────────────────────────────────────────
interface LimbOpts {
  stocking?: boolean;
  glove?: boolean;
  capA?: boolean;
  capB?: boolean;
  /** доля длины, где сустав-складка */
  crease?: number;
  /** анатомические отметки */
  marks?: Mark[];
}

type Mark = 'knee' | 'ankle' | 'elbow' | 'shoulder' | 'calf' | 'thigh';

interface Spot {
  p: P;
  w: number;
  u: P;
  n: P;
}

function atSeg(g: Geom, t: number): Spot {
  const i = Math.max(0, Math.min(g.mid.length - 1, Math.round(t * (g.mid.length - 1))));
  return { p: g.mid[i], w: g.w[i], u: g.u, n: g.n };
}

function blush(ctx: CanvasRenderingContext2D, at: P, r: number, a = 0.2): void {
  const gr = radialSoft(ctx, at, r, a);
  ctx.fillStyle = gr;
  ctx.fillRect(at[0] - r, at[1] - r, r * 2, r * 2);
}

function radialSoft(ctx: CanvasRenderingContext2D, at: P, r: number, a: number): CanvasGradient {
  const g = ctx.createRadialGradient(at[0], at[1], 1, at[0], at[1], r);
  g.addColorStop(0, `rgba(255,124,150,${a})`);
  g.addColorStop(1, 'rgba(255,124,150,0)');
  return g;
}

/** анатомические штрихи поверх кожи */
function drawMarks(ctx: CanvasRenderingContext2D, look: Appearance, g: Geom, marks: Mark[], side: 1 | -1): void {
  const t = skinTones(look);
  ctx.save();
  poly(ctx, outline(g));
  ctx.clip();
  for (const m of marks) {
    if (m === 'knee') {
      const s = atSeg(g, 0.1);
      blush(ctx, s.p, s.w * 1.5, 0.16);
      taper(
        ctx,
        [
          [s.p[0] - s.n[0] * s.w * 0.5, s.p[1] - s.n[1] * s.w * 0.5 + 6],
          [s.p[0] + s.u[0] * s.w * 0.5, s.p[1] + s.u[1] * s.w * 0.5 + 2],
          [s.p[0] + s.n[0] * s.w * 0.55, s.p[1] + s.n[1] * s.w * 0.55 + 6],
        ],
        [0, 2.6, 0],
        rgba(t.line, 0.5),
        8,
      );
      taper(
        ctx,
        [
          [s.p[0] - s.n[0] * s.w * 0.3, s.p[1] - s.n[1] * s.w * 0.3 - 12],
          [s.p[0] - s.n[0] * s.w * 0.16, s.p[1] - s.n[1] * s.w * 0.16 + 4],
        ],
        [0, 2],
        t.lineSoft,
        6,
      );
    } else if (m === 'ankle') {
      const s = atSeg(g, 0.9);
      taper(
        ctx,
        [
          [s.p[0] + s.n[0] * s.w * 0.7 * side, s.p[1] + s.n[1] * s.w * 0.7 * side - 6],
          [s.p[0] + s.n[0] * s.w * 0.5 * side, s.p[1] + s.n[1] * s.w * 0.5 * side + 8],
        ],
        [0, 2.4],
        rgba(t.line, 0.55),
        6,
      );
    } else if (m === 'calf') {
      const a = atSeg(g, 0.16);
      const b = atSeg(g, 0.5);
      taper(
        ctx,
        [
          [a.p[0] - a.n[0] * a.w * 0.42, a.p[1] - a.n[1] * a.w * 0.42],
          [b.p[0] - b.n[0] * b.w * 0.5, b.p[1] - b.n[1] * b.w * 0.5],
        ],
        [3.4, 0],
        rgba('#ffffff', 0.3),
        8,
      );
    } else if (m === 'thigh') {
      const a = atSeg(g, 0.2);
      const b = atSeg(g, 0.72);
      taper(
        ctx,
        [
          [a.p[0] + a.n[0] * a.w * 0.72 * side, a.p[1] + a.n[1] * a.w * 0.72 * side],
          [b.p[0] + b.n[0] * b.w * 0.62 * side, b.p[1] + b.n[1] * b.w * 0.62 * side],
        ],
        [0, 4.6],
        rgba(t.deep, 0.35),
        8,
      );
    } else if (m === 'elbow') {
      const s = atSeg(g, 0.12);
      blush(ctx, s.p, s.w * 1.4, 0.13);
    } else if (m === 'shoulder') {
      const s = atSeg(g, 0.1);
      taper(
        ctx,
        [
          [s.p[0] - s.n[0] * s.w * 0.6, s.p[1] - s.n[1] * s.w * 0.6 + 10],
          [s.p[0] + s.u[0] * s.w * 1.3, s.p[1] + s.u[1] * s.w * 1.3 + 4],
          [s.p[0] + s.n[0] * s.w * 0.65, s.p[1] + s.n[1] * s.w * 0.65 + 8],
        ],
        [0, 2.4, 0],
        t.lineSoft,
        10,
      );
    }
  }
  ctx.restore();
}

function shadeSkin(ctx: CanvasRenderingContext2D, look: Appearance, g: Geom, side: 1 | -1): void {
  const t = skinTones(look);
  ctx.save();
  poly(ctx, outline(g));
  ctx.clip();

  poly(ctx, band(g, side, 0, 0.62));
  ctx.fillStyle = rgba(t.cel, 0.95);
  ctx.fill();

  poly(ctx, band(g, side, 0, 0.2));
  ctx.fillStyle = rgba(t.deep, 0.4);
  ctx.fill();

  const hp = hatch(ctx, t.line, 0.055, 9, 1.1);
  if (hp) {
    poly(ctx, band(g, side, 0.5, 0.78));
    ctx.fillStyle = hp;
    ctx.fill();
  }

  poly(ctx, band(g, -side as 1 | -1, 0, 0.13));
  ctx.fillStyle = rgba(t.bounce, 0.8);
  ctx.fill();

  // блик вдоль освещённой стороны
  const n = g.mid.length - 1;
  const i0 = Math.round(n * 0.18);
  const i1 = Math.round(n * 0.6);
  poly(ctx, band(g, -side as 1 | -1, 0.2, 0.42, i0, i1));
  ctx.fillStyle = rgba('#ffffff', 0.22);
  ctx.fill();
  ctx.restore();
}

function drawLimb(
  ctx: CanvasRenderingContext2D,
  look: Appearance,
  s: Seg,
  side: 1 | -1,
  o: LimbOpts = {},
): Geom {
  const t = skinTones(look);
  const g = segGeom(s);
  poly(ctx, outline(g));
  ctx.fillStyle = linear(ctx, s.a[0] - 50, s.a[1], s.b[0] + 50, s.b[1], [
    [0, light(t.base, 0.13)],
    [0.45, t.base],
    [1, mix(t.base, t.cel, 0.7)],
  ]);
  ctx.fill();
  shadeSkin(ctx, look, g, side);
  edgeInk(ctx, g, t.line, 1.5, 3.4, { a: o.capA, b: o.capB });

  if (o.marks) drawMarks(ctx, look, g, o.marks, side);

  if (o.crease !== undefined) {
    const i = Math.round((g.mid.length - 1) * o.crease);
    const p = g.mid[i];
    const w = g.w[i];
    taper(
      ctx,
      [
        [p[0] - g.n[0] * w * 0.55 + g.u[0] * 4, p[1] - g.n[1] * w * 0.55 + g.u[1] * 4],
        [p[0] + g.u[0] * w * 0.2, p[1] + g.u[1] * w * 0.2],
        [p[0] + g.n[0] * w * 0.6, p[1] + g.n[1] * w * 0.6],
      ],
      [0, 2.2, 0],
      t.lineSoft,
      6,
    );
  }
  return g;
}

/** отрезок сегмента для чулка/перчатки */
function subSeg(s: Seg, t0: number, t1: number, grow = 0): Seg {
  const at = (t: number): P => {
    const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]) || 1;
    const u: P = [(s.b[0] - s.a[0]) / len, (s.b[1] - s.a[1]) / len];
    const n: P = [-u[1], u[0]];
    const bo = (s.bow ?? 0) * Math.sin(Math.PI * Math.max(0, Math.min(1, t)));
    return [s.a[0] + u[0] * len * t + n[0] * bo, s.a[1] + u[1] * len * t + n[1] * bo];
  };
  const stops = 5;
  const widths: number[] = [];
  for (let i = 0; i < stops; i++) widths.push(wAt(s.widths, t0 + (t1 - t0) * (i / (stops - 1))) + grow);
  return { a: at(t0), b: at(t1), widths, bow: (s.bow ?? 0) * 0.35 };
}

function drawCloth(
  ctx: CanvasRenderingContext2D,
  s: Seg,
  color: string,
  side: 1 | -1,
  opts: { capA?: boolean; capB?: boolean; trim?: string; lace?: boolean } = {},
): Geom {
  const g = segGeom(s);
  poly(ctx, outline(g));
  ctx.fillStyle = linear(ctx, s.a[0] - 40, s.a[1], s.b[0] + 40, s.b[1], [
    [0, light(color, 0.34)],
    [0.42, color],
    [1, dark(color, 0.34)],
  ]);
  ctx.fill();

  ctx.save();
  poly(ctx, outline(g));
  ctx.clip();
  poly(ctx, band(g, side, 0, 0.5));
  ctx.fillStyle = rgba(dark(color, 0.3), 0.75);
  ctx.fill();
  poly(ctx, band(g, -side as 1 | -1, 0.16, 0.34));
  ctx.fillStyle = rgba('#ffffff', 0.3);
  ctx.fill();
  ctx.restore();

  edgeInk(ctx, g, ink(color, 0.5), 1.3, 3, { a: opts.capA, b: opts.capB });
  if (opts.trim) {
    taper(ctx, [g.left[0], g.mid[0], g.right[0]], [5, 6, 5], opts.trim, 5);
    if (opts.lace) {
      for (let i = 0; i <= 6; i++) {
        const p = g.mid[0];
        const q: P = [
          p[0] - g.n[0] * g.w[0] + g.n[0] * ((2 * g.w[0] * i) / 6),
          p[1] - g.n[1] * g.w[0] + g.n[1] * ((2 * g.w[0] * i) / 6),
        ];
        ctx.beginPath();
        ctx.arc(q[0] + g.u[0] * 3, q[1] + g.u[1] * 3, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = light(opts.trim, 0.45);
        ctx.fill();
      }
    }
  }
  return g;
}

// ── кисть ────────────────────────────────────────────────────
function drawHand(ctx: CanvasRenderingContext2D, look: Appearance, g: Geom, side: 1 | -1): void {
  const t = skinTones(look);
  const w = g.mid[g.mid.length - 1];
  const u = g.u;
  const n = g.n;
  const s = 1;
  const at = (fu: number, fn: number): P => [w[0] + u[0] * fu + n[0] * fn * side, w[1] + u[1] * fu + n[1] * fn * side];

  // ладонь
  const palm: P[] = [
    at(-7, -17),
    at(11, -20),
    at(34, -14),
    at(46, 2),
    at(39, 19),
    at(14, 24),
    at(-7, 17),
  ];
  shape(ctx, palm, 10);
  ctx.fillStyle = linear(ctx, at(-8, -18)[0], at(-8, -18)[1], at(40, 18)[0], at(40, 18)[1], [
    [0, light(t.base, 0.1)],
    [1, mix(t.base, t.cel, 0.8)],
  ]);
  ctx.fill();
  ctx.save();
  shape(ctx, palm, 10);
  ctx.clip();
  shape(ctx, [at(6, 4), at(34, 6), at(40, 18), at(4, 20)], 8);
  ctx.fillStyle = rgba(t.cel, 0.85);
  ctx.fill();
  ctx.restore();
  shapeInk(ctx, palm, t.line, 1.2, 2.8);

  // большой палец
  const thumb: P[] = [at(2, -16), at(20, -28), at(32, -23), at(23, -9)];
  shape(ctx, thumb, 10);
  ctx.fillStyle = t.base;
  ctx.fill();
  shapeInk(ctx, thumb, t.line, 1, 2.4);

  // складки пальцев
  for (let i = 0; i < 3; i++) {
    taper(
      ctx,
      [at(23 + i * 7, -7 + i * 9), at(39 + i * 3, -2 + i * 9)],
      [0, 1.8 * s],
      t.lineSoft,
      4,
    );
  }
}

// ── стопа на каблуке ─────────────────────────────────────────
function drawFoot(ctx: CanvasRenderingContext2D, look: Appearance, at: P, side: 1 | -1): void {
  const c = look.outfit;
  const tr = look.outfitTrim;
  const x = at[0];
  const y = at[1];
  const f = side;
  const boot: P[] = [
    [x - 18 * f, y - 22],
    [x + 18 * f, y - 20],
    [x + 23 * f, y + 12],
    [x + 46 * f, y + 32],
    [x + 50 * f, y + 46],
    [x + 7 * f, y + 48],
    [x - 19 * f, y + 37],
  ];
  shape(ctx, boot, 10);
  ctx.fillStyle = linear(ctx, x - 30 * f, y - 22, x + 44 * f, y + 44, [
    [0, light(c, 0.3)],
    [0.4, c],
    [1, dark(c, 0.36)],
  ]);
  ctx.fill();
  ctx.save();
  shape(ctx, boot, 10);
  ctx.clip();
  shape(ctx, [[x + 2 * f, y - 20], [x + 20 * f, y - 16], [x + 44 * f, y + 44], [x + 10 * f, y + 44]], 8);
  ctx.fillStyle = rgba(dark(c, 0.3), 0.7);
  ctx.fill();
  shape(ctx, [[x - 14 * f, y - 12], [x - 6 * f, y - 14], [x - 4 * f, y + 26], [x - 13 * f, y + 24]], 8);
  ctx.fillStyle = rgba('#ffffff', 0.26);
  ctx.fill();
  ctx.restore();
  shapeInk(ctx, boot, ink(c, 0.5), 1.3, 3.2);

  // каблук-шпилька
  const heel: P[] = [
    [x - 16 * f, y + 30],
    [x - 4 * f, y + 32],
    [x - 2 * f, y + 62],
    [x - 12 * f, y + 62],
  ];
  shape(ctx, heel, 8);
  ctx.fillStyle = linear(ctx, x - 16 * f, y + 32, x + 2 * f, y + 74, [
    [0, light(tr, 0.4)],
    [1, dark(tr, 0.3)],
  ]);
  ctx.fill();
  shapeInk(ctx, heel, ink(tr, 0.5), 1, 2.2);

  // ремешок на щиколотке
  taper(ctx, [[x - 17 * f, y - 10], [x, y - 14], [x + 18 * f, y - 8]], [5, 6, 5], tr, 6);
  ctx.beginPath();
  ctx.arc(x + 6 * f, y - 12, 3.4, 0, Math.PI * 2);
  ctx.fillStyle = light(tr, 0.5);
  ctx.fill();
}

// ── торс ─────────────────────────────────────────────────────
function torsoOutline(look: Appearance): P[] {
  const f = look.figure;
  const hip = 74 + f * 12;
  const waist = 44 + f * 5;
  const rib = 58 + f * 5;
  return [
    [CX - 29, SK.chin - 8],
    [CX - 32, SK.neckBase - 6],
    [CX - 46, SK.neckBase + 6],
    [CX - SK.shoulderX - 12, SK.shoulderY + 2],
    [CX - 76, SK.shoulderY + 34],
    [CX - rib, 424],
    [CX - waist - 6, 490],
    [CX - waist, SK.waistY],
    [CX - 56, 570],
    [CX - hip, SK.hipY + 6],
    [CX - hip + 4, 668],
    [CX - 46, 700],
    [CX, 712],
    [CX + 46, 700],
    [CX + hip - 4, 668],
    [CX + hip, SK.hipY + 6],
    [CX + 56, 570],
    [CX + waist, SK.waistY],
    [CX + waist + 6, 490],
    [CX + rib, 424],
    [CX + 76, SK.shoulderY + 34],
    [CX + SK.shoulderX + 12, SK.shoulderY + 2],
    [CX + 46, SK.neckBase + 6],
    [CX + 32, SK.neckBase - 6],
    [CX + 29, SK.chin - 8],
  ];
}

function drawTorso(ctx: CanvasRenderingContext2D, look: Appearance): void {
  const t = skinTones(look);
  const f = look.figure;
  const pts = torsoOutline(look);

  shape(ctx, pts, 12);
  ctx.fillStyle = linear(ctx, CX - 90, 300, CX + 90, 700, [
    [0, light(t.base, 0.15)],
    [0.4, t.base],
    [1, mix(t.base, t.cel, 0.8)],
  ]);
  ctx.fill();

  ctx.save();
  shape(ctx, pts, 12);
  ctx.clip();

  // общая тень справа
  shape(
    ctx,
    [
      [CX + 16, 250],
      [CX + 74, 330],
      [CX + 50, 440],
      [CX + 34, 520],
      [CX + 52, 600],
      [CX + 78, 700],
      [CX + 10, 716],
      [CX + 22, 560],
      [CX + 34, 430],
    ],
    12,
  );
  ctx.fillStyle = rgba(t.cel, 0.9);
  ctx.fill();

  // тень от подбородка на шею
  shape(
    ctx,
    [[CX - 28, SK.chin - 10], [CX + 28, SK.chin - 10], [CX + 25, SK.chin + 12], [CX, SK.chin + 20], [CX - 25, SK.chin + 10]],
    10,
  );
  ctx.fillStyle = rgba(t.cel, 0.72);
  ctx.fill();

  // отражённый свет слева
  shape(ctx, [[CX - 70, 350], [CX - 58, 340], [CX - 50, 460], [CX - 44, 540], [CX - 62, 620], [CX - 66, 500]], 10);
  ctx.fillStyle = rgba(t.bounce, 0.8);
  ctx.fill();

  const hp = hatch(ctx, t.line, 0.05, 9, 1.1);
  if (hp) {
    shape(ctx, [[CX + 30, 470], [CX + 52, 470], [CX + 66, 640], [CX + 34, 626]], 10);
    ctx.fillStyle = hp;
    ctx.fill();
  }
  ctx.restore();

  shapeInk(ctx, pts, t.line, 1.6, 4.2);

  // ── грудь ────────────────────────────────────────────────
  const br = 34 + f * 26;
  const bx = 22 + f * 10;
  for (const s of [-1, 1] as const) {
    const cx = CX + s * bx;
    const cy = SK.bustY - 6;
    const b: P[] = [
      [cx - s * 16, cy - br * 0.92],
      [cx + s * br * 0.72, cy - br * 0.66],
      [cx + s * br * 0.98, cy + br * 0.16],
      [cx + s * br * 0.6, cy + br * 0.82],
      [cx - s * br * 0.12, cy + br * 0.9],
      [cx - s * br * 0.5, cy + br * 0.4],
    ];
    shape(ctx, b, 12);
    ctx.fillStyle = linear(ctx, cx - s * br, cy - br, cx + s * br, cy + br, [
      [0, light(t.base, 0.2)],
      [0.5, t.base],
      [1, mix(t.base, t.cel, 0.9)],
    ]);
    ctx.fill();
    ctx.save();
    shape(ctx, b, 12);
    ctx.clip();
    // подгрудная тень
    shape(ctx, [
      [cx - s * br * 0.5, cy + br * 0.3],
      [cx + s * br * 0.7, cy + br * 0.24],
      [cx + s * br * 0.62, cy + br * 0.9],
      [cx - s * br * 0.2, cy + br * 0.95],
    ], 10);
    ctx.fillStyle = rgba(t.deep, 0.55);
    ctx.fill();
    // блик
    ctx.beginPath();
    ctx.ellipse(cx + s * br * 0.1, cy - br * 0.34, br * 0.3, br * 0.19, s * -0.5, 0, Math.PI * 2);
    ctx.fillStyle = rgba('#ffffff', 0.3);
    ctx.fill();
    ctx.restore();
    shapeInk(ctx, b, rgba(t.line, 0.85), 1.1, 3);
  }
  // ложбинка
  taper(
    ctx,
    [[CX, SK.bustY - br * 0.6], [CX - 2, SK.bustY], [CX + 1, SK.bustY + br * 0.5]],
    [0, 4.6, 1.4],
    rgba(t.line, 0.75),
    8,
  );

  // ── анатомия ─────────────────────────────────────────────
  // ключицы — одна мягкая дуга на сторону
  taper(ctx, [[CX - 50, SK.neckBase + 16], [CX - 22, SK.neckBase + 28], [CX - 5, SK.neckBase + 22]], [0, 2.6, 0], rgba(t.line, 0.34), 10);
  taper(ctx, [[CX + 50, SK.neckBase + 16], [CX + 22, SK.neckBase + 28], [CX + 5, SK.neckBase + 22]], [0, 2.6, 0], rgba(t.line, 0.34), 10);
  // средняя линия живота
  taper(ctx, [[CX + 1, 486], [CX - 1, 536], [CX + 2, 566]], [0, 2.6, 0], rgba(t.line, 0.55), 8);
  // пупок
  taper(ctx, [[CX + 2, 552], [CX, 566]], [3, 0], rgba(t.line, 0.7), 4);
  // косые мышцы / линии таза
  taper(ctx, [[CX - 52, 596], [CX - 26, 646], [CX - 12, 676]], [0, 3, 0], t.lineSoft, 8);
  taper(ctx, [[CX + 52, 596], [CX + 26, 646], [CX + 12, 676]], [0, 3, 0], t.lineSoft, 8);
  // складка бедра
  taper(ctx, [[CX - 62, 668], [CX - 30, 690]], [0, 2.4], t.lineSoft, 6);
  taper(ctx, [[CX + 62, 668], [CX + 30, 690]], [0, 2.4], t.lineSoft, 6);
}

// ── костюм на торсе ──────────────────────────────────────────
type Piece = { pts: P[]; fill: string | CanvasGradient; line: string; w?: number };

function drawBodyOutfit(ctx: CanvasRenderingContext2D, look: Appearance, rnd: () => number): void {
  const c = look.outfit;
  const tr = look.outfitTrim;
  const st = look.outfitStyle;
  const f = look.figure;
  const cline = ink(c, 0.5);
  const tline = ink(tr, 0.5);
  const br = 34 + f * 26;
  const bustTop = SK.bustY - br - 4;
  const bustBot = SK.bustY + br * 0.9;

  const cloth = linear(ctx, CX - 90, 340, CX + 90, 700, [
    [0, light(c, 0.3)],
    [0.4, c],
    [1, dark(c, 0.34)],
  ]);
  const metal = linear(ctx, CX - 90, 340, CX + 90, 700, [
    [0, light(tr, 0.72)],
    [0.26, light(tr, 0.16)],
    [0.56, dark(tr, 0.22)],
    [0.78, light(tr, 0.34)],
    [1, dark(tr, 0.12)],
  ]);

  const piece = (p: Piece): void => {
    shape(ctx, p.pts, 12);
    ctx.fillStyle = p.fill;
    ctx.fill();
    ctx.save();
    shape(ctx, p.pts, 12);
    ctx.clip();
    const xs = p.pts.map((q) => q[0]);
    const ys = p.pts.map((q) => q[1]);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    ctx.beginPath();
    ctx.moveTo(x1 - 24, y0 - 10);
    ctx.lineTo(x1 + 14, y0 - 10);
    ctx.lineTo(x1 + 14, y1 + 10);
    ctx.lineTo(x1 - 34, y1 + 10);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fill();
    ctx.restore();
    shapeInk(ctx, p.pts, p.line, 1.2, p.w ?? 3.4);
  };

  const fold = (a: P, b: P, w = 2.4, col = 'rgba(0,0,0,0.2)'): void => {
    taper(ctx, [a, [(a[0] + b[0]) / 2 + (rnd() - 0.5) * 5, (a[1] + b[1]) / 2], b], [0, w, 0], col, 8);
  };

  // ── верх ─────────────────────────────────────────────────
  if (st === 'sarashi') {
    for (let i = 0; i < 4; i++) {
      const y = bustTop + 10 + i * (br * 0.52);
      piece({
        pts: [
          [CX - 74, y - 8],
          [CX, y + 10],
          [CX + 74, y - 8],
          [CX + 72, y + 16],
          [CX, y + 34],
          [CX - 72, y + 16],
        ],
        fill: i % 2 ? light(c, 0.16) : cloth,
        line: cline,
        w: 2.8,
      });
    }
    taper(ctx, [[CX + 40, bustTop + 4], [CX + 84, bustTop + 40], [CX + 74, bustTop + 96]], [7, 9, 4], tr, 8);
  } else if (st === 'harness') {
    // только ремни и микро-чашки
    for (const s of [-1, 1] as const) {
      piece({
        pts: [
          [CX + s * 6, SK.bustY - br * 0.5],
          [CX + s * (br + 22), SK.bustY - br * 0.62],
          [CX + s * (br + 26), SK.bustY + br * 0.2],
          [CX + s * br * 0.7, SK.bustY + br * 0.78],
          [CX + s * 4, SK.bustY + br * 0.4],
        ],
        fill: cloth,
        line: cline,
        w: 3,
      });
      taper(
        ctx,
        [[CX + s * 18, SK.bustY - br * 0.8], [CX + s * 44, SK.neckBase + 30], [CX + s * 52, SK.shoulderY - 2]],
        [7, 8, 7],
        tr,
        8,
      );
    }
    taper(ctx, [[CX - 78, SK.bustY - br * 0.2], [CX, SK.bustY - br * 0.05], [CX + 78, SK.bustY - br * 0.2]], [6, 8, 6], tr, 8);
  } else if (st === 'plate') {
    piece({
      pts: [
        [CX - 78, bustTop + 26],
        [CX - 46, bustTop - 4],
        [CX - 14, bustTop + 30],
        [CX, bustTop + 20],
        [CX + 14, bustTop + 30],
        [CX + 46, bustTop - 4],
        [CX + 78, bustTop + 26],
        [CX + 70, bustBot + 12],
        [CX + 32, 508],
        [CX, 520],
        [CX - 32, 508],
        [CX - 70, bustBot + 12],
      ],
      fill: metal,
      line: tline,
      w: 3.8,
    });
    // рёбра кирасы по чашкам
    for (const s2 of [-1, 1] as const) {
      taper(
        ctx,
        [[CX + s2 * 8, bustTop + 34], [CX + s2 * 52, bustTop + 30], [CX + s2 * 64, bustBot - 6], [CX + s2 * 24, bustBot + 10]],
        [2, 3, 3, 2],
        rgba(tline, 0.55),
        10,
      );
    }
    taper(ctx, [[CX, bustTop + 22], [CX, 502]], [2.6, 1.6], rgba(tline, 0.45), 6);
    taper(ctx, [[CX - 30, 500], [CX, 512], [CX + 30, 500]], [2, 2.6, 2], rgba(tline, 0.5), 8);
    // горжет
    piece({
      pts: [[CX - 42, SK.neckBase + 2], [CX, SK.neckBase + 18], [CX + 42, SK.neckBase + 2], [CX + 36, SK.neckBase + 26], [CX, SK.neckBase + 42], [CX - 36, SK.neckBase + 26]],
      fill: metal,
      line: tline,
      w: 3,
    });
  } else if (st === 'qipao') {
    piece({
      pts: [
        [CX - 70, bustTop + 20],
        [CX - 30, bustTop - 6],
        [CX + 16, bustTop + 30],
        [CX + 74, bustTop + 6],
        [CX + 66, 520],
        [CX + 30, 560],
        [CX - 40, 552],
        [CX - 66, 500],
      ],
      fill: cloth,
      line: cline,
    });
    // косой запах
    taper(ctx, [[CX + 16, bustTop + 30], [CX - 20, 460], [CX - 44, 550]], [6, 7, 6], tr, 10);
    // воротник-стойка
    piece({
      pts: [[CX - 30, SK.neckBase - 30], [CX, SK.neckBase - 22], [CX + 30, SK.neckBase - 30], [CX + 28, SK.neckBase + 6], [CX, SK.neckBase + 16], [CX - 28, SK.neckBase + 6]],
      fill: cloth,
      line: cline,
      w: 2.6,
    });
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(CX - 24 + i * 4, 400 + i * 54, 4, 0, Math.PI * 2);
      ctx.fillStyle = light(tr, 0.4);
      ctx.fill();
    }
  } else if (st === 'robe') {
    // распахнутая мантия: только узкая полоса ткани по центру
    piece({
      pts: [
        [CX - 46, bustTop + 26],
        [CX, bustTop + 4],
        [CX + 46, bustTop + 26],
        [CX + 40, bustBot + 22],
        [CX, 556],
        [CX - 40, bustBot + 22],
      ],
      fill: cloth,
      line: cline,
    });
    for (const s of [-1, 1] as const) {
      taper(ctx, [[CX + s * 46, bustTop + 26], [CX + s * 62, 470], [CX + s * 54, 560]], [6, 7, 5], tr, 8);
    }
  } else {
    // leotard / slit / coat — бюстье
    piece({
      pts: [
        [CX - 76, bustTop + 22],
        [CX - 40, bustTop - 4],
        [CX, bustTop + 26],
        [CX + 40, bustTop - 4],
        [CX + 76, bustTop + 22],
        [CX + 70, bustBot + 4],
        [CX, bustBot + 20],
        [CX - 70, bustBot + 4],
      ],
      fill: cloth,
      line: cline,
    });
    taper(ctx, [[CX - 76, bustTop + 24], [CX - 40, bustTop + 2], [CX, bustTop + 32], [CX + 40, bustTop + 2], [CX + 76, bustTop + 24]], [4, 6, 7, 6, 4], tr, 10);
    if (st === 'leotard' || st === 'coat') {
      for (const s of [-1, 1] as const) {
        taper(ctx, [[CX + s * 26, bustTop + 8], [CX + s * 46, SK.neckBase + 28], [CX + s * 54, SK.shoulderY - 4]], [8, 9, 8], cloth === undefined ? tr : c, 8);
        taper(ctx, [[CX + s * 26, bustTop + 8], [CX + s * 46, SK.neckBase + 28], [CX + s * 54, SK.shoulderY - 4]], [2.4, 2.6, 2.4], tr, 8);
      }
    }
    fold([CX - 40, bustTop + 30], [CX - 30, bustBot + 6], 2.2);
    fold([CX + 34, bustTop + 26], [CX + 26, bustBot + 4], 2.2);
  }

  // ── низ: трусики / шорты высокой посадки ─────────────────
  const hipC = st === 'plate' ? metal : cloth;
  const hipLine = st === 'plate' ? tline : cline;
  const highCut = st === 'leotard' || st === 'harness' || st === 'slit';
  piece({
    pts: highCut
      ? [
          [CX - 62, 600],
          [CX, 590],
          [CX + 62, 600],
          [CX + 40, 664],
          [CX + 16, 706],
          [CX, 716],
          [CX - 16, 706],
          [CX - 40, 664],
        ]
      : [
          [CX - 66, 602],
          [CX, 592],
          [CX + 66, 602],
          [CX + 62, 676],
          [CX + 32, 706],
          [CX, 714],
          [CX - 32, 706],
          [CX - 62, 676],
        ],
    fill: hipC,
    line: hipLine,
  });
  // пояс
  taper(ctx, [[CX - 76, 600], [CX, 590], [CX + 76, 600]], [8, 11, 8], tr, 10);
  shape(ctx, [[CX, 588], [CX + 15, 604], [CX, 624], [CX - 15, 604]], 8);
  ctx.fillStyle = light(look.aura, 0.2);
  ctx.fill();
  shapeInk(ctx, [[CX, 588], [CX + 15, 604], [CX, 624], [CX - 15, 604]], tline, 1.1, 2.4);

  // ремни портупеи
  if (st === 'harness' || st === 'coat') {
    for (const s of [-1, 1] as const) {
      taper(ctx, [[CX + s * 10, SK.neckBase + 24], [CX + s * 44, 470], [CX + s * 60, 600]], [9, 10, 9], dark(tr, 0.05), 10);
      for (let i = 0; i < 3; i++) {
        const t = 0.3 + i * 0.22;
        taper(
          ctx,
          [
            [CX + s * (10 + 50 * t) - 6, SK.neckBase + 24 + (576 - SK.neckBase) * t],
            [CX + s * (10 + 50 * t) + 6, SK.neckBase + 26 + (576 - SK.neckBase) * t],
          ],
          [2, 2],
          dark(tr, 0.3),
          3,
        );
      }
    }
  }

  // подвязки чулок
  if (look.stockings) {
    for (const s of [-1, 1] as const) {
      taper(ctx, [[CX + s * 30, 660], [CX + s * 58, 690], [CX + s * 62, 726]], [6, 6, 6], tr, 8);
    }
  }
}

// ── юбка / полы (отдельная часть, качается) ──────────────────
function hasSkirt(st: Appearance['outfitStyle']): boolean {
  return st === 'slit' || st === 'qipao' || st === 'robe' || st === 'plate' || st === 'coat';
}

function drawSkirt(ctx: CanvasRenderingContext2D, look: Appearance, rnd: () => number): void {
  const st = look.outfitStyle;
  if (!hasSkirt(st)) return;
  const c = look.outfit;
  const tr = look.outfitTrim;
  const cline = ink(c, 0.5);
  const long = st === 'slit' || st === 'qipao' || st === 'robe' ? 940 : 800;

  const panel = (s: -1 | 1): void => {
    const outX = st === 'plate' ? 96 : 106;
    const pts: P[] = [
      [CX + s * 46, 596],
      [CX + s * 88, 604],
      [CX + s * (outX + 14), 768],
      [CX + s * (outX + 30), long - 26],
      [CX + s * (outX + 14), long + 4],
      [CX + s * 92, long - 14],
      [CX + s * 82, 830],
      [CX + s * 72, 690],
    ];
    shape(ctx, pts, 12);
    ctx.fillStyle = linear(ctx, CX - 110, 600, CX + 110, long, [
      [0, light(c, 0.28)],
      [0.4, c],
      [1, dark(c, 0.36)],
    ]);
    ctx.fill();
    ctx.save();
    shape(ctx, pts, 12);
    ctx.clip();
    for (let i = 0; i < 4; i++) {
      const t = 0.16 + i * 0.22;
      taper(
        ctx,
        [
          [CX + s * (52 + 36 * t), 614 + i * 10],
          [CX + s * (74 + 44 * t) + (rnd() - 0.5) * 6, (620 + long) / 2],
          [CX + s * (86 + 44 * t), long - 16],
        ],
        [0, 3 + i * 1.6, 0],
        'rgba(0,0,0,0.17)',
        10,
      );
    }
    ctx.fillStyle = 'rgba(0,0,0,0.13)';
    ctx.fillRect(CX + (s > 0 ? 96 : -150), 596, 56, long);
    ctx.restore();
    shapeInk(ctx, pts, cline, 1.3, 3.6);
    taper(
      ctx,
      [[CX + s * (outX + 30), long - 34], [CX + s * (outX + 18), long + 4], [CX + s * 90, long - 10]],
      [5, 6, 5],
      tr,
      8,
    );
  };

  panel(-1);
  panel(1);

  if (st === 'plate') {
    // набедренники
    for (const s of [-1, 1] as const) {
      const p: P[] = [
        [CX + s * 30, 606],
        [CX + s * 82, 612],
        [CX + s * 90, 724],
        [CX + s * 36, 710],
      ];
      shape(ctx, p, 10);
      ctx.fillStyle = linear(ctx, CX + s * 20, 600, CX + s * 96, 750, [
        [0, light(tr, 0.7)],
        [0.4, tr],
        [1, dark(tr, 0.3)],
      ]);
      ctx.fill();
      shapeInk(ctx, p, ink(tr, 0.5), 1.3, 3.4);
    }
  }
}

// ── плащ ─────────────────────────────────────────────────────
function drawCape(ctx: CanvasRenderingContext2D, look: Appearance, rnd: () => number): void {
  if (!look.cape) return;
  const c = mix(look.aura, look.outfit, 0.4);
  const linen = light(look.outfitTrim, 0.2);
  const bottom = 930;
  const pts: P[] = [
    [CX - 56, SK.shoulderY - 8],
    [CX + 56, SK.shoulderY - 8],
    [CX + 88, 520],
    [CX + 110, 760],
    [CX + 94, bottom],
    [CX + 48, bottom - 40],
    [CX + 10, bottom + 12],
    [CX - 34, bottom - 36],
    [CX - 88, bottom - 4],
    [CX - 106, 760],
    [CX - 84, 520],
  ];
  shape(ctx, pts, 14);
  ctx.fillStyle = linear(ctx, CX - 130, SK.shoulderY, CX + 130, bottom, [
    [0, light(c, 0.22)],
    [0.35, c],
    [1, dark(c, 0.42)],
  ]);
  ctx.fill();

  ctx.save();
  shape(ctx, pts, 14);
  ctx.clip();
  // подкладка слева видна из-под края
  shape(ctx, [[CX - 84, 520], [CX - 48, 560], [CX - 52, bottom - 20], [CX - 88, bottom - 4], [CX - 106, 760]], 12);
  ctx.fillStyle = rgba(linen, 0.55);
  ctx.fill();
  for (let i = 0; i < 6; i++) {
    const x = CX - 82 + i * 32;
    taper(
      ctx,
      [
        [x, 400],
        [x + (rnd() - 0.5) * 26, 660],
        [x + (rnd() - 0.5) * 40, bottom - 10],
      ],
      [0, 7 + rnd() * 6, 0],
      'rgba(0,0,0,0.2)',
      12,
    );
  }
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(CX + 30, 300, 130, 700);
  ctx.restore();
  shapeInk(ctx, pts, ink(c, 0.55), 1.6, 4.4);

  // застёжка у горла
  taper(ctx, [[CX - 56, SK.shoulderY + 2], [CX, SK.neckBase + 16], [CX + 56, SK.shoulderY + 2]], [7, 9, 7], look.outfitTrim, 10);
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

/** порядок отрисовки: от дальнего к ближнему */
export const PART_ORDER: PartName[] = [
  'cape',
  'backHair',
  'armFarUpper',
  'armFarFore',
  'legFarThigh',
  'legFarShin',
  'legNearThigh',
  'legNearShin',
  'torso',
  'skirt',
  'head',
  'armNearUpper',
  'armNearFore',
];

export interface Part {
  canvas: HTMLCanvasElement;
  /** точка вращения внутри канваса, в пикселях канваса */
  pivot: P;
  /** где часть крепится в пространстве фигуры */
  joint: P;
  /** прямоугольник части в пространстве фигуры */
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
}

const BOX: Record<PartName, Box> = {
  cape: { ox: 128, oy: 296, w: 304, h: 700 },
  backHair: { ox: 116, oy: 20, w: 328, h: 520 },
  armFarUpper: { ox: 126, oy: 274, w: 152, h: 292 },
  armFarFore: { ox: 96, oy: 438, w: 162, h: 302 },
  legFarThigh: { ox: 138, oy: 546, w: 168, h: 396 },
  legFarShin: { ox: 130, oy: 796, w: 172, h: 336 },
  legNearThigh: { ox: 254, oy: 546, w: 168, h: 396 },
  legNearShin: { ox: 258, oy: 796, w: 172, h: 336 },
  torso: { ox: 164, oy: 226, w: 232, h: 522 },
  skirt: { ox: 134, oy: 582, w: 292, h: 384 },
  head: { ox: 118, oy: 12, w: 324, h: 452 },
  armNearUpper: { ox: 282, oy: 274, w: 152, h: 292 },
  armNearFore: { ox: 302, oy: 438, w: 162, h: 302 },
};

const JOINT_OF: Record<PartName, P> = {
  cape: [CX, SK.shoulderY],
  backHair: [CX, 190],
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

/** точка кисти ближней руки — куда крепится оружие */
export const HAND_ANCHOR: P = [CX + SK.wristX + 18, SK.wristY + 18];

function makePart(
  name: PartName,
  scale: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): Part {
  const b = BOX[name];
  const c = document.createElement('canvas');
  c.width = Math.round(b.w * scale);
  c.height = Math.round(b.h * scale);
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.scale(scale, scale);
    ctx.translate(-b.ox, -b.oy);
    draw(ctx);
  }
  const j = JOINT_OF[name];
  return {
    canvas: c,
    pivot: [(j[0] - b.ox) * scale, (j[1] - b.oy) * scale],
    joint: j,
    ox: b.ox,
    oy: b.oy,
    w: b.w,
    h: b.h,
  };
}

/** Рисует все части героини в отдельные канвасы — готовый 2D-риг */
export function buildParts(look: Appearance, id: string, scale = 1): Parts {
  const sultry = Math.max(0.45, 1 - look.mood);
  const st = look.outfitStyle;
  const sleeved = st === 'coat' || st === 'robe' || st === 'qipao';

  const armUpper = (side: 1 | -1) => (ctx: CanvasRenderingContext2D): void => {
    const s: Seg = {
      a: [CX + side * SK.shoulderX, SK.shoulderY],
      b: [CX + side * SK.elbowX, SK.elbowY],
      widths: [28, 26, 23, 20, 18],
      bow: side * 5,
      overA: side > 0 ? 10 : 22,
      overB: 26,
    };
    drawLimb(ctx, look, s, side, { capA: side > 0, marks: side > 0 ? ['shoulder'] : [] });
    if (st === 'plate') {
      // наплечник
      const sx = CX + side * SK.shoulderX;
      const p: P[] = [
        [sx - side * 30, SK.shoulderY - 14],
        [sx + side * 4, SK.shoulderY - 28],
        [sx + side * 34, SK.shoulderY - 4],
        [sx + side * 37, SK.shoulderY + 32],
        [sx - side * 2, SK.shoulderY + 44],
        [sx - side * 30, SK.shoulderY + 26],
      ];
      shape(ctx, p, 12);
      ctx.fillStyle = linear(ctx, sx - 40, SK.shoulderY - 30, sx + 40, SK.shoulderY + 46, [
        [0, light(look.outfitTrim, 0.72)],
        [0.4, look.outfitTrim],
        [1, dark(look.outfitTrim, 0.38)],
      ]);
      ctx.fill();
      shapeInk(ctx, p, ink(look.outfitTrim, 0.5), 1.4, 3.8);
      taper(ctx, [[sx - side * 22, SK.shoulderY + 10], [sx + side * 30, SK.shoulderY + 16]], [2.4, 2.4], rgba(ink(look.outfitTrim, 0.5), 0.6), 6);
    } else if (sleeved) {
      drawCloth(ctx, subSeg(s, -0.12, 1.06, 3), look.outfit, side, { capA: true, trim: look.outfitTrim });
    }
  };

  const armFore = (side: 1 | -1) => (ctx: CanvasRenderingContext2D): void => {
    const s: Seg = {
      a: [CX + side * SK.elbowX, SK.elbowY],
      b: [CX + side * SK.wristX, SK.wristY],
      widths: [19, 17, 15, 13, 11.5],
      bow: side * 3,
      overA: 20,
      overB: 6,
    };
    const g = drawLimb(ctx, look, s, side, { crease: 0.08, marks: ['elbow'] });
    drawHand(ctx, look, g, side);
    if (st === 'leotard' || st === 'harness' || st === 'plate' || st === 'sarashi') {
      // перчатка
      drawCloth(ctx, subSeg(s, 0.42, 1.06, 2.4), st === 'plate' ? look.outfitTrim : look.outfit, side, {
        capA: true,
        trim: look.outfitTrim,
      });
    } else if (sleeved) {
      drawCloth(ctx, subSeg(s, -0.14, 0.78, 5), look.outfit, side, { capA: false, trim: look.outfitTrim });
    }
  };

  const legThigh = (side: 1 | -1) => (ctx: CanvasRenderingContext2D): void => {
    const s: Seg = {
      a: [CX + side * SK.hipX, SK.hipY],
      b: [CX + side * SK.kneeX, SK.kneeY],
      widths: [50 + look.figure * 8, 46 + look.figure * 6, 40, 34, 29],
      bow: side * 9,
      overA: 44,
      overB: 22,
    };
    drawLimb(ctx, look, s, side, { marks: ['thigh'] });
    if (look.stockings) {
      drawCloth(ctx, subSeg(s, 0.24, 1.08, 2.6), look.stockings, side, {
        capA: true,
        trim: look.outfitTrim,
        lace: true,
      });
    }
  };

  const legShin = (side: 1 | -1) => (ctx: CanvasRenderingContext2D): void => {
    const s: Seg = {
      a: [CX + side * SK.kneeX, SK.kneeY],
      b: [CX + side * SK.ankleX, SK.ankleY],
      widths: [29, 30, 26, 20, 14],
      bow: side * -7,
      overA: 24,
      overB: 8,
    };
    drawLimb(ctx, look, s, side, { crease: 0.06, marks: ['knee', 'calf', 'ankle'] });
    if (look.stockings) drawCloth(ctx, subSeg(s, -0.1, 1.06, 2.4), look.stockings, side, { capA: false });
    drawFoot(ctx, look, [CX + side * SK.ankleX, SK.ankleY + 6], side);
  };

  return {
    cape: makePart('cape', scale, (ctx) => drawCape(ctx, look, seeded(`${id}cape`))),
    backHair: makePart('backHair', scale, (ctx) => {
      ctx.save();
      headTransform(ctx);
      drawBackHair(ctx, look, seeded(id));
      ctx.restore();
    }),
    armFarUpper: makePart('armFarUpper', scale, armUpper(-1)),
    armFarFore: makePart('armFarFore', scale, armFore(-1)),
    legFarThigh: makePart('legFarThigh', scale, legThigh(-1)),
    legFarShin: makePart('legFarShin', scale, legShin(-1)),
    legNearThigh: makePart('legNearThigh', scale, legThigh(1)),
    legNearShin: makePart('legNearShin', scale, legShin(1)),
    torso: makePart('torso', scale, (ctx) => {
      drawTorso(ctx, look);
      drawBodyOutfit(ctx, look, seeded(`${id}fit`));
    }),
    skirt: makePart('skirt', scale, (ctx) => drawSkirt(ctx, look, seeded(`${id}skirt`))),
    head: makePart('head', scale, (ctx) => {
      ctx.save();
      headTransform(ctx);
      drawHead(ctx, look);
      drawFace(ctx, look, sultry);
      drawFrontHair(ctx, look, seeded(`${id}f`));
      drawAccessory(ctx, look);
      ctx.restore();
    }),
    armNearUpper: makePart('armNearUpper', scale, armUpper(1)),
    armNearFore: makePart('armNearFore', scale, armFore(1)),
  };
}

export { hairPack, skinTones, mix, spline };
