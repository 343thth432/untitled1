import { Paint, type Mat } from './paint';
import { FOES, FOE_IDS, type FoeId, type Gait, type Outfit, type Skin } from './foes';

/**
 * Спрайты кошкодевочек: восемь ракурсов и полный набор кадров как в Doom —
 * шаг, замах, боль, смерть и разрыв в клочья.
 *
 * Фигура собирается из скелета: поза задаёт стопы, кисти, наклон и
 * оседание, рисовальщик наращивает на это тело по четырём обхватам
 * (плечи, грудь, талия, бёдра), а сверху надевает наряд. Все размеры —
 * доли роста, поэтому мелкая и хозяйка этажа сложены одинаково правильно.
 *
 * Рисуется не цветом, а формой: каждая операция кладёт материал и нормаль
 * поверхности (см. paint.ts). Рука — цилиндр, голова — шар, пола одежды —
 * плоскость. Цвет считается в конце: свет, контровой по кромке и
 * квантование в рампу с дизерингом. Поэтому объём здесь настоящий, а не
 * нарисованный фигурой поменьше поверх большей.
 *
 * Ракурсов рисуется пять — анфас, три четверти, профиль, три четверти со
 * спины и спина. Остальные три получаются отражением, как в оригинале.
 */

export const ART_W = 152;
export const ART_H = 208;
const CX = 76;
/** пол в буфере */
const G = 205;

/** имена кадров: w — фаза шага, d — смерть, g — разрыв */
export type PoseId =
  | 'w0' | 'w1' | 'w2' | 'w3'
  | 'atk' | 'cast' | 'pain'
  | 'd0' | 'd1' | 'd2' | 'd3' | 'd4'
  | 'g0' | 'g1' | 'g2' | 'g3';

/** Смещения позы заданы для роста в сто пикселей и масштабируются с ним. */
interface Pose {
  bob: number;
  lean: number;
  foot: [number, number];
  rise: [number, number];
  hand: [number, number];
  drop: [number, number];
  squash: number;
  head: number;
  roar: number;
}

function walk(k: number, g: Gait): Pose {
  const ph = (k * Math.PI) / 2;
  const s = Math.sin(ph);
  const c = Math.cos(ph);
  const arm = 5 * g.swing;
  return {
    bob: (Math.abs(c) * 3 - 1.5) * g.bounce,
    lean: 1.5 + g.stoop,
    foot: [s * 10 * g.stride, -s * 10 * g.stride],
    rise: [Math.max(0, s * 7 * g.stride), Math.max(0, -s * 7 * g.stride)],
    hand: [-s * arm - 4 * g.wide, s * arm + 4 * g.wide],
    drop: [17 - Math.abs(s) * 3 * g.swing, 17 - Math.abs(s) * 3 * g.swing],
    squash: 1,
    head: 0,
    roar: 0,
  };
}

/** раскадровка под конкретную походку; на тварь считается один раз */
function posesOf(g: Gait): Record<PoseId, Pose> {
  const up = 9 + 4 * g.snap;
  const out = 12 + 5 * g.wide;
  const idle = walk(0, g);
  return {
    w0: idle,
    w1: walk(1, g),
    w2: walk(2, g),
    w3: walk(3, g),
    // замах: корпус вперёд, когти занесены над головой
    atk: { bob: -1.5 * g.bounce, lean: 4 * g.snap + g.stoop, foot: [-6 * g.stride, 7 * g.stride], rise: [0, 0], hand: [-out, out], drop: [-up, -up * 0.7], squash: 0.98, head: -1.5, roar: 1 },
    // бросок: одна рука выброшена вперёд, вторая отведена
    cast: { bob: 0, lean: 3 * g.snap + g.stoop, foot: [-4 * g.stride, 6 * g.stride], rise: [0, 0], hand: [-out * 1.15, out * 0.6], drop: [-3, -up], squash: 1, head: -1.5, roar: 1 },
    // боль: отброшена назад, руки вскинуты
    pain: { bob: 1.5, lean: -5 * g.snap, foot: [4 * g.stride, -4 * g.stride], rise: [0, 1.5], hand: [-out * 0.8, out * 0.8], drop: [-up * 0.55, -up * 0.5], squash: 0.96, head: 6, roar: 1 },
    d0: { bob: 0, lean: -6 * g.snap, foot: [6 * g.stride, -6 * g.stride], rise: [0, 3], hand: [-out * 0.9, out * 0.9], drop: [-up * 0.8, -up * 0.7], squash: 0.9, head: 9, roar: 1 },
    d1: { bob: 0, lean: -4, foot: [10 * g.stride, -10 * g.stride], rise: [0, 0], hand: [-out * 1.15, out * 1.1], drop: [0, -3], squash: 0.68, head: 9, roar: 1 },
    d2: { bob: 0, lean: 0, foot: [16 * g.stride, -16 * g.stride], rise: [0, 0], hand: [-out * 1.45, out * 1.35], drop: [10, 7], squash: 0.44, head: 6, roar: 1 },
    d3: { bob: 0, lean: 0, foot: [21, -21], rise: [0, 0], hand: [-28, 27], drop: [18, 16], squash: 0.26, head: 3, roar: 0 },
    d4: { bob: 0, lean: 0, foot: [24, -24], rise: [0, 0], hand: [-31, 30], drop: [21, 19], squash: 0.19, head: 1.5, roar: 0 },
    g0: idle,
    g1: idle,
    g2: idle,
    g3: idle,
  };
}

const poseCache = new Map<FoeId, Record<PoseId, Pose>>();
function posesFor(id: FoeId): Record<PoseId, Pose> {
  let hit = poseCache.get(id);
  if (!hit) {
    hit = posesOf(FOES[id].gait);
    poseCache.set(id, hit);
  }
  return hit;
}

/** множитель ширины по ракурсу: профиль вдвое уже анфаса */
const BW = [1, 0.92, 0.6, 0.92, 1];
/** сдвиг лица к тому боку, куда повёрнута тварь, в долях головы */
const FACE = [0, 0.28, 0.55, 0, 0];
/** сколько глаз видно */
const EYES = [2, 2, 1, 0, 0];
/** насколько грива закрывает голову */
const BACK = [0.3, 0.55, 0.75, 1, 1];

/** материалы; 0 — пусто */
const M = {
  skin: 1,
  hair: 2,
  top: 3,
  cloth: 4,
  trim: 5,
  metal: 6,
  sock: 7,
  boot: 8,
  eye: 9,
  ear: 10,
  claw: 11,
  blood: 12,
  lite: 13,
  dark: 14,
} as const;

