import { PixBuf } from './pixel';
import { FOES, type FoeId, type Outfit, type Skin } from './foes';

/**
 * Спрайты кошкодевочек: восемь ракурсов и полный набор кадров как в Doom —
 * шаг, замах, боль, смерть и разрыв в клочья.
 *
 * Фигура не рисуется покадрово, а собирается из скелета: поза задаёт стопы,
 * кисти, наклон и оседание, рисовальщик наращивает на это тело по четырём
 * обхватам (плечи, грудь, талия, бёдра), а сверху надевает наряд. Все
 * размеры считаются долями роста, поэтому мелкая и хозяйка этажа сложены
 * одинаково правильно.
 *
 * Наряды кроятся по-разному, а не перекрашиваются: лохмотья с голым плечом,
 * матроска, мантия с разрезом, повязки бойца, доспех, платье в пол.
 *
 * Ракурсов рисуется пять — анфас, три четверти, профиль, три четверти со
 * спины и спина. Остальные три получаются отражением, ровно как в оригинале.
 * Экран телефона плотнее монитора девяносто третьего года, поэтому буфер
 * заметно крупнее оригинальных спрайтов Doom.
 */

export const ART_W = 96;
export const ART_H = 168;
const CX = 48;
/** пол в буфере */
const G = 165;

/** имена кадров: w — фаза шага, d — смерть, g — разрыв */
export type PoseId =
  | 'w0' | 'w1' | 'w2' | 'w3'
  | 'atk' | 'cast' | 'pain'
  | 'd0' | 'd1' | 'd2' | 'd3' | 'd4'
  | 'g0' | 'g1' | 'g2' | 'g3';

/** Смещения позы заданы для роста в сто пикселей и масштабируются с ним. */
interface Pose {
  /** подъём таза */
  bob: number;
  /** наклон плеч вперёд */
  lean: number;
  /** стопы: сдвиг по X от бедра */
  foot: [number, number];
  /** подъём стопы над полом */
  rise: [number, number];
  /** кисти: сдвиг по X от плеча */
  hand: [number, number];
  /** кисти: высота относительно плеча, вниз положительная */
  drop: [number, number];
  /** сжатие фигуры по вертикали */
  squash: number;
  /** запрокидывание головы */
  head: number;
  /** пасть раскрыта */
  roar: number;
}

function walk(k: number): Pose {
  const ph = (k * Math.PI) / 2;
  const s = Math.sin(ph);
  const c = Math.cos(ph);
  return {
    bob: Math.abs(c) * 3 - 1.5,
    lean: 1.5,
    foot: [s * 10, -s * 10],
    rise: [Math.max(0, s * 7), Math.max(0, -s * 7)],
    hand: [-s * 5 - 4, s * 5 + 4],
    drop: [17 - Math.abs(s) * 3, 17 - Math.abs(s) * 3],
    squash: 1,
    head: 0,
    roar: 0,
  };
}

const POSES: Record<PoseId, Pose> = {
  w0: walk(0),
  w1: walk(1),
  w2: walk(2),
  w3: walk(3),
  // замах: корпус вперёд, когти занесены над головой
  atk: { bob: -1.5, lean: 6, foot: [-6, 7], rise: [0, 0], hand: [-17, 17], drop: [-13, -9], squash: 0.98, head: -1.5, roar: 1 },
  // бросок: одна рука выброшена вперёд, вторая отведена
  cast: { bob: 0, lean: 4.5, foot: [-4, 6], rise: [0, 0], hand: [-19, 10], drop: [-3, -12], squash: 1, head: -1.5, roar: 1 },
  // боль: отброшена назад, руки вскинуты
  pain: { bob: 1.5, lean: -6, foot: [4, -4], rise: [0, 1.5], hand: [-13, 13], drop: [-7, -6], squash: 0.96, head: 6, roar: 1 },
  d0: { bob: 0, lean: -7, foot: [6, -6], rise: [0, 3], hand: [-15, 15], drop: [-10, -9], squash: 0.9, head: 9, roar: 1 },
  d1: { bob: 0, lean: -4, foot: [10, -10], rise: [0, 0], hand: [-19, 18], drop: [0, -3], squash: 0.68, head: 9, roar: 1 },
  d2: { bob: 0, lean: 0, foot: [16, -16], rise: [0, 0], hand: [-24, 22], drop: [10, 7], squash: 0.44, head: 6, roar: 1 },
  d3: { bob: 0, lean: 0, foot: [21, -21], rise: [0, 0], hand: [-28, 27], drop: [18, 16], squash: 0.26, head: 3, roar: 0 },
  d4: { bob: 0, lean: 0, foot: [24, -24], rise: [0, 0], hand: [-31, 30], drop: [21, 19], squash: 0.19, head: 1.5, roar: 0 },
  g0: walk(0),
  g1: walk(0),
  g2: walk(0),
  g3: walk(0),
};

/** множитель ширины по ракурсу: профиль вдвое уже анфаса */
const BW = [1, 0.92, 0.6, 0.92, 1];
/** сдвиг лица к тому боку, куда повёрнута тварь, в долях головы */
const FACE = [0, 0.28, 0.55, 0, 0];
/** сколько глаз видно */
const EYES = [2, 2, 1, 0, 0];
/** насколько грива закрывает голову */
const BACK = [0.3, 0.55, 0.75, 1, 1];

/** индексы палитры */
const C = {
  clear: 0,
  line: 1,
  sk0: 2, sk1: 3, sk2: 4,
  hr0: 5, hr1: 6, hr2: 7,
  cl0: 8, cl1: 9, cl2: 10,
  trim: 11,
  eye: 12,
  cw0: 13, cw1: 14,
  bl0: 15, bl1: 16,
  ear: 17,
  bt0: 18, bt1: 19,
  rim: 20,
  tp0: 21, tp1: 22, tp2: 23,
  so0: 24, so1: 25,
  mt0: 26, mt1: 27,
  lite: 28,
} as const;