function mats(s: Skin): Mat[] {
  const m: Mat[] = [];
  m[M.skin] = { base: s.skin };
  m[M.hair] = { base: s.hair, gloss: 0.22 };
  m[M.top] = { base: s.top, gloss: 0.1 };
  m[M.cloth] = { base: s.cloth, gloss: 0.08 };
  m[M.trim] = { base: s.trim, gloss: 0.15 };
  m[M.metal] = { base: s.metal, gloss: 0.5 };
  m[M.sock] = { base: s.sock, gloss: 0.12 };
  m[M.boot] = { base: s.boot, gloss: 0.3 };
  m[M.eye] = { base: s.eye, glow: 1 };
  m[M.ear] = { base: s.ear };
  m[M.claw] = { base: s.claw, gloss: 0.25 };
  m[M.blood] = { base: '#8d1018', gloss: 0.5 };
  m[M.lite] = { base: s.lite };
  m[M.dark] = { base: '#171320' };
  return m;
}

/** слои по глубине: что ближе к зрителю, то и поверх */
const Z = {
  tailBack: -60,
  hairBack: -40,
  farLimb: -20,
  leg: -6,
  body: 0,
  wear: 12,
  detail: 20,
  head: 30,
  face: 40,
  nearLimb: 46,
  tailFront: 52,
} as const;

/** мерки фигуры в пикселях буфера — на них опираются и тело, и наряд */
interface Geom {
  bw: number;
  /** доля от роста в сто пикселей: ей кратны все мелкие размеры */
  k: number;
  v: number;
  cx: number;
  lean: number;
  tall: number;
  top: number;
  r: number;
  shY: number;
  bustY: number;
  waistY: number;
  hipY: number;
  sh: number;
  bust: number;
  waist: number;
  hip: number;
  joint: { hip: [number, number]; knee: [number, number]; foot: [number, number]; z: number }[];
  arm: { sh: [number, number]; elbow: [number, number]; hand: [number, number]; z: number }[];
  order: number[];
}

const px = (v: number): number => Math.round(v);

/** ухо: конус с розовой изнанкой и клоком шерсти у основания */
function ear(b: Paint, x: number, y: number, dir: 1 | -1, h: number, z: number): void {
  const w = h * 0.6;
  const tx = x + dir * h * 0.42;
  const ty = y - h;
  b.quad([[x - dir * w * 0.46, y + 4], [x + dir * w * 0.66, y + 2], [tx, ty + 1]], M.hair, 'cyly', z);
  b.quad([[x + dir * w * 0.06, y + 3], [x + dir * w * 0.5, y + 1], [tx - dir * 2, ty + 6]], M.ear, 'cyly', z + 1);
  b.ellipse(x - dir * w * 0.2, y + 2, w * 0.3, w * 0.24, M.hair, 'sphere', z + 2);
}

/** пушистый хвост дугой */
function tail(b: Paint, x: number, y: number, dir: 1 | -1, len: number, fluff: number, k: number, z: number): void {
  let ax = x;
  let ay = y;
  const n = 12;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const nx = x + dir * len * (0.25 + Math.sin(t * 2.4) * 0.75);
    const ny = y - len * (t * 0.9) + Math.sin(t * 2.8) * 3 * k;
    const w = (1.6 + fluff * 1.8) * Math.sqrt(k) * (0.75 + (1 - t) * 0.55);
    b.limb(ax, ay, nx, ny, w, w, M.hair, z);
    ax = nx;
    ay = ny;
  }
  b.ellipse(ax, ay, 2.2 * k, 2.2 * k, M.hair, 'sphere', z);
}

/** кисть: ладонь, пальцы, большой палец и когти */
function hand(b: Paint, x: number, y: number, dir: 1 | -1, k: number, big: number, z: number): void {
  const r = 3.4 * k;
  b.ellipse(x, y, r, r * 1.05, M.skin, 'sphere', z);
  for (let i = -1; i <= 1; i++) {
    const fy = y + i * r * 0.7;
    b.limb(x + dir * r * 0.4, fy, x + dir * r * 1.35, fy - r * 0.35, 2.2 * k, 1.7 * k, M.skin, z);
    b.limb(x + dir * r * 1.25, fy - r * 0.28, x + dir * r * (1.6 + big * 0.3), fy - r * (0.5 + big * 0.25), 1.3 * k, 0.9, M.claw, z + 1);
  }
  b.limb(x - dir * r * 0.2, y + r * 0.5, x + dir * r * 0.5, y + r * 1.15, 2.4 * k, 1.8 * k, M.skin, z);
}

/** прядь волос дугой с сужением к кончику */
function lock(b: Paint, x0: number, y0: number, dir: 1 | -1, len: number, bow: number, w0: number, w1: number, z: number): void {
  const n = 10;
  let ax = x0;
  let ay = y0;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const x = x0 + dir * bow * Math.sin(t * Math.PI * 0.85);
    const y = y0 + len * t;
    b.limb(ax, ay, x, y, (w0 + (w1 - w0) * (t - 1 / n)) * 2, (w0 + (w1 - w0) * t) * 2, M.hair, z);
    ax = x;
    ay = y;
  }
  b.ellipse(ax, ay, w1, w1 * 1.2, M.hair, 'sphere', z);
}

/** голова: шар черепа, шапка волос, уши, глаза */
function head(b: Paint, s: Skin, v: number, hx: number, hy: number, r: number, p: Pose): void {
  const back = BACK[v];
  const fx = r * FACE[v];
  const mane = r * (0.55 + s.mane * 2.0);
  const zh = Z.head;

  // объём волос сзади
  b.ellipse(hx - fx * 0.45, hy - r * 0.16, r * 1.06, r * 0.98, M.hair, 'sphere', Z.hairBack);
  b.ellipse(hx - fx * 0.45, hy + r * 0.28, r * 0.9, r * 0.7, M.hair, 'sphere', Z.hairBack);
  for (const d of [-1, 1] as const) {
    lock(b, hx + d * r * 0.86 - fx * 0.35, hy - r * 0.1, d, mane, r * 0.16, r * 0.3, r * 0.12, Z.hairBack + 4);
  }
  if (back > 0.7) {
    b.ellipse(hx, hy + mane * 0.45, r * 0.9, mane * 0.55, M.hair, 'cyly', Z.hairBack + 2);
  }

  const eh = r * 1.35;
  ear(b, hx - r * 0.58 + fx * 0.5, hy - r * 0.62, -1, eh, zh - 2);
  ear(b, hx + r * 0.64 + fx * 0.5, hy - r * 0.62, 1, eh, zh - 2);

  if (back >= 1) {
    b.ellipse(hx, hy - r * 0.04, r * 0.94, r * 0.98, M.hair, 'sphere', zh);
    return;
  }

  // череп: лоб, скулы, подбородок
  const cx = hx + fx;
  b.ellipse(cx, hy - r * 0.08, r * 0.92, r * 0.9, M.skin, 'sphere', zh);
  b.ellipse(cx, hy + r * 0.3, r * 0.76, r * 0.62, M.skin, 'sphere', zh);
  b.ellipse(cx, hy + r * 0.62, r * 0.46, r * 0.36, M.skin, 'sphere', zh);

  // шапка волос поверх лба
  b.ellipse(cx - fx * 0.3, hy - r * 0.52, r * 0.98, r * 0.62, M.hair, 'sphere', zh + 2);
  for (let i = -2; i <= 2; i++) {
    const bx = cx + i * r * 0.42 - fx * 0.25;
    const tip = hy - r * (0.14 + Math.abs(i) * 0.07);
    b.quad([
      [bx - r * 0.26, hy - r * 0.68],
      [bx + r * 0.26, hy - r * 0.68],
      [bx + (i > 0 ? r * 0.14 : -r * 0.14), tip],
    ], M.hair, 'cyly', zh + 3);
  }

  // глаза
  const n = EYES[v];
  const ey = hy + r * 0.2;
  const gap = Math.max(3, r * 0.48);
  const ew = Math.max(2, r * 0.24);
  const eh2 = Math.max(2, r * 0.22);
  const xs = n === 2 ? [cx - gap, cx + gap] : n === 1 ? [cx + r * 0.24] : [];
  for (const ex of xs) {
    b.ellipse(ex, ey, ew, eh2, M.lite, 'flat', Z.face);
    b.ellipse(ex - ew * 0.22, ey + eh2 * 0.15, ew * 0.7, eh2 * 0.82, M.eye, 'flat', Z.face + 1);
    b.ellipse(ex - ew * 0.22, ey + eh2 * 0.15, ew * 0.3, eh2 * 0.42, M.dark, 'flat', Z.face + 2);
    b.ellipse(ex - ew * 0.6, ey - eh2 * 0.32, ew * 0.22, ew * 0.22, M.lite, 'flat', Z.face + 3);
    // ресница сверху и бровь
    b.rect(px(ex - ew), px(ey - eh2), px(ew * 2) + 1, Math.max(1, px(r * 0.1)), M.dark, 'flat', Z.face + 4);
    b.rect(px(ex - ew), px(ey - r * 0.5), px(ew * 2), Math.max(1, px(r * 0.08)), M.hair, 'flat', Z.face + 1);
  }
  if (n > 0) {
    b.ellipse(cx + (n === 1 ? r * 0.2 : 0), ey + r * 0.42, r * 0.09, r * 0.07, M.dark, 'flat', Z.face);
    const my = ey + r * 0.62;
    if (p.roar > 0) {
      const mw = Math.max(2, r * 0.3);
      b.ellipse(cx, my, mw, Math.max(2, r * 0.24), M.dark, 'flat', Z.face);
      b.ellipse(cx, my + r * 0.08, mw - 1, Math.max(1, r * 0.13), M.blood, 'cylx', Z.face + 1);
      b.rect(px(cx - mw + 1), px(my - r * 0.2), 1, 2, M.claw, 'flat', Z.face + 2);
      b.rect(px(cx + mw - 2), px(my - r * 0.2), 1, 2, M.claw, 'flat', Z.face + 2);
    } else {
      b.ellipse(cx, my, r * 0.17, r * 0.06, M.dark, 'flat', Z.face);
      b.ellipse(cx + r * 0.03, my + r * 0.09, r * 0.1, r * 0.05, M.blood, 'flat', Z.face);
    }
  }
}

/** ------- наряды ------- */

interface Wear {
  body(b: Paint, s: Skin, g: Geom): void;
  sleeve?(b: Paint, g: Geom, i: number): void;
  leg?(b: Paint, g: Geom, i: number): void;
}

/** грудь: два объёма поверх торса */
function bustOf(b: Paint, g: Geom, m: number, z: number): void {
  const { cx, lean, bustY, bust: bu } = g;
  for (const d of [-1, 1] as const) {
    b.ellipse(cx + lean + d * bu * 0.44, bustY, bu * 0.52, bu * 0.4, m, 'cylx', z);
  }
}

/** голый живот между подолом верха и поясом */
function midriff(b: Paint, g: Geom, hem: number): void {
  const { cx, hipY, waist, hip } = g;
  b.taper(hem, hipY - 2, waist * 0.95, hip * 0.78, cx, M.skin, 'cyly', Z.body);
}

/** юбка в складку */
function pleated(b: Paint, g: Geom, len: number, flare: number): void {
  const { cx, hipY, hip, tall } = g;
  const bot = hipY + tall * 0.13 * len;
  b.taper(hipY - 3, bot, hip * 0.92, hip * flare, cx, M.cloth, 'cyly', Z.wear);
  for (let i = -2; i <= 2; i++) {
    const x = cx + i * hip * 0.5;
    b.limb(x, hipY - 2, x + i * hip * (flare - 0.9) * 0.5, bot - 2, hip * 0.22, hip * 0.26, M.cloth, Z.wear + 1);
  }
  b.ellipse(cx, bot - 2, hip * flare, tall * 0.02, M.cloth, 'cylx', Z.wear + 2);
}

/** матросский воротник с платком */
function collar(b: Paint, g: Geom): void {
  const { cx, lean, shY, sh, r } = g;
  b.taper(shY - 1, shY + r * 0.8, sh, sh * 0.46, cx + lean, M.cloth, 'cyly', Z.detail);
  b.rect(px(cx + lean - sh * 0.95), px(shY + r * 0.52), px(sh * 1.9), 1, M.lite, 'flat', Z.detail + 1);
  b.taper(shY - 1, shY + r * 0.55, sh * 0.4, 1, cx + lean, M.skin, 'cyly', Z.detail + 2);
  b.quad([
    [cx + lean - sh * 0.3, shY + r * 0.35],
    [cx + lean + sh * 0.3, shY + r * 0.35],
    [cx + lean, shY + r * 0.95],
  ], M.trim, 'cyly', Z.detail + 3);
}