function palette(s: Skin): string[] {
  const p: string[] = [];
  p[C.clear] = '#00000000';
  p[C.line] = '#0a0812';
  p[C.sk0] = s.skin[0];
  p[C.sk1] = s.skin[1];
  p[C.sk2] = s.skin[2];
  p[C.hr0] = s.hair[0];
  p[C.hr1] = s.hair[1];
  p[C.hr2] = s.hair[2];
  p[C.cl0] = s.cloth[0];
  p[C.cl1] = s.cloth[1];
  p[C.cl2] = s.cloth[2];
  p[C.trim] = s.trim;
  p[C.eye] = s.eye;
  p[C.cw0] = s.claw[0];
  p[C.cw1] = s.claw[1];
  p[C.bl0] = '#4d0a10';
  p[C.bl1] = '#9c1119';
  p[C.ear] = s.ear;
  p[C.bt0] = s.boot[0];
  p[C.bt1] = s.boot[1];
  p[C.rim] = s.rim;
  p[C.tp0] = s.top[0];
  p[C.tp1] = s.top[1];
  p[C.tp2] = s.top[2];
  p[C.so0] = s.sock[0];
  p[C.so1] = s.sock[1];
  p[C.mt0] = s.metal[0];
  p[C.mt1] = s.metal[1];
  p[C.lite] = s.lite;
  return p;
}

const SKN = [C.sk2, C.sk1, C.sk0];
const SOK = [C.so1, C.so1, C.so0];
const TOP = [C.tp2, C.tp1, C.tp0];
const CLO = [C.cl2, C.cl1, C.cl0];
const MET = [C.mt1, C.mt0, C.line];
const BTS = [C.bt1, C.bt0, C.line];

/** мерки фигуры в пикселях буфера — на них опираются и тело, и наряд */
interface Geom {
  /** множитель ширины по ракурсу */
  bw: number;
  /** доля от роста в сто пикселей: ей кратны все мелкие размеры */
  k: number;
  v: number;
  cx: number;
  lean: number;
  tall: number;
  top: number;
  /** радиус головы */
  r: number;
  shY: number;
  bustY: number;
  waistY: number;
  hipY: number;
  /** полуширины: плечи, грудь, талия, бёдра */
  sh: number;
  bust: number;
  waist: number;
  hip: number;
  /** бедро, колено, стопа каждой ноги */
  joint: { hip: [number, number]; knee: [number, number]; foot: [number, number] }[];
  /** плечо, локоть, кисть каждой руки */
  arm: { sh: [number, number]; elbow: [number, number]; hand: [number, number] }[];
  /** порядок отрисовки конечностей: дальняя первой */
  order: number[];
}

const px = (v: number): number => Math.round(v);

/** конус уха с тёмным кантом и розовой изнанкой */
function ear(b: PixBuf, x: number, y: number, dir: 1 | -1, h: number, s: Skin): void {
  const w = h * 0.55;
  const tx = x + dir * h * 0.5;
  const ty = y - h;
  b.quad([[x - dir * w * 0.6, y + 4], [x + dir * w * 0.8, y + 3], [tx + dir * 2, ty - 2]], C.line);
  b.quad([[x - dir * w * 0.45, y + 3], [x + dir * w * 0.62, y + 2], [tx, ty + 1]], C.hr1);
  b.quad([[x + dir * w * 0.1, y + 2], [x + dir * w * 0.5, y + 1], [tx - dir, ty + 4]], C.ear);
  b.quad([[x - dir * w * 0.3, y + 2], [x, y + 1], [tx - dir * 3, ty + 4]], s.mane > 0.6 ? C.hr2 : C.hr1);
}

/** пушистый хвост дугой за спиной */
function tail(b: PixBuf, x: number, y: number, dir: 1 | -1, len: number, fluff: number, k: number): void {
  let ax = x;
  let ay = y;
  const n = 10;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const nx = x + dir * len * (0.25 + Math.sin(t * 2.4) * 0.75);
    const ny = y - len * (t * 0.9) + Math.sin(t * 2.8) * 3 * k;
    const w = (1.4 + fluff * 1.6) * Math.sqrt(k) * (0.7 + (1 - t) * 0.6);
    b.thickLine(ax, ay, nx, ny, w, w, [C.hr2, C.hr1, C.hr0]);
    ax = nx;
    ay = ny;
  }
  b.ellipse(px(ax), px(ay), px(2 * k), px(2 * k), C.hr2);
}

/** кисть: ладонь, три пальца и когти */
function hand(b: PixBuf, x: number, y: number, dir: 1 | -1, k: number, big: number): void {
  const r = 3 * k;
  b.ellipse(px(x), px(y), px(r), px(r * 1.05), C.sk1);
  b.ellipse(px(x - dir * 0.4), px(y - r * 0.35), px(r * 0.68), px(r * 0.7), C.sk2);
  for (let i = -1; i <= 1; i++) {
    const fy = y + i * r * 0.75;
    b.thickLine(x + dir * r * 0.4, fy, x + dir * r * 1.35, fy - r * 0.35, 2 * k, 1.6 * k, SKN);
    b.thickLine(x + dir * r * 1.25, fy - r * 0.3, x + dir * r * (1.75 + big * 0.35), fy - r * (0.6 + big * 0.25), 1.4 * k, 1, [C.cw1, C.cw0, C.cw0]);
  }
}