const WEAR: Record<Outfit, Wear> = {
  // ── лохмотья: одно плечо голое, рваный подол, верёвочный пояс ──
  rags: {
    body(b, _s, g) {
      const { cx, lean, shY, bustY, waistY, hipY, sh, waist, hip, tall } = g;
      bustOf(b, g, M.skin, Z.body + 2);
      b.quad([
        [cx + lean - sh * 0.15, shY - 1],
        [cx + lean + sh, shY + tall * 0.02],
        [cx + waist * 1.1, waistY + tall * 0.05],
        [cx - waist * 1.1, waistY + tall * 0.05],
        [cx + lean - sh * 0.8, bustY],
      ], M.top, 'cyly', Z.wear);
      const hem = waistY + tall * 0.05;
      for (let i = -3; i <= 3; i++) {
        const x = cx + i * waist * 0.36;
        b.quad([[x - waist * 0.2, hem - 2], [x + waist * 0.2, hem - 2], [x, hem + tall * (i % 2 ? 0.035 : 0.015)]], M.top, 'cyly', Z.wear + 1);
      }
      midriff(b, g, hem + tall * 0.01);
      for (let i = -2; i <= 2; i++) {
        const x = cx + i * hip * 0.42;
        b.quad([
          [x - hip * 0.24, hipY - 2],
          [x + hip * 0.24, hipY - 2],
          [x + hip * 0.17, hipY + tall * (0.1 + (i % 2 ? 0.03 : 0))],
          [x - hip * 0.17, hipY + tall * (0.09 + (i % 2 ? 0.03 : 0))],
        ], M.cloth, 'cyly', Z.wear + 2);
      }
      b.limb(cx - hip * 0.95, hipY - 4, cx + hip * 0.95, hipY - 4, 3, 3, M.trim, Z.detail);
      b.ellipse(cx + hip * 0.3, hipY - 3, 2.5, 3, M.trim, 'sphere', Z.detail + 1);
    },
    sleeve(b, g, i) {
      const [sx, sy] = g.arm[i].sh;
      const k = g.k;
      if (i === 1) b.limb(sx, sy - 1, sx + 3 * k, sy + 5 * k, 9 * k, 7 * k, M.top, g.arm[i].z + 2);
      else b.limb(sx, sy + 2 * k, sx - 1, sy + 5 * k, 7 * k, 6 * k, M.trim, g.arm[i].z + 2);
    },
    leg(b, g, i) {
      const { knee, foot, z } = g.joint[i];
      const k = g.k;
      for (let t = 0.25; t < 0.95; t += 0.22) {
        const x = knee[0] + (foot[0] - knee[0]) * t;
        const y = knee[1] + (foot[1] - knee[1]) * t;
        b.limb(x - 1, y, x + 1, y + 1.5 * k, 6 * k, 6 * k, M.top, z + 2);
      }
    },
  },

  // ── матроска: воротник, платок, юбка в складку ──
  sailor: {
    body(b, s, g) {
      const { cx, lean, shY, bustY, waistY, hipY, sh, bust: bu, waist, hip } = g;
      b.taper(shY, bustY, sh, bu, cx + lean, M.top, 'cyly', Z.wear);
      b.taper(bustY, waistY, bu, waist, cx + lean * 0.6, M.top, 'cyly', Z.wear);
      bustOf(b, g, M.top, Z.wear + 2);
      const hem = waistY + (hipY - waistY) * (1 - s.bare);
      b.taper(waistY, hem, waist, waist * 1.05, cx, M.top, 'cyly', Z.wear);
      midriff(b, g, hem);
      pleated(b, g, s.skirt, 1.06);
      b.rect(px(cx - hip * 0.78), px(hipY - 3), px(hip * 1.56), 2, M.trim, 'cylx', Z.detail);
      collar(b, g);
    },
    sleeve(b, g, i) {
      const [sx, sy] = g.arm[i].sh;
      const k = g.k;
      b.limb(sx, sy - 1, sx + (i ? 1 : -1) * 2 * k, sy + 5 * k, 6.4 * k, 5.2 * k, M.top, g.arm[i].z + 2);
      b.rect(px(sx - 4 * k), px(sy + 5 * k), px(8 * k), 1, M.cloth, 'flat', g.arm[i].z + 3);
    },
  },

  // ── мантия: глубокий вырез, разрез до бедра, широкие рукава ──
  robe: {
    body(b, s, g) {
      const { cx, lean, shY, bustY, waistY, hipY, sh, waist, hip, tall, r } = g;
      b.taper(shY + r * 0.4, waistY, sh * 0.62, waist * 0.9, cx + lean, M.top, 'cyly', Z.wear);
      bustOf(b, g, M.top, Z.wear + 2);
      b.taper(waistY, hipY + tall * 0.06, waist * 0.95, hip * 0.95, cx, M.top, 'cyly', Z.wear);
      midriff(b, g, waistY + (hipY - waistY) * (1 - s.bare));
      const bot = hipY + tall * 0.34;
      for (const d of [-1, 1] as const) {
        b.quad([
          [cx + lean + d * sh * 0.95, shY],
          [cx + lean + d * sh * 0.2, shY + r * 0.9],
          [cx + d * waist * 0.8, waistY],
          [cx + d * hip * 0.45, bot],
          [cx + d * hip * 1.1, bot],
          [cx + lean + d * sh * 1.15, bustY],
        ], M.cloth, 'cyly', Z.wear + 3);
        b.limb(cx + lean + d * sh * 0.9, shY, cx + d * waist * 0.85, waistY - 2, 3.4 * g.k, 2.2 * g.k, M.cloth, Z.detail);
      }
      b.limb(cx - waist * 1.1, waistY + 2, cx + waist * 1.1, waistY + 2, tall * 0.03, tall * 0.03, M.cloth, Z.detail);
      b.ellipse(cx, waistY + tall * 0.02, waist * 0.3, waist * 0.26, M.metal, 'sphere', Z.detail + 1);
      b.ellipse(cx, waistY + tall * 0.02, waist * 0.15, waist * 0.13, M.eye, 'flat', Z.detail + 2);
    },
    sleeve(b, g, i) {
      const [sx, sy] = g.arm[i].sh;
      const [ex, ey] = g.arm[i].elbow;
      const k = g.k;
      const z = g.arm[i].z + 2;
      b.limb(sx, sy - 1, ex, ey, 8 * k, 6 * k, M.cloth, z);
      b.quad([
        [ex - 5 * k, ey - 3 * k],
        [ex + 5 * k, ey - 3 * k],
        [ex + 8 * k, ey + 9 * k],
        [ex - 8 * k, ey + 9 * k],
      ], M.cloth, 'cyly', z + 1);
      b.limb(ex - 7 * k, ey + 8 * k, ex + 7 * k, ey + 8 * k, 2.4 * k, 2.4 * k, M.cloth, z + 2);
    },
  },

  // ── боевая сбруя: лиф на бретелях, голый торс, запашная юбка ──
  harness: {
    body(b, _s, g) {
      const { cx, lean, shY, bustY, waistY, hipY, sh, bust: bu, waist, hip, tall, k } = g;
      b.taper(shY, waistY, sh * 0.9, waist, cx + lean, M.skin, 'cyly', Z.body);
      bustOf(b, g, M.skin, Z.body + 2);
      for (const d of [-1, 1] as const) {
        b.ellipse(cx + lean + d * bu * 0.44, bustY, bu * 0.54, bu * 0.42, M.top, 'cylx', Z.wear + 2);
        b.limb(cx + lean + d * bu * 0.6, bustY - bu * 0.42, cx + lean + d * sh * 0.86, shY + 1, 3.5 * k, 3 * k, M.top, Z.wear + 1);
      }
      b.limb(cx + lean - bu * 1.02, bustY + bu * 0.46, cx + lean + bu * 1.02, bustY + bu * 0.46, 3.4 * k, 3.4 * k, M.top, Z.wear + 3);
      b.ellipse(cx + lean, bustY + bu * 0.5, bu * 0.2, bu * 0.16, M.metal, 'sphere', Z.detail);
      // пресс и пупок
      for (let i = 0; i < 3; i++) {
        const y = bustY + bu * 0.82 + i * tall * 0.032;
        b.rect(px(cx - waist * 0.3), px(y), px(waist * 0.26), 1, M.dark, 'flat', Z.detail);
        b.rect(px(cx + waist * 0.04), px(y), px(waist * 0.26), 1, M.dark, 'flat', Z.detail);
      }
      midriff(b, g, waistY + tall * 0.01);
      b.quad([
        [cx - hip * 0.98, hipY - 2],
        [cx + hip * 0.98, hipY - 2],
        [cx + hip * 1.12, hipY + tall * 0.15],
        [cx - hip * 0.9, hipY + tall * 0.09],
      ], M.cloth, 'cyly', Z.wear);
      b.limb(cx + hip * 0.1, hipY - 2, cx + hip * 0.22, hipY + tall * 0.11, hip * 0.16, hip * 0.16, M.cloth, Z.wear + 1);
      b.taper(hipY - tall * 0.05, hipY, hip * 0.88, hip, cx, M.cloth, 'cyly', Z.detail);
      b.ellipse(cx, hipY - tall * 0.025, hip * 0.2, hip * 0.15, M.metal, 'sphere', Z.detail + 1);
    },
    sleeve(b, g, i) {
      const [sx, sy] = g.arm[i].sh;
      const [ex, ey] = g.arm[i].elbow;
      const [hx, hy] = g.arm[i].hand;
      const k = g.k;
      const z = g.arm[i].z + 2;
      if (i === 1) b.limb(sx, sy - 2 * k, sx + 2 * k, sy + 4 * k, 8 * k, 6 * k, M.metal, z);
      b.limb((ex + hx) / 2, (ey + hy) / 2, hx, hy, 6 * k, 5 * k, M.top, z);
      b.limb((ex + hx) / 2 - 3 * k, (ey + hy) / 2, (ex + hx) / 2 + 3 * k, (ey + hy) / 2, 1.5, 1.5, M.metal, z + 1);
    },
    leg(b, g, i) {
      const { knee, z } = g.joint[i];
      const k = g.k;
      b.limb(knee[0] - 1, knee[1], knee[0] + 1, knee[1] + 2 * k, 8 * k, 8 * k, M.top, z + 2);
    },
  },

  // ── доспех: кираса, горжет, наплечники, птеруги, поножи ──
  armor: {
    body(b, s, g) {
      const { cx, lean, shY, bustY, waistY, hipY, sh, bust: bu, waist, hip, tall, r } = g;
      b.taper(shY, bustY, sh, bu, cx + lean, M.top, 'cyly', Z.wear);
      b.taper(bustY, waistY, bu, waist, cx + lean * 0.6, M.top, 'cyly', Z.wear);
      bustOf(b, g, M.top, Z.wear + 2);
      for (let i = 0; i < 3; i++) {
        b.rect(px(cx + lean - bu * 0.7), px(bustY + bu * 0.55 + i * tall * 0.03), px(bu * 1.4), 1, M.metal, 'flat', Z.detail);
      }
      b.taper(shY - 2, shY + r * 0.4, sh * 0.5, sh * 0.8, cx + lean, M.metal, 'cyly', Z.detail + 1);
      midriff(b, g, waistY + (hipY - waistY) * (1 - s.bare));
      for (let i = -2; i <= 2; i++) {
        const x = cx + i * hip * 0.4;
        const bot = hipY + tall * (0.13 - Math.abs(i) * 0.012);
        b.quad([
          [x - hip * 0.18, hipY - 3],
          [x + hip * 0.18, hipY - 3],
          [x + hip * 0.19, bot],
          [x - hip * 0.19, bot],
        ], M.cloth, 'cyly', Z.wear + (i % 2 ? 0 : 1));
        b.rect(px(x - hip * 0.19), px(bot - 2), px(hip * 0.38), 2, M.metal, 'flat', Z.detail);
      }
      b.taper(hipY - 5, hipY - 1, hip * 0.98, hip * 0.98, cx, M.metal, 'cylx', Z.detail + 1);
    },
    sleeve(b, g, i) {
      const [sx, sy] = g.arm[i].sh;
      const [ex, ey] = g.arm[i].elbow;
      const [hx, hy] = g.arm[i].hand;
      const k = g.k;
      const z = g.arm[i].z + 2;
      b.limb(sx, sy - 2 * k, sx + (i ? 2 : -2) * k, sy + 4 * k, 7.5 * k, 6 * k, M.metal, z);
      b.limb((ex + hx) / 2, (ey + hy) / 2, hx, hy, 5 * k, 4 * k, M.metal, z);
    },
    leg(b, g, i) {
      const { knee, foot, z } = g.joint[i];
      const k = g.k;
      b.limb(knee[0], knee[1] + 2 * k, foot[0], foot[1] - 4 * k, 6 * k, 5 * k, M.metal, z + 2);
    },
  },

  // ── платье в пол с разрезом, воротник-стойка, шнуровка ──
  gown: {
    body(b, _s, g) {
      const { cx, lean, shY, bustY, waistY, hipY, sh, bust: bu, waist, hip, tall, r } = g;
      b.taper(shY, bustY, sh, bu, cx + lean, M.top, 'cyly', Z.wear);
      b.taper(bustY, waistY, bu, waist, cx + lean * 0.6, M.top, 'cyly', Z.wear);
      bustOf(b, g, M.top, Z.wear + 2);
      b.quad([
        [cx + lean - bu * 0.5, shY],
        [cx + lean + bu * 0.5, shY],
        [cx + lean, bustY + bu * 0.45],
      ], M.skin, 'cyly', Z.wear + 3);
      for (let i = 0; i < 4; i++) {
        b.rect(px(cx + lean - waist * 0.4), px(bustY + bu * 0.55 + i * tall * 0.028), px(waist * 0.8), 1, M.trim, 'flat', Z.detail);
      }
      const bot = G - tall * 0.02;
      b.quad([
        [cx - waist * 1.05, waistY],
        [cx + waist * 1.05, waistY],
        [cx + hip * 1.15, bot],
        [cx + hip * 0.15, bot],
        [cx + hip * 0.08, hipY + tall * 0.12],
        [cx - hip * 0.3, hipY + tall * 0.2],
        [cx - hip * 1.15, bot],
      ], M.cloth, 'cyly', Z.wear);
      b.limb(cx - waist * 1.05, waistY + 1, cx + waist * 1.05, waistY + 1, 3.5 * g.k, 3.5 * g.k, M.trim, Z.detail);
      b.taper(shY - r * 0.7, shY + r * 0.3, sh * 0.55, sh * 1.05, cx + lean, M.cloth, 'cyly', Z.detail);
      b.taper(shY - r * 0.7, shY - r * 0.2, sh * 0.48, sh * 0.72, cx + lean, M.trim, 'cyly', Z.detail + 1);
    },
    sleeve(b, g, i) {
      const [sx, sy] = g.arm[i].sh;
      const [ex, ey] = g.arm[i].elbow;
      const [hx, hy] = g.arm[i].hand;
      const k = g.k;
      const z = g.arm[i].z + 2;
      b.limb(sx, sy - 1, ex, ey, 8 * k, 5.5 * k, M.cloth, z);
      b.limb(ex, ey, hx, hy, 5.5 * k, 4.5 * k, M.cloth, z);
      b.quad([
        [hx - 4 * k, hy - 5 * k],
        [hx + 4 * k, hy - 5 * k],
        [hx + 6 * k, hy + 2 * k],
        [hx - 6 * k, hy + 2 * k],
      ], M.cloth, 'cyly', z + 1);
      b.limb(hx - 5 * k, hy + k, hx + 5 * k, hy + k, 2 * k, 2 * k, M.trim, z + 2);
    },
  },
};

/** мерки по позе и ракурсу */
function measure(s: Skin, v: number, p: Pose): Geom {
  const bw = BW[v];
  const tall = Math.max(20, s.tall * p.squash);
  const k = tall / 100;
  const top = G - tall;
  const r = Math.max(4, s.tall * 0.105 * (0.55 + 0.45 * p.squash));
  const lean = p.lean * k;
  const shY = top + r * 2 + tall * 0.025 - p.bob * k;
  const wide = (f: number): number => Math.max(2, s.broad * f * bw * 0.5);
  const hip = wide(0.86);
  const hipY = top + tall * 0.52;
  const sh = wide(0.84);
  const order = v >= 3 ? [1, 0] : [0, 1];

  const joint = [0, 1].map((i) => {
    const d = i ? 1 : -1;
    const hx = CX + d * hip * 0.38;
    const hy = hipY + tall * 0.02;
    const fx = CX + d * hip * 0.3 + p.foot[i] * k * bw;
    const fy = G - p.rise[i] * k;
    return {
      hip: [hx, hy] as [number, number],
      knee: [(hx + fx) / 2 - d * 0.6, (hy + fy) / 2 - 1] as [number, number],
      foot: [fx, fy] as [number, number],
      z: i === order[0] ? Z.farLimb : Z.leg,
    };
  });

  const armHalf = 2.4 * k * bw;
  const arm = [0, 1].map((i) => {
    const d = i ? 1 : -1;
    // плечевой сустав уходит внутрь торса, иначе рука торчит наружу
    // на половину своей толщины и силуэт становится квадратным
    const sx = CX + d * Math.max(1, sh - armHalf) + lean;
    const sy = shY + tall * 0.02;
    const hx = sx + p.hand[i] * k * bw;
    const hy = sy + p.drop[i] * k;
    return {
      sh: [sx, sy] as [number, number],
      elbow: [(sx + hx) / 2 + d * 2, (sy + hy) / 2 + 1] as [number, number],
      hand: [hx, hy] as [number, number],
      z: i === order[0] && v !== 0 ? Z.farLimb : Z.nearLimb,
    };
  });

  return {
    bw, k, v, cx: CX, lean, tall, top, r,
    shY,
    bustY: shY + tall * 0.1,
    waistY: top + tall * 0.44,
    hipY,
    sh,
    bust: wide(0.8),
    waist: wide(0.58),
    hip,
    joint,
    arm,
    order,
  };
}