/** голова: грива, лицо, чёлка, уши, светящиеся глаза */
function head(b: PixBuf, s: Skin, v: number, hx: number, hy: number, r: number, p: Pose): void {
  const back = BACK[v];
  const fx = r * FACE[v];
  const mane = r * (0.2 + s.mane * 2.5);

  // затылок и пряди по бокам
  b.ellipse(px(hx - fx * 0.5), px(hy - r * 0.12), px(r * 1.1), px(r * 1.0), C.hr0);
  for (const d of [-1, 1] as const) {
    const x0 = hx + d * r * 0.8 - fx * 0.4;
    b.thickLine(x0, hy + r * 0.2, x0 - d * r * 0.2, hy + mane, r * 0.5, r * 0.26, [C.hr1, C.hr1, C.hr0]);
  }
  if (back > 0.7) b.taper(px(hy), px(hy + mane), px(r * 1.05), px(r * 0.75), px(hx), C.hr0);

  // уши
  const eh = r * 1.3;
  ear(b, hx - r * 0.6 + fx * 0.5, hy - r + r * 0.45, -1, eh, s);
  ear(b, hx + r * 0.66 + fx * 0.5, hy - r + r * 0.45, 1, eh, s);

  if (back >= 1) {
    // затылок: грива с бликом по макушке
    b.ellipse(px(hx), px(hy + r * 0.1), px(r * 0.9), px(r * 0.95), C.hr1);
    b.ellipse(px(hx - r * 0.15), px(hy - r * 0.2), px(r * 0.58), px(r * 0.55), C.hr2);
    return;
  }

  // лицо: лоб шире подбородка
  const cx = hx + fx;
  b.ellipse(px(cx), px(hy), px(r * 1.0), px(r * 1.04), C.sk1);
  b.ellipse(px(cx + r * 0.1), px(hy - r * 0.12), px(r * 0.74), px(r * 0.8), C.sk2);
  b.ellipse(px(cx), px(hy + r * 0.55), px(r * 0.58), px(r * 0.4), C.sk1);
  b.ellipse(px(cx - r * 0.55), px(hy + r * 0.25), px(r * 0.22), px(r * 0.2), C.sk0);

  // чёлка тремя клиньями, между ними виден лоб
  b.taper(px(hy - r * 1.1), px(hy - r * 0.55), px(r * 0.86), px(r * 1.02), px(cx - fx * 0.35), C.hr1);
  b.taper(px(hy - r), px(hy - r * 0.72), px(r * 0.6), px(r * 0.82), px(cx - fx * 0.35 - 1), C.hr2);
  for (let i = -1; i <= 1; i++) {
    const bx = cx + i * r * 0.6 - fx * 0.3;
    b.quad([
      [bx - r * 0.3, hy - r * 0.62],
      [bx + r * 0.3, hy - r * 0.62],
      [bx + (i > 0 ? r * 0.22 : -r * 0.22), hy - r * 0.24],
    ], C.hr1);
  }
  // боковые пряди вдоль щёк
  for (const d of [-1, 1] as const) {
    if (v >= 3 && d < 0) continue;
    if (v === 2 && d > 0) continue;
    b.thickLine(
      hx + d * r * 0.98 + fx * 0.3, hy - r * 0.6,
      hx + d * r * 1.05 + fx * 0.1, hy + r * (0.9 + s.mane * 1.4),
      r * 0.32, r * 0.2, [C.hr1, C.hr1, C.hr0],
    );
  }

  // глаза: ресница, белок, радужка, зрачок и блик
  const n = EYES[v];
  const ey = hy + r * 0.18;
  const gap = Math.max(3, r * 0.5);
  const ew = Math.max(2, px(r * 0.34));
  const eh2 = Math.max(2, px(r * 0.3));
  const xs = n === 2 ? [cx - gap, cx + gap] : n === 1 ? [cx + r * 0.24] : [];
  for (const exf of xs) {
    const ex = px(exf);
    const inner = ex < cx ? 1 : -1;
    b.rect(ex - ew, px(ey) - eh2, ew * 2, eh2 * 2 + 1, C.line);
    b.rect(ex - ew + 1, px(ey) - eh2 + 1, ew * 2 - 2, eh2 * 2 - 1, C.lite);
    b.rect(ex - ew + 1, px(ey) - eh2 + 1, ew * 2 - 2, 1, C.line);
    b.rect(ex - px(ew * 0.75), px(ey) - eh2 + 2, Math.max(2, px(ew * 1.5)), eh2 * 2 - 2, C.eye);
    b.rect(ex - px(ew * 0.2), px(ey) - eh2 + 3, Math.max(1, px(ew * 0.45)), Math.max(1, eh2 - 1), C.line);
    b.set(ex - px(ew * 0.6), px(ey) - eh2 + 2, C.lite);
    b.set(ex + inner * ew, px(ey) - eh2 + 1, C.line);
    // бровь
    b.rect(ex - ew, px(ey - r * 0.52), ew * 2, Math.max(1, px(r * 0.08)), C.hr0);
  }
  if (n > 0) {
    b.rect(px(cx + (n === 1 ? r * 0.2 : 0)), px(ey + r * 0.46), 1, 1, C.sk0);
    const my = px(ey + r * 0.62);
    if (p.roar > 0) {
      const mw = Math.max(2, px(r * 0.34));
      b.rect(px(cx) - mw, my, mw * 2, Math.max(3, px(r * 0.42)), C.line);
      b.rect(px(cx) - mw + 1, my + Math.max(1, px(r * 0.22)), mw * 2 - 2, Math.max(1, px(r * 0.18)), C.bl1);
      b.rect(px(cx) - mw + 1, my, 1, 2, C.cw1);
      b.rect(px(cx) + mw - 2, my, 1, 2, C.cw1);
      b.rect(px(cx) - 1, my + Math.max(2, px(r * 0.34)), 1, 2, C.cw1);
      b.rect(px(cx) + 1, my + Math.max(2, px(r * 0.34)), 1, 2, C.cw1);
    } else {
      b.rect(px(cx - r * 0.16), my, Math.max(2, px(r * 0.3)), 1, C.sk0);
    }
  }
}

/** ------- наряды ------- */

interface Wear {
  /** корпус и бёдра */
  body(b: PixBuf, s: Skin, g: Geom): void;
  /** плечо и предплечье */
  sleeve?(b: PixBuf, g: Geom, i: number): void;
  /** голень поверх чулка */
  leg?(b: PixBuf, g: Geom, i: number): void;
}

/** матросский воротник с платком */
function collar(b: PixBuf, g: Geom): void {
  const { cx, lean, shY, sh, r } = g;
  b.taper(px(shY - 1), px(shY + r * 0.75), px(sh), px(sh * 0.5), px(cx + lean), C.cl1);
  b.taper(px(shY - 1), px(shY + r * 0.9), px(sh * 0.9), px(sh * 0.3), px(cx + lean), C.cl0);
  b.rect(px(cx + lean - sh * 0.95), px(shY + r * 0.5), px(sh * 1.9), 1, C.lite);
  b.taper(px(shY - 1), px(shY + r * 0.55), px(sh * 0.42), 1, px(cx + lean), C.sk1);
  b.quad([
    [cx + lean - sh * 0.3, shY + r * 0.35],
    [cx + lean + sh * 0.3, shY + r * 0.35],
    [cx + lean, shY + r * 0.95],
  ], C.trim);
}