/** стоящая фигура: ноги, тело, наряд, руки, голова, хвост */
function figure(b: Paint, s: Skin, v: number, p: Pose): void {
  const g = measure(s, v, p);
  const { k, bw, tall, hipY, hip } = g;
  const wear = WEAR[s.outfit];

  if (v >= 2) tail(b, CX - hip * 0.95, hipY - 2, -1, tall * 0.2, s.tail, k, Z.tailBack);

  // ── ноги ──
  for (const i of g.order) {
    const { hip: h, knee, foot, z } = g.joint[i];
    const thigh = 6.4 * k * bw + 1;
    const shin = 4.2 * k * bw + 1;
    b.limb(h[0], h[1], knee[0], knee[1], thigh, shin + 1, M.skin, z);
    b.limb(knee[0], knee[1], foot[0], foot[1] - 4 * k, shin + 1, shin, M.skin, z);
    if (s.sockH > 0.05) {
      const t = Math.min(1, s.sockH);
      const sx = h[0] + (knee[0] - h[0]) * (1 - t);
      const sy = h[1] + (knee[1] - h[1]) * (1 - t);
      b.limb(sx, sy, knee[0], knee[1], thigh - (1 - t) * 2, shin + 1, M.sock, z + 1);
      b.limb(knee[0], knee[1], foot[0], foot[1] - 4 * k, shin + 1, shin, M.sock, z + 1);
      b.limb(sx - 1, sy, sx + 1, sy + 1, thigh + 1, thigh + 1, M.sock, z + 2);
    }
    wear.leg?.(b, g, i);
    // сапог с каблуком
    b.limb((knee[0] + foot[0]) / 2, (knee[1] + foot[1]) / 2, foot[0], foot[1] - 3 * k, shin + 2, shin + 1, M.boot, z + 3);
    b.ellipse(foot[0], foot[1] - 2 * k, 3.4 * k * bw + 1, 2.4 * k, M.boot, 'sphere', z + 4);
  }

  // ── шея и торс под нарядом ──
  b.limb(CX + g.lean, g.shY - g.r * 0.62, CX + g.lean, g.shY + 1, g.r * 0.6, g.sh * 0.9, M.skin, Z.body);
  b.taper(g.shY, g.waistY, g.sh * 0.92, g.waist, CX + g.lean, M.skin, 'cyly', Z.body);

  wear.body(b, s, g);

  // ── руки ──
  for (const i of g.order) {
    const { sh: a0, elbow, hand: a2, z } = g.arm[i];
    b.limb(a0[0], a0[1], elbow[0], elbow[1], 4.6 * k * bw + 1, 3.4 * k * bw + 1, M.skin, z);
    b.limb(elbow[0], elbow[1], a2[0], a2[1], 3.6 * k * bw + 1, 2.8 * k * bw + 1, M.skin, z);
    wear.sleeve?.(b, g, i);
    hand(b, a2[0], a2[1], i ? 1 : -1, k * (0.6 + bw * 0.4), s.broad > 44 ? 1 : 0, z + 3);
  }

  head(b, s, v, CX + g.lean, g.top + g.r + p.head * 0.6 * k, g.r, p);

  if (v < 2) tail(b, CX + hip * 1.1, hipY, 1, tall * 0.19, s.tail, k, Z.tailFront);
}