/** юбка в складку, расходится книзу */
function pleated(b: PixBuf, g: Geom, len: number, flare: number): void {
  const { cx, hipY, hip, tall } = g;
  const bot = hipY + tall * 0.13 * len;
  b.taper(px(hipY - 3), px(bot), px(hip * 0.9), px(hip * flare), px(cx), C.cl1);
  b.taper(px(hipY - 3), px(bot - 1), px(hip * 0.7), px(hip * flare * 0.66), px(cx - 1), C.cl2);
  for (let i = -2; i <= 2; i++) {
    const x = cx + i * hip * 0.55;
    b.thickLine(x, hipY - 2, x + i * hip * (flare - 0.9) * 0.5, bot - 1, 2, 2, [C.cl0, C.cl0, C.cl0]);
  }
  b.rect(px(cx - hip * flare), px(bot - 1), px(hip * flare * 2), 2, C.cl0);
}

/** голый живот между подолом верха и поясом */
function midriff(b: PixBuf, g: Geom, hem: number): void {
  const { cx, hipY, waist, hip } = g;
  b.taper(px(hem), px(hipY - 2), px(waist * 0.95), px(hip * 0.76), px(cx), C.sk1);
  b.taper(px(hem), px(hipY - 3), px(waist * 0.62), px(hip * 0.5), px(cx - 1), C.sk2);
  // подвздошные складки — по ним читается таз
  b.rect(px(cx - hip * 0.5), px(hipY - 5), px(hip * 0.24), 1, C.sk0);
  b.rect(px(cx + hip * 0.28), px(hipY - 5), px(hip * 0.24), 1, C.sk0);
}

/** грудь: два объёма с бликом и тень под ними */
function bustOf(b: PixBuf, g: Geom, ramp: number[], lit: number): void {
  const { cx, lean, bustY, bust: bu } = g;
  for (const d of [-1, 1] as const) {
    b.ellipse(px(cx + lean + d * bu * 0.45), px(bustY - 1), px(bu * 0.5), px(bu * 0.44), ramp[0]);
    b.ellipse(px(cx + lean + d * bu * 0.5), px(bustY - 2), px(bu * 0.32), px(bu * 0.28), lit);
    b.rect(px(cx + lean + d * bu * 0.9 - 1), px(bustY + bu * 0.3), 2, px(bu * 0.3), ramp[2]);
  }
  b.thickLine(cx + lean, bustY - 2, cx + lean, bustY + bu * 0.35, 2, 2, [ramp[2], ramp[2], ramp[2]]);
}