/** павшая: тело на боку, разметавшаяся грива и лужа */
function heap(b: Paint, s: Skin, k: number): void {
  const u = s.tall / 100;
  const w = s.broad * (0.5 + k * 0.1);
  const h = s.tall * (0.17 - k * 0.035);
  const base = G - 2;
  const pw = w * (1.3 + k * 0.3);
  b.ellipse(CX, base, pw, (4 + k * 3) * u, M.blood, 'flat', Z.tailBack);
  for (const d of [0, 1]) {
    b.limb(CX + w * 0.2, base - h * 0.5 + d * 3 * u, CX + w + 11 * u, base - 1 + d * 1.5 * u, 7 * u, 5.5 * u, s.sockH > 0.3 ? M.sock : M.skin, Z.leg + d);
    b.ellipse(CX + w + 12 * u, base - 1 + d * 1.5 * u, 4 * u, 3 * u, M.boot, 'sphere', Z.leg + d + 1);
  }
  b.ellipse(CX + w * 0.35, base - h * 0.45, w * 0.66, h * 0.72, M.cloth, 'sphere', Z.wear);
  b.ellipse(CX - w * 0.25, base - h * 0.5, w * 0.52, h * 0.62, M.top, 'sphere', Z.wear + 1);
  b.limb(CX - w * 0.3, base - h * 0.72, CX - w - 8 * u, base - 2 * u, 5.5 * u, 4 * u, M.skin, Z.nearLimb);
  hand(b, CX - w - 9 * u, base - 2 * u, -1, u, 0, Z.nearLimb + 1);
  const hx = CX - w * 0.9;
  const hy = base - h * 0.82;
  const r = Math.max(4, s.tall * 0.095);
  b.ellipse(hx - 4 * u, hy + u, r * (1.4 + s.mane * 0.8), r * 1.05, M.hair, 'sphere', Z.hairBack);
  b.ellipse(hx, hy, r, r * 0.85, M.skin, 'sphere', Z.head);
  b.ellipse(hx - r * 0.2, hy - r * 0.5, r * 0.9, r * 0.5, M.hair, 'sphere', Z.head + 1);
  ear(b, hx - 3 * u, hy - r + 3 * u, -1, r * 1.15, Z.head + 2);
  ear(b, hx + 6 * u, hy - r + 4 * u, 1, r * 0.85, Z.head + 2);
  b.rect(px(hx + u), px(hy), px(4 * u), 1, M.dark, 'flat', Z.face);
  b.limb(CX + w * 0.5, base - 4 * u, CX + w + 16 * u, base - 7 * u, (3 + s.tail * 2) * u, 2, M.hair, Z.tailFront);
}

/** разрыв в клочья: лужа, ошмётки, косточки */
function gibs(b: Paint, s: Skin, k: number): void {
  const u = s.tall / 100;
  const base = G - 3;
  const r = Math.min(CX - 6, (15 + k * 8) * u);
  b.ellipse(CX, base, r * 1.1, (4 + k) * u, M.blood, 'flat', Z.body);
  const n = 12 + k * 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + k * 0.7;
    const d = r * (0.45 + ((i * 29) % 13) / 26);
    const x = CX + Math.cos(a) * d;
    const y = base - Math.abs(Math.sin(a)) * d * (0.8 - k * 0.2) - (6 - k * 1.5) * u;
    const sz = (2.6 + ((i * 17) % 3)) * u;
    b.ellipse(x, y, sz, sz, i % 3 === 0 ? M.cloth : M.blood, 'sphere', Z.wear + (i % 5));
    if (i % 4 === 0) b.ellipse(x, y - u, sz * 0.5, sz * 0.5, M.skin, 'sphere', Z.detail);
  }
  ear(b, CX - r + 7 * u, base - 7 * u, -1, 11 * u, Z.head);
  b.limb(CX + r * 0.5, base - 6 * u, CX + r - 3 * u, base - 2 * u, 7 * u, 3 * u, M.hair, Z.detail);
}

/**
 * Нарисованные кадры из public/art/foes/<id>/. Их собирает
 * tools/make-foe.mjs, список лежит в sprite.json рядом. Движок берёт
 * самый подходящий кадр: точный ракурс и позу, если есть; иначе ракурс
 * анфас; иначе позу покоя. Недостающую позу дорисовывает преобразованием
 * всего спрайта — покачивание, наклон, оседание, заваливание набок.
 *
 * Если нарисованных кадров нет вовсе, тварь рисует движок.
 */
interface Drawn {
  frames: Map<string, HTMLImageElement>;
}

const drawn = new Map<FoeId, Drawn>();
let started = false;

/** какой нарисованный кадр отвечает за эту позу */
function poseKey(p: PoseId): string {
  if (p === 'w1') return 'walk1';
  if (p === 'w2') return 'walk2';
  if (p === 'w3') return 'walk3';
  if (p === 'atk' || p === 'cast' || p === 'pain') return p;
  if (p === 'd0') return 'pain';
  if (p === 'd1' || p === 'd2') return 'die1';
  if (p === 'd3' || p === 'd4') return 'die2';
  return 'idle';
}

export function loadFoeArt(): void {
  if (started) return;
  started = true;
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  for (const id of FOE_IDS) {
    const dir = `${base}art/foes/${id}/`;
    fetch(`${dir}sprite.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((man: { frames: { file: string; view: number; pose: string }[] }) => {
        const d: Drawn = { frames: new Map() };
        drawn.set(id, d);
        for (const f of man.frames) {
          const img = new Image();
          img.onload = () => {
            d.frames.set(`${f.view}|${f.pose}`, img);
            // кадры, собранные до загрузки, пересчитываются заново
            cache.clear();
          };
          img.src = dir + f.file;
        }
      })
      .catch(() => {
        /* нарисованных кадров нет — рисуем сами */
      });
  }
}

/** ракурсы по близости к запрошенному: чем раньше, тем меньше разворот */
const NEAR = [
  [0, 1, 2, 3, 4],
  [1, 0, 2, 3, 4],
  [2, 1, 3, 0, 4],
  [3, 4, 2, 1, 0],
  [4, 3, 2, 1, 0],
];

/** ближайший нарисованный кадр и точна ли поза */
function pick(id: FoeId, view: number, pose: PoseId): { img: HTMLImageElement; exact: boolean } | null {
  const d = drawn.get(id);
  if (!d) return null;
  const near = NEAR[view] ?? NEAR[0];
  const key = poseKey(pose);
  if (key !== 'idle') {
    for (const v of near) {
      const hit = d.frames.get(`${v}|${key}`);
      if (hit) return { img: hit, exact: true };
    }
  }
  for (const v of near) {
    const idle = d.frames.get(`${v}|idle`);
    if (idle) return { img: idle, exact: key === 'idle' };
  }
  return null;
}

/** поза нарисованного кадра: без разрезки на части — преобразованием целиком */
function posed(img: HTMLImageElement, p: Pose, k: number, fallen: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = ART_W;
  c.height = ART_H;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  // опорная точка — середина подошв: от неё считаются и наклон, и оседание
  ctx.translate(ART_W / 2, ART_H - 1);
  if (fallen > 0) {
    // заваливается набок и съезжает к полу
    ctx.rotate((Math.PI / 2) * fallen);
    ctx.translate(ART_H * 0.28 * fallen, ART_W * 0.16 * fallen);
  }
  ctx.rotate(p.lean * 0.006);
  ctx.translate(0, -p.bob * k * 0.7);
  const sy = Math.max(0.12, p.squash);
  ctx.scale(1 + (1 - sy) * 0.35, sy);
  ctx.drawImage(img, -ART_W / 2, -(ART_H - 1));
  ctx.restore();
  return c;
}

const cache = new Map<string, HTMLCanvasElement>();

/**
 * Кадр твари: ракурс 0..4 (анфас, три четверти, профиль, три четверти
 * сзади, спина) и поза. Кадры собираются по требованию и оседают в кэше;
 * при переполнении он сбрасывается целиком — на этаже видно немного
 * тварей, и заполнить его заново дешевле, чем держать всё в памяти.
 */
export function foeSprite(id: FoeId, view: number, pose: PoseId, flip = false): HTMLCanvasElement {
  const key = `${id}|${view}|${pose}|${flip ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (cache.size > 260) cache.clear();
  const s = FOES[id].skin;
  const shot = pose[0] === 'g' ? null : pick(id, view, pose);
  let c: HTMLCanvasElement;
  if (shot) {
    // точный кадр берётся как есть; недостающую позу доигрываем сами
    const fall = shot.exact ? 0 : pose === 'd4' ? 1 : pose === 'd3' ? 0.9 : pose === 'd2' ? 0.55 : pose === 'd1' ? 0.2 : 0;
    const p = shot.exact ? posesFor(id).w0 : posesFor(id)[pose];
    c = posed(shot.img, p, s.tall / 100, fall);
  } else {
    const b = new Paint(ART_W, ART_H);
    if (pose[0] === 'g') gibs(b, s, Number(pose[1]));
    else if (pose === 'd3' || pose === 'd4') heap(b, s, pose === 'd4' ? 1 : 0);
    else figure(b, s, view, posesFor(id)[pose]);
    b.despeckle();
    c = b.render(mats(s), s.rim, view >= 3 ? -1 : 1);
  }
  if (flip) {
    const m = document.createElement('canvas');
    m.width = ART_W;
    m.height = ART_H;
    const ctx = m.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.translate(ART_W, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(c, 0, 0);
    }
    c = m;
  }
  cache.set(key, c);
  return c;
}

/**
 * Ракурс и отражение по углу между взглядом твари и направлением на
 * камеру — те же восемь секторов, что в Doom.
 */
export function viewFor(facing: number, toCam: number): [number, boolean] {
  let d = toCam - facing;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const oct = ((Math.round(d / (Math.PI / 4)) % 8) + 8) % 8;
  return oct <= 4 ? [oct, false] : [8 - oct, true];
}

/** высота фигуры в пикселях буфера — по ней считается размер билборда */
export function figSpan(id: FoeId): number {
  return FOES[id].skin.tall * 1.28;
}