const WEAR: Record<Outfit, Wear> = {
  // ── лохмотья: одно плечо голое, рваный подол, верёвочный пояс ──
  rags: {
    body(b, _s, g) {
      const { cx, lean, shY, bustY, waistY, hipY, sh, waist, hip, tall } = g;
      bustOf(b, g, SKN, C.sk2);
      b.quad([
        [cx + lean - sh * 0.15, shY - 1],
        [cx + lean + sh, shY + tall * 0.02],
        [cx + waist * 1.1, waistY + tall * 0.05],
        [cx - waist * 1.1, waistY + tall * 0.05],
        [cx + lean - sh * 0.8, bustY],
      ], C.tp1);
      b.quad([
        [cx + lean - sh * 0.1, shY],
        [cx + lean + sh * 0.7, shY + tall * 0.03],
        [cx + waist * 0.5, waistY],
        [cx + lean - sh * 0.4, bustY + 1],
      ], C.tp2);
      // рваный подол
      const hem = waistY + tall * 0.05;
      for (let i = -3; i <= 3; i++) {
        const x = cx + i * waist * 0.36;
        b.quad([[x - waist * 0.2, hem - 2], [x + waist * 0.2, hem - 2], [x, hem + tall * (i % 2 ? 0.035 : 0.015)]], C.tp0);
      }
      midriff(b, g, hem + tall * 0.01);
      // набедренные лоскуты вместо юбки
      for (let i = -2; i <= 2; i++) {
        const x = cx + i * hip * 0.5;
        b.quad([
          [x - hip * 0.28, hipY - 2],
          [x + hip * 0.28, hipY - 2],
          [x + hip * 0.2, hipY + tall * (0.1 + (i % 2 ? 0.03 : 0))],
          [x - hip * 0.2, hipY + tall * (0.09 + (i % 2 ? 0.03 : 0))],
        ], i % 2 ? C.cl1 : C.cl0);
      }
      b.rect(px(cx - hip * 0.95), px(hipY - 4), px(hip * 1.9), 2, C.trim);
      b.ellipse(px(cx + hip * 0.3), px(hipY - 3), 2, 3, C.trim);
    },
    sleeve(b, g, i) {
      const [sx, sy] = g.arm[i].sh;
      const k = g.k;
      // рукав только на закрытом плече, на голом — наручная повязка
      if (i === 1) b.thickLine(sx, sy - 1, sx + 3 * k, sy + 5 * k, 9 * k, 7 * k, TOP);
      else b.thickLine(sx, sy + 2 * k, sx - 1, sy + 5 * k, 7 * k, 6 * k, [C.trim, C.trim, C.cl0]);
    },
    leg(b, g, i) {
      // обмотки на голени
      const { knee, foot } = g.joint[i];
      const k = g.k;
      for (let t = 0.25; t < 0.95; t += 0.22) {
        const x = knee[0] + (foot[0] - knee[0]) * t;
        const y = knee[1] + (foot[1] - knee[1]) * t;
        b.thickLine(x - 1, y, x + 1, y + 1.5 * k, 6 * k, 6 * k, [C.tp2, C.tp1, C.tp0]);
      }
    },
  },

  // ── матроска: воротник, платок, юбка в складку ──
  sailor: {
    body(b, s, g) {
      const { cx, lean, shY, bustY, waistY, hipY, sh, bust: bu, waist, hip } = g;
      b.taper(px(shY), px(bustY), px(sh), px(bu), px(cx + lean), C.tp1);
      b.taper(px(bustY), px(waistY), px(bu), px(waist), px(cx + lean * 0.6), C.tp1);
      b.taper(px(shY), px(bustY + 2), px(sh * 0.72), px(bu * 0.66), px(cx + lean - 1), C.tp2);
      bustOf(b, g, TOP, C.tp2);
      const hem = waistY + (hipY - waistY) * (1 - s.bare);
      b.taper(px(waistY), px(hem), px(waist), px(waist * 1.05), px(cx), C.tp1);
      b.ellipse(px(cx), px(hem - 1), px(waist * 1.05), 2, C.tp0);
      midriff(b, g, hem);
      pleated(b, g, s.skirt, 1.75);
      b.rect(px(cx - hip * 0.78), px(hipY - 3), px(hip * 1.56), 2, C.trim);
      collar(b, g);
    },
    sleeve(b, g, i) {
      const [sx, sy] = g.arm[i].sh;
      const k = g.k;
      b.thickLine(sx, sy - 1, sx + (i ? 1 : -1) * 3 * k, sy + 5 * k, 9 * k, 7 * k, TOP);
      b.rect(px(sx - 5 * k), px(sy + 5 * k), px(10 * k), 1, C.cl0);
    },
  },

  // ── мантия: глубокий вырез, разрез до бедра, широкие рукава ──
  robe: {
    body(b, s, g) {
      const { cx, lean, shY, bustY, waistY, hipY, sh, waist, hip, tall, r, k } = g;
      // облегающий низ под мантией
      b.taper(px(shY + r * 0.4), px(waistY), px(sh * 0.62), px(waist * 0.9), px(cx + lean), C.tp1);
      bustOf(b, g, TOP, C.tp2);
      b.taper(px(waistY), px(hipY + tall * 0.06), px(waist * 0.95), px(hip * 0.95), px(cx), C.tp0);
      midriff(b, g, waistY + (hipY - waistY) * (1 - s.bare));
      // полы мантии до икр, между ними разрез
      const bot = hipY + tall * 0.34;
      for (const d of [-1, 1] as const) {
        b.quad([
          [cx + lean + d * sh * 0.95, shY],
          [cx + lean + d * sh * 0.2, shY + r * 0.9],
          [cx + d * waist * 0.8, waistY],
          [cx + d * hip * 0.45, bot],
          [cx + d * hip * 1.1, bot],
          [cx + lean + d * sh * 1.15, bustY],
        ], d < 0 ? C.cl0 : C.cl1);
        b.thickLine(cx + lean + d * sh * 0.9, shY, cx + d * waist * 0.4, waistY - 2, 5 * k, 3 * k, [C.trim, C.trim, C.cl0]);
      }
      b.rect(px(cx - hip * 1.1), px(bot - 2), px(hip * 2.2), 2, C.cl0);
      // пояс с камнем
      b.rect(px(cx - waist * 1.1), px(waistY + 1), px(waist * 2.2), px(tall * 0.03), C.cl0);
      b.ellipse(px(cx), px(waistY + tall * 0.02), px(waist * 0.3), px(waist * 0.26), C.mt1);
      b.ellipse(px(cx), px(waistY + tall * 0.02), px(waist * 0.16), px(waist * 0.14), C.eye);
    },
    sleeve(b, g, i) {
      const [sx, sy] = g.arm[i].sh;
      const [ex, ey] = g.arm[i].elbow;
      const k = g.k;
      b.thickLine(sx, sy - 1, ex, ey, 8 * k, 6 * k, CLO);
      b.quad([
        [ex - 5 * k, ey - 3 * k],
        [ex + 5 * k, ey - 3 * k],
        [ex + 8 * k, ey + 9 * k],
        [ex - 8 * k, ey + 9 * k],
      ], C.cl0);
      b.rect(px(ex - 8 * k), px(ey + 8 * k), px(16 * k), 2, C.trim);
    },
  },

  // ── повязки бойца: лента через грудь, кожаный пояс, набедренные полосы ──
  wraps: {
    body(b, _s, g) {
      const { cx, lean, shY, bustY, waistY, hipY, sh, bust: bu, waist, hip, tall, k } = g;
      b.taper(px(shY), px(waistY), px(sh * 0.92), px(waist), px(cx + lean), C.sk1);
      b.taper(px(shY), px(bustY + 2), px(sh * 0.6), px(bu * 0.6), px(cx + lean - 1), C.sk2);
      bustOf(b, g, SKN, C.sk2);
      // рёбра и пресс
      for (let i = 0; i < 3; i++) {
        b.rect(px(cx - waist * 0.32), px(bustY + bu * 0.55 + i * tall * 0.035), px(waist * 0.64), 1, C.sk0);
      }
      // лента наискось
      b.thickLine(cx + lean - bu * 1.05, bustY - bu * 0.25, cx + lean + bu * 1.05, bustY + bu * 0.15, 9 * k, 9 * k, TOP);
      b.thickLine(cx + lean - bu * 1.05, bustY - bu * 0.25 + 5 * k, cx + lean + bu * 1.05, bustY + bu * 0.15 + 5 * k, 2, 2, [C.tp0, C.tp0, C.tp0]);
      bustOf(b, g, TOP, C.tp2);
      // широкий пояс с пряжкой
      b.taper(px(hipY - tall * 0.06), px(hipY), px(hip * 0.82), px(hip * 0.95), px(cx), C.cl1);
      b.rect(px(cx - hip * 0.95), px(hipY - tall * 0.06), px(hip * 1.9), 2, C.cl0);
      b.ellipse(px(cx), px(hipY - tall * 0.03), px(hip * 0.2), px(hip * 0.16), C.mt1);
      // набедренные полосы
      for (const d of [-1, 0, 1] as const) {
        b.quad([
          [cx + d * hip * 0.62 - hip * 0.3, hipY],
          [cx + d * hip * 0.62 + hip * 0.3, hipY],
          [cx + d * hip * 0.72 + hip * 0.26, hipY + tall * (d === 0 ? 0.13 : 0.1)],
          [cx + d * hip * 0.72 - hip * 0.26, hipY + tall * (d === 0 ? 0.13 : 0.1)],
        ], d === 0 ? C.cl1 : C.cl0);
      }
    },
    sleeve(b, g, i) {
      const [sx, sy] = g.arm[i].sh;
      const [ex, ey] = g.arm[i].elbow;
      const [hx, hy] = g.arm[i].hand;
      const k = g.k;
      // наплечник на одной стороне, наручи на обеих
      if (i === 1) {
        b.thickLine(sx, sy - 2 * k, sx + 2 * k, sy + 4 * k, 11 * k, 8 * k, MET);
        b.rect(px(sx - 5 * k), px(sy + 3 * k), px(10 * k), 1, C.mt0);
      }
      b.thickLine((ex + hx) / 2, (ey + hy) / 2, hx, hy, 6 * k, 5 * k, [C.tp2, C.tp1, C.tp0]);
    },
    leg(b, g, i) {
      const { knee } = g.joint[i];
      const k = g.k;
      b.thickLine(knee[0] - 1, knee[1], knee[0] + 1, knee[1] + 2 * k, 8 * k, 8 * k, [C.tp2, C.tp1, C.tp0]);
    },
  },

  // ── доспех: кираса, горжет, наплечники, птеруги, поножи ──
  armor: {
    body(b, s, g) {
      const { cx, lean, shY, bustY, waistY, hipY, sh, bust: bu, waist, hip, tall, k, r } = g;
      b.taper(px(shY), px(bustY), px(sh), px(bu), px(cx + lean), C.tp1);
      b.taper(px(bustY), px(waistY), px(bu), px(waist), px(cx + lean * 0.6), C.tp1);
      bustOf(b, g, TOP, C.mt1);
      for (let i = 0; i < 3; i++) {
        b.rect(px(cx + lean - bu * 0.7), px(bustY + bu * 0.5 + i * tall * 0.03), px(bu * 1.4), 1, C.tp0);
      }
      b.taper(px(shY - 2), px(shY + r * 0.4), px(sh * 0.5), px(sh * 0.8), px(cx + lean), C.mt0);
      b.rect(px(cx + lean - sh * 0.5), px(shY - 2), px(sh), 1, C.mt1);
      midriff(b, g, waistY + (hipY - waistY) * (1 - s.bare));
      // птеруги
      for (let i = -2; i <= 2; i++) {
        const x = cx + i * hip * 0.48;
        const bot = hipY + tall * (0.13 - Math.abs(i) * 0.012);
        b.quad([
          [x - hip * 0.2, hipY - 3],
          [x + hip * 0.2, hipY - 3],
          [x + hip * 0.22, bot],
          [x - hip * 0.22, bot],
        ], i % 2 ? C.cl0 : C.cl2);
        b.rect(px(x - hip * 0.22), px(bot - 2), px(hip * 0.44), 2, C.mt0);
        b.rect(px(x - hip * 0.2), px(hipY - 1), 1, px(bot - hipY), C.mt1);
      }
      b.rect(px(cx - hip * 0.98), px(hipY - 5), px(hip * 1.96), px(3 * k), C.mt0);
      b.rect(px(cx - hip * 0.98), px(hipY - 5), px(hip * 1.96), 1, C.mt1);
    },
    sleeve(b, g, i) {
      const [sx, sy] = g.arm[i].sh;
      const [ex, ey] = g.arm[i].elbow;
      const [hx, hy] = g.arm[i].hand;
      const k = g.k;
      b.thickLine(sx, sy - 2 * k, sx + (i ? 2 : -2) * k, sy + 4 * k, 9 * k, 7 * k, [C.mt0, C.mt0, C.line]);
      b.rect(px(sx - 4.5 * k), px(sy - 2 * k), px(9 * k), 1, C.mt1);
      b.thickLine((ex + hx) / 2, (ey + hy) / 2, hx, hy, 5 * k, 4 * k, [C.mt0, C.mt0, C.line]);
    },
    leg(b, g, i) {
      const { knee, foot } = g.joint[i];
      const k = g.k;
      b.thickLine(knee[0], knee[1] + 2 * k, foot[0], foot[1] - 4 * k, 6 * k, 5 * k, [C.mt0, C.mt0, C.line]);
      b.thickLine(knee[0] - 1, knee[1], knee[0] + 1, knee[1] + 2 * k, 7 * k, 7 * k, MET);
    },
  },

  // ── платье в пол с разрезом, воротник-стойка, шнуровка ──
  gown: {
    body(b, _s, g) {
      const { cx, lean, shY, bustY, waistY, hipY, sh, bust: bu, waist, hip, tall, k, r } = g;
      b.taper(px(shY), px(bustY), px(sh), px(bu), px(cx + lean), C.tp1);
      b.taper(px(bustY), px(waistY), px(bu), px(waist), px(cx + lean * 0.6), C.tp1);
      b.taper(px(shY), px(bustY + 2), px(sh * 0.7), px(bu * 0.62), px(cx + lean - 1), C.tp2);
      bustOf(b, g, TOP, C.tp2);
      // глубокий вырез
      b.quad([
        [cx + lean - bu * 0.5, shY],
        [cx + lean + bu * 0.5, shY],
        [cx + lean, bustY + bu * 0.45],
      ], C.sk1);
      // шнуровка корсета
      for (let i = 0; i < 4; i++) {
        b.rect(px(cx + lean - waist * 0.4), px(bustY + bu * 0.5 + i * tall * 0.028), px(waist * 0.8), 1, C.trim);
      }
      // подол до пола с разрезом на одну ногу
      const bot = G - tall * 0.02;
      b.quad([
        [cx - waist * 1.05, waistY],
        [cx + waist * 1.05, waistY],
        [cx + hip * 1.15, bot],
        [cx + hip * 0.15, bot],
        [cx + hip * 0.08, hipY + tall * 0.12],
        [cx - hip * 0.3, hipY + tall * 0.2],
        [cx - hip * 1.15, bot],
      ], C.cl1);
      b.quad([
        [cx - waist * 0.7, waistY + 2],
        [cx + waist * 0.2, waistY + 2],
        [cx - hip * 0.4, hipY + tall * 0.22],
        [cx - hip * 0.85, bot - 2],
      ], C.cl2);
      b.rect(px(cx - hip * 1.15), px(bot - 2), px(hip * 2.3), 2, C.cl0);
      b.rect(px(cx - waist * 1.05), px(waistY), px(waist * 2.1), px(3 * k), C.trim);
      // воротник-стойка
      b.taper(px(shY - r * 0.7), px(shY + r * 0.3), px(sh * 0.55), px(sh * 1.05), px(cx + lean), C.cl0);
      b.taper(px(shY - r * 0.7), px(shY - r * 0.2), px(sh * 0.5), px(sh * 0.75), px(cx + lean), C.trim);
      b.taper(px(shY - r * 0.62), px(shY - r * 0.25), px(sh * 0.34), px(sh * 0.5), px(cx + lean), C.cl0);
    },
    sleeve(b, g, i) {
      const [sx, sy] = g.arm[i].sh;
      const [ex, ey] = g.arm[i].elbow;
      const [hx, hy] = g.arm[i].hand;
      const k = g.k;
      b.thickLine(sx, sy - 1, ex, ey, 9 * k, 6 * k, CLO);
      b.thickLine(ex, ey, hx, hy, 6 * k, 5 * k, CLO);
      b.quad([
        [hx - 4 * k, hy - 5 * k],
        [hx + 4 * k, hy - 5 * k],
        [hx + 6 * k, hy + 2 * k],
        [hx - 6 * k, hy + 2 * k],
      ], C.cl0);
      b.rect(px(hx - 6 * k), px(hy + k), px(12 * k), 1, C.trim);
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
  const hip = wide(0.96);
  const hipY = top + tall * 0.52;
  const sh = wide(0.8);

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
    };
  });

  const arm = [0, 1].map((i) => {
    const d = i ? 1 : -1;
    const sx = CX + d * (sh - 1) + lean;
    const sy = shY + tall * 0.02;
    const hx = sx + p.hand[i] * k * bw;
    const hy = sy + p.drop[i] * k;
    return {
      sh: [sx, sy] as [number, number],
      elbow: [(sx + hx) / 2 + d * 2, (sy + hy) / 2 + 1] as [number, number],
      hand: [hx, hy] as [number, number],
    };
  });

  return {
    bw, k, v, cx: CX, lean, tall, top, r,
    shY,
    bustY: shY + tall * 0.1,
    waistY: top + tall * 0.44,
    hipY,
    sh,
    bust: wide(0.84),
    waist: wide(0.52),
    hip,
    joint,
    arm,
    order: v >= 3 ? [1, 0] : [0, 1],
  };
}

/** стоящая фигура: ноги, тело, наряд, руки, голова, хвост */
function figure(b: PixBuf, s: Skin, v: number, p: Pose): void {
  const g = measure(s, v, p);
  const { k, bw, tall, hipY, hip } = g;
  const wear = WEAR[s.outfit];

  if (v >= 2) tail(b, CX - hip * 0.95, hipY - 2, -1, tall * 0.2, s.tail, k);

  // ── ноги ──
  for (const i of g.order) {
    const { hip: h, knee, foot } = g.joint[i];
    const thigh = 6.2 * k * bw + 1;
    const shin = 4.2 * k * bw + 1;
    b.thickLine(h[0], h[1], knee[0], knee[1], thigh, shin + 1, SKN);
    b.thickLine(knee[0], knee[1], foot[0], foot[1] - 4 * k, shin + 1, shin, SKN);
    if (s.sockH > 0.05) {
      const t = Math.min(1, s.sockH);
      const sx = h[0] + (knee[0] - h[0]) * (1 - t);
      const sy = h[1] + (knee[1] - h[1]) * (1 - t);
      b.thickLine(sx, sy, knee[0], knee[1], thigh - (1 - t) * 2, shin + 1, SOK);
      b.thickLine(knee[0], knee[1], foot[0], foot[1] - 4 * k, shin + 1, shin, SOK);
      b.thickLine(sx - 1, sy, sx + 1, sy + 1, thigh + 1, thigh + 1, [C.so1, C.so1, C.so1]);
    }
    wear.leg?.(b, g, i);
    // сапог с каблуком
    b.thickLine((knee[0] + foot[0]) / 2, (knee[1] + foot[1]) / 2, foot[0], foot[1] - 3 * k, shin + 2, shin + 1, BTS);
    b.rect(px(foot[0] - 3 * k * bw - 1), px(foot[1] - 4 * k), px(6 * k * bw + 3), px(4 * k), C.bt0);
    b.rect(px(foot[0] - 3 * k * bw - 1), px(foot[1] - 4 * k), px(6 * k * bw + 3), 1, C.bt1);
    b.rect(px(foot[0] - 1), px(foot[1] - 2 * k), px(3 * k), px(2 * k), C.line);
  }

  // ── тело под нарядом ──
  b.taper(px(g.shY - g.r * 0.45), px(g.shY + 1), px(g.r * 0.38), px(g.sh * 0.46), px(CX + g.lean), C.sk1);
  b.taper(px(g.shY), px(g.waistY), px(g.sh * 0.92), px(g.waist), px(CX + g.lean), C.sk1);

  wear.body(b, s, g);

  // ── руки ──
  for (const i of g.order) {
    const { sh: a0, elbow, hand: a2 } = g.arm[i];
    const far = i === g.order[0] && v !== 0;
    b.thickLine(a0[0], a0[1], elbow[0], elbow[1], 5 * k * bw + 1, 3.6 * k * bw + 1, far ? [C.sk1, C.sk0, C.sk0] : SKN);
    b.thickLine(elbow[0], elbow[1], a2[0], a2[1], 3.6 * k * bw + 1, 2.8 * k * bw + 1, SKN);
    wear.sleeve?.(b, g, i);
    hand(b, a2[0], a2[1], i ? 1 : -1, k * (0.6 + bw * 0.4), s.broad > 36 ? 1 : 0);
  }

  head(b, s, v, CX + g.lean, g.top + g.r + p.head * 0.6 * k, g.r, p);

  if (v < 2) tail(b, CX + hip * 1.1, hipY, 1, tall * 0.19, s.tail, k);
}

/** павшая: тело на боку, разметавшаяся грива и лужа */
function heap(b: PixBuf, s: Skin, k: number): void {
  const u = s.tall / 100;
  const w = s.broad * (0.55 + k * 0.1);
  const h = s.tall * (0.17 - k * 0.035);
  const base = G - 2;
  const pw = w * (1.3 + k * 0.3);
  b.ellipse(CX, base, px(pw), px((4 + k * 3) * u), C.bl0);
  b.ellipse(px(CX - 3 * u), base - 1, px(pw * 0.7), px((2.5 + k * 2) * u), C.bl1);
  for (const d of [0, 1]) {
    b.thickLine(CX + w * 0.2, base - h * 0.5 + d * 3 * u, CX + w + 11 * u, base - 1 + d * 1.5 * u, 7 * u, 5.5 * u, s.sockH > 0.3 ? SOK : SKN);
    b.rect(px(CX + w + 9 * u), px(base - 3 * u + d * 1.5 * u), px(7 * u), px(4 * u), C.bt0);
  }
  b.ellipse(px(CX + w * 0.35), px(base - h * 0.45), px(w * 0.66), px(h * 0.72), C.cl1);
  b.ellipse(px(CX + w * 0.3), px(base - h * 0.62), px(w * 0.48), px(h * 0.5), C.cl2);
  b.ellipse(px(CX - w * 0.25), px(base - h * 0.5), px(w * 0.52), px(h * 0.62), C.tp1);
  b.ellipse(px(CX - w * 0.32), px(base - h * 0.68), px(w * 0.36), px(h * 0.42), C.tp2);
  b.rect(px(CX - 1), px(base - h * 0.78), px(2 * u), px(h * 0.5), C.trim);
  b.thickLine(CX - w * 0.3, base - h * 0.72, CX - w - 8 * u, base - 2 * u, 5.5 * u, 4 * u, SKN);
  hand(b, CX - w - 9 * u, base - 2 * u, -1, u, 0);
  // голова набок
  const hx = CX - w * 0.9;
  const hy = base - h * 0.82;
  const r = Math.max(4, s.tall * 0.095);
  b.ellipse(px(hx - 4 * u), px(hy + u), px(r * (1.4 + s.mane * 0.8)), px(r * 1.05), C.hr0);
  b.ellipse(px(hx), px(hy), px(r), px(r * 0.85), C.sk1);
  b.ellipse(px(hx), px(hy - u), px(r * 0.7), px(r * 0.6), C.sk2);
  b.taper(px(hy - r), px(hy), px(r * 0.85), px(r), px(hx - 1), C.hr1);
  ear(b, hx - 3 * u, hy - r + 3 * u, -1, r * 1.15, s);
  ear(b, hx + 6 * u, hy - r + 4 * u, 1, r * 0.85, s);
  b.rect(px(hx + u), px(hy), px(4 * u), 1, C.line);
  b.thickLine(CX + w * 0.5, base - 4 * u, CX + w + 16 * u, base - 7 * u, (3 + s.tail * 2) * u, 2, [C.hr1, C.hr1, C.hr0]);
}

/** разрыв в клочья: лужа, ошмётки, косточки */
function gibs(b: PixBuf, s: Skin, k: number): void {
  const u = s.tall / 100;
  const base = G - 3;
  const r = Math.min(CX - 6, (15 + k * 8) * u);
  b.ellipse(CX, base, px(r * 1.1), px(4 * u + k * u), C.bl0);
  b.ellipse(px(CX - 3 * u), base - 1, px(r * 0.7), px(3 * u + k * u), C.bl1);
  const n = 12 + k * 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + k * 0.7;
    const d = r * (0.45 + ((i * 29) % 13) / 26);
    const x = CX + Math.cos(a) * d;
    const y = base - Math.abs(Math.sin(a)) * d * (0.8 - k * 0.2) - (6 - k * 1.5) * u;
    const sz = (2.5 + ((i * 17) % 3)) * u;
    b.ellipse(px(x), px(y), px(sz), px(sz), i % 3 === 0 ? C.cl1 : C.bl1);
    b.ellipse(px(x), px(y - u), px(Math.max(1, sz - u)), px(Math.max(1, sz - u)), i % 3 === 0 ? C.cl2 : C.bl0);
    if (i % 4 === 0) b.ellipse(px(x), px(y), px(u), px(u), C.sk1);
  }
  // уцелевшее ухо и клок гривы — по ним ясно, кого разорвало
  ear(b, CX - r + 7 * u, base - 7 * u, -1, 11 * u, s);
  b.thickLine(CX + r * 0.5, base - 6 * u, CX + r - 3 * u, base - 2 * u, 7 * u, 3 * u, [C.hr1, C.hr1, C.hr0]);
}

const cache = new Map<string, HTMLCanvasElement>();

/**
 * Кадр твари: ракурс 0..4 (анфас, три четверти, профиль, три четверти
 * сзади, спина) и поза. Кадры собираются по требованию и оседают в кэше;
 * при переполнении он сбрасывается целиком — на этаже видно немного тварей,
 * и заполнить его заново дешевле, чем держать в памяти всё нарисованное.
 */
export function foeSprite(id: FoeId, view: number, pose: PoseId, flip = false): HTMLCanvasElement {
  const key = `${id}|${view}|${pose}|${flip ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (cache.size > 320) cache.clear();
  const s = FOES[id].skin;
  const b = new PixBuf(ART_W, ART_H);
  if (pose[0] === 'g') gibs(b, s, Number(pose[1]));
  else if (pose === 'd3' || pose === 'd4') heap(b, s, pose === 'd4' ? 1 : 0);
  else figure(b, s, view, POSES[pose]);
  b.rim(C.rim, view >= 3 ? -1 : 1);
  b.outline(C.line);
  let c = b.toCanvas(palette(s));
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
