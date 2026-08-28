import { PixBuf } from './pixel';
import { FOES, type FoeId, type Skin } from './foes';

/**
 * Спрайты кошкодевочек: восемь ракурсов и полный набор кадров как в Doom —
 * шаг, замах, боль, смерть и разрыв в клочья.
 *
 * Фигура не нарисована покадрово, а собирается из скелета: поза задаёт
 * положение стоп, кистей, наклон и оседание, а рисовальщик наращивает на
 * это тело. Поэтому шесть разных тварей стоят одинаково ровно, а кадров
 * получается сколько нужно, не считая их вручную.
 *
 * Ракурсов рисуется пять — анфас, три четверти, профиль, три четверти
 * со спины и спина. Остальные три получаются отражением, ровно как в
 * оригинале.
 */

export const ART_W = 64;
export const ART_H = 112;
const CX = 32;
/** пол в буфере */
const G = 110;

/** имена кадров: k — фаза шага, d — смерть, g — разрыв */
export type PoseId =
  | 'w0' | 'w1' | 'w2' | 'w3'
  | 'atk' | 'cast' | 'pain'
  | 'd0' | 'd1' | 'd2' | 'd3' | 'd4'
  | 'g0' | 'g1' | 'g2' | 'g3';

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
    bob: Math.round(Math.abs(c) * 2) - 1,
    lean: 1,
    foot: [Math.round(s * 7), Math.round(-s * 7)],
    rise: [Math.max(0, Math.round(s * 5)), Math.max(0, Math.round(-s * 5))],
    hand: [Math.round(-s * 4) - 6, Math.round(s * 4) + 6],
    drop: [10 - Math.round(Math.abs(s) * 2), 10 - Math.round(Math.abs(s) * 2)],
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
  atk: { bob: -1, lean: 4, foot: [-4, 5], rise: [0, 0], hand: [-11, 11], drop: [-9, -6], squash: 0.98, head: -1, roar: 1 },
  // бросок: одна рука выброшена вперёд, вторая отведена
  cast: { bob: 0, lean: 3, foot: [-3, 4], rise: [0, 0], hand: [-13, 7], drop: [-2, -8], squash: 1, head: -1, roar: 1 },
  // боль: отброшена назад, руки вскинуты
  pain: { bob: 1, lean: -4, foot: [3, -3], rise: [0, 1], hand: [-9, 9], drop: [-5, -4], squash: 0.96, head: 4, roar: 1 },
  d0: { bob: 0, lean: -5, foot: [4, -4], rise: [0, 2], hand: [-10, 10], drop: [-7, -6], squash: 0.9, head: 6, roar: 1 },
  d1: { bob: 0, lean: -3, foot: [7, -7], rise: [0, 0], hand: [-13, 12], drop: [0, -2], squash: 0.68, head: 6, roar: 1 },
  d2: { bob: 0, lean: 0, foot: [11, -11], rise: [0, 0], hand: [-16, 15], drop: [7, 5], squash: 0.44, head: 4, roar: 1 },
  d3: { bob: 0, lean: 0, foot: [14, -14], rise: [0, 0], hand: [-19, 18], drop: [12, 11], squash: 0.26, head: 2, roar: 0 },
  d4: { bob: 0, lean: 0, foot: [16, -16], rise: [0, 0], hand: [-21, 20], drop: [14, 13], squash: 0.19, head: 1, roar: 0 },
  g0: walk(0),
  g1: walk(0),
  g2: walk(0),
  g3: walk(0),
};

/** множитель ширины по ракурсу: профиль вдвое уже анфаса */
const BW = [1, 0.92, 0.6, 0.92, 1];
/** сдвиг лица к тому боку, куда повёрнута тварь */
const FACE = [0, 3, 6, 0, 0];
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
  return p;
}

const SKN = [C.sk2, C.sk1, C.sk0];
const SOK = [C.so1, C.so1, C.so0];
const BTS = [C.bt1, C.bt0, C.line];

/** конус уха с тёмным кантом и розовой изнанкой */
function ear(b: PixBuf, x: number, y: number, dir: 1 | -1, h: number, s: Skin): void {
  const tx = x + dir * Math.round(h * 0.5);
  const ty = y - h;
  b.quad([[x - dir * 4, y + 3], [x + dir * 5, y + 2], [tx + dir, ty - 1]], C.line);
  b.quad([[x - dir * 3, y + 2], [x + dir * 4, y + 1], [tx, ty + 1]], C.hr1);
  b.quad([[x + dir * 1, y + 1], [x + dir * 3, y], [tx, ty + 3]], C.ear);
  b.quad([[x - dir * 2, y + 1], [x - dir * 0, y], [tx - dir * 2, ty + 3]], s.mane > 0.6 ? C.hr2 : C.hr1);
}

/** пушистый хвост дугой за спиной */
function tail(b: PixBuf, x: number, y: number, dir: 1 | -1, len: number, fluff: number): void {
  let px = x;
  let py = y;
  const n = 8;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    // дуга вверх и наружу, к кончику сужается
    const nx = x + dir * len * (0.25 + Math.sin(t * 2.4) * 0.75);
    const ny = y - len * (t * 0.9) + Math.sin(t * 2.8) * 2;
    const w = (1.1 + fluff * 1.5) * (0.7 + (1 - t) * 0.6);
    b.thickLine(px, py, nx, ny, w, w, [C.hr2, C.hr1, C.hr0]);
    px = nx;
    py = ny;
  }
  b.ellipse(Math.round(px), Math.round(py), 2, 2, C.hr2);
}

/** голова: грива, лицо, чёлка, уши, светящиеся глаза */
function head(b: PixBuf, s: Skin, v: number, hx: number, hy: number, r: number, p: Pose): void {
  const back = BACK[v];
  const fx = FACE[v];
  const mane = Math.round(r * (0.2 + s.mane * 2.5));

  // затылок
  b.ellipse(hx - Math.round(fx * 0.5), hy + 1, Math.round(r * 1.06), Math.round(r * 1.08), C.hr0);
  // две пряди по бокам: между ними виден наряд
  for (const d of [-1, 1] as const) {
    const x0 = hx + d * Math.round(r * 0.85) - Math.round(fx * 0.4);
    b.thickLine(x0, hy + Math.round(r * 0.2), x0 - d, hy + mane, r * 0.62, r * 0.3, [C.hr1, C.hr1, C.hr0]);
  }
  if (back > 0.7) b.taper(hy, hy + mane, Math.round(r * 1.05), Math.round(r * 0.75), hx, C.hr0);

  // уши
  const eh = Math.round(r * 1.3);
  ear(b, hx - Math.round(r * 0.6) + Math.round(fx * 0.5), hy - r + 4, -1, eh, s);
  ear(b, hx + Math.round(r * 0.66) + Math.round(fx * 0.5), hy - r + 4, 1, eh, s);

  if (back >= 1) {
    // затылок: только грива и уши
    b.ellipse(hx, hy + 1, Math.round(r * 0.9), Math.round(r * 0.95), C.hr1);
    b.ellipse(hx - 1, hy - 1, Math.round(r * 0.6), Math.round(r * 0.6), C.hr2);
    return;
  }

  // лицо
  const cx = hx + fx;
  b.ellipse(cx, hy, Math.round(r * 0.95), Math.round(r * 1.02), C.sk1);
  b.ellipse(cx + 1, hy - 1, Math.round(r * 0.74), Math.round(r * 0.8), C.sk2);
  b.ellipse(cx, hy + Math.round(r * 0.55), Math.round(r * 0.58), Math.round(r * 0.4), C.sk1);
  b.ellipse(cx - Math.round(r * 0.5), hy + Math.round(r * 0.2), 2, 2, C.sk0);

  // чёлка: рваные пряди по лбу
  b.taper(hy - r - 1, hy - Math.round(r * 0.42), Math.round(r * 0.9), Math.round(r * 1.04), cx - Math.round(fx * 0.35), C.hr1);
  b.taper(hy - r, hy - Math.round(r * 0.62), Math.round(r * 0.62), Math.round(r * 0.84), cx - Math.round(fx * 0.35) - 1, C.hr2);
  // три клина чёлки, между ними видно лоб
  for (let i = -1; i <= 1; i++) {
    const px = cx + i * Math.round(r * 0.6) - Math.round(fx * 0.3);
    b.quad([[px - 3, hy - Math.round(r * 0.5)], [px + 3, hy - Math.round(r * 0.5)], [px + (i > 0 ? 2 : -2), hy - Math.round(r * 0.1)]], C.hr1);
  }
  // боковые пряди вдоль щёк
  for (const d of [-1, 1] as const) {
    if (v >= 3 && d < 0) continue;
    if (v === 2 && d > 0) continue;
    b.thickLine(
      hx + d * Math.round(r * 0.95) + Math.round(fx * 0.3), hy - Math.round(r * 0.55),
      hx + d * Math.round(r * 0.75) + Math.round(fx * 0.1), hy + Math.round(r * (0.9 + s.mane * 1.4)),
      3, 2, [C.hr1, C.hr1, C.hr0],
    );
  }

  // глаза: тёмная оправа, белок, светящаяся радужка
  const n = EYES[v];
  const ey = hy + Math.round(r * 0.18);
  const gap = Math.max(3, Math.round(r * 0.5));
  const xs = n === 2 ? [cx - gap, cx + gap] : n === 1 ? [cx + Math.round(r * 0.24)] : [];
  for (const ex of xs) {
    const inner = ex < cx ? 1 : -1;
    b.rect(ex - 2, ey - 1, 4, 3, C.line);
    b.rect(ex - 1, ey, 3, 2, C.eye);
    b.set(ex + inner, ey - 1, C.eye);
    // веко нависает с внутренней стороны — взгляд исподлобья
    b.set(ex - inner * 2, ey, C.line);
    b.set(ex, ey + 1, C.line);
  }
  if (n > 0) {
    // нос и пасть
    b.set(cx + (n === 1 ? 2 : 0), ey + Math.round(r * 0.46), C.sk0);
    const my = ey + Math.round(r * 0.62);
    if (p.roar > 0) {
      b.rect(cx - 3, my, 6, 4, C.line);
      b.rect(cx - 2, my + 2, 4, 2, C.bl1);
      b.set(cx - 2, my, C.cw1);
      b.set(cx + 2, my, C.cw1);
      b.set(cx - 1, my + 3, C.cw1);
      b.set(cx + 1, my + 3, C.cw1);
    } else {
      b.rect(cx - 1, my, 3, 1, C.sk0);
    }
  }
}

/** когти на кисти */
function claws(b: PixBuf, x: number, y: number, dir: 1 | -1, big: number): void {
  b.ellipse(x, y, 3, 3, C.sk1);
  b.ellipse(x, y - 1, 2, 2, C.sk2);
  for (let i = -1; i <= 1; i++) {
    b.set(x + dir * 3, y + i * 2 - 1, C.cw0);
    b.set(x + dir * (3 + big), y + i * 2 - 2, C.cw1);
    if (big) b.set(x + dir * 4, y + i * 2 - 3, C.cw1);
  }
}

/**
 * Стоящая фигура. Силуэт строится по четырём обхватам — плечи, грудь,
 * талия, бёдра, — поэтому получается песочные часы, а не прямоугольник.
 * Наряд по образцу школьной формы: матроска с воротником и платком,
 * короткая юбка в складку, чулки выше колена.
 */
function figure(b: PixBuf, s: Skin, v: number, p: Pose): void {
  const bw = BW[v];
  const tall = Math.max(14, Math.round(s.tall * p.squash));
  const top = G - tall;
  const r = Math.max(4, Math.round(s.tall * 0.105 * (0.55 + 0.45 * p.squash)));
  const lean = p.lean;

  const shY = top + r * 2 + 2 - p.bob;
  const bustY = shY + Math.round(tall * 0.1);
  const waistY = top + Math.round(tall * 0.44);
  const hipY = top + Math.round(tall * 0.52);

  const wide = (k: number): number => Math.max(2, Math.round(s.broad * k * bw));
  const shHalf = wide(0.4);
  const bustHalf = wide(0.42);
  const waistHalf = wide(0.26);
  const hipHalf = wide(0.48);

  // хвост позади корпуса
  if (v >= 2) tail(b, CX - Math.round(hipHalf * 0.95), hipY - 2, -1, Math.round(s.tall * 0.26), s.tail);

  // ── ноги ──
  const legs: [number, number][] = [
    [CX - Math.round(hipHalf * 0.5), hipY + 2],
    [CX + Math.round(hipHalf * 0.5), hipY + 2],
  ];
  const order = v >= 3 ? [1, 0] : [0, 1];
  for (const i of order) {
    const [lx, ly] = legs[i];
    const fx = CX + (i ? 1 : -1) * Math.round(hipHalf * 0.5) + p.foot[i] * bw;
    const fy = G - p.rise[i];
    const kx = (lx + fx) / 2 + (i ? 1 : -1);
    const ky = (ly + fy) / 2 - 1;
    const thigh = 4.2 * bw + 1;
    const shin = 2.8 * bw + 1;
    b.thickLine(lx, ly, kx, ky, thigh, shin + 0.6, SKN);
    b.thickLine(kx, ky, fx, fy - 3, shin + 0.6, shin, SKN);
    // чулок: от середины бедра или от колена, с манжетой
    if (s.sockH > 0.05) {
      const t = Math.min(1, s.sockH);
      const sx = lx + (kx - lx) * (1 - t);
      const sy = ly + (ky - ly) * (1 - t);
      b.thickLine(sx, sy, kx, ky, thigh - (1 - t) * 1.5, shin + 0.6, SOK);
      b.thickLine(kx, ky, fx, fy - 3, shin + 0.6, shin, SOK);
      b.thickLine(sx - 1, sy, sx + 1, sy + 1, thigh + 0.6, thigh + 0.6, [C.so1, C.so1, C.so1]);
    }
    // ботинок
    const bt = (ky + fy) / 2;
    b.thickLine((kx + fx) / 2, bt, fx, fy - 2, shin + 1.6, shin + 1, BTS);
    b.rect(Math.round(fx - 2.1 * bw - 1), fy - 3, Math.round(4.2 * bw + 3), 4, C.bt0);
    b.rect(Math.round(fx - 2.1 * bw - 1), fy - 3, Math.round(4.2 * bw + 3), 1, C.bt1);
  }

  // ── юбка: расширяется книзу, в складку ──
  const skirtBot = hipY + Math.round(tall * 0.13 * s.skirt);
  b.taper(hipY - 3, skirtBot, Math.round(hipHalf * 0.9), Math.round(hipHalf * 1.75), CX, C.cl1);
  b.taper(hipY - 3, skirtBot - 1, Math.round(hipHalf * 0.7), Math.round(hipHalf * 1.15), CX - 1, C.cl2);
  for (let k = -2; k <= 2; k++) {
    const px = CX + Math.round(k * hipHalf * 0.55);
    b.thickLine(px, hipY - 2, px + Math.round(k * hipHalf * 0.22), skirtBot - 1, 1.6, 1.6, [C.cl0, C.cl0, C.cl0]);
  }
  b.rect(CX - Math.round(hipHalf * 1.7), skirtBot - 1, Math.round(hipHalf * 3.4), 2, C.cl0);

  // ── корпус: плечи -> грудь -> талия -> бёдра ──
  const hem = waistY + Math.round((hipY - waistY) * (1 - s.bare));
  b.taper(shY, bustY, shHalf, bustHalf, CX + lean, C.tp1);
  b.taper(bustY, waistY, bustHalf, waistHalf, CX + Math.round(lean * 0.6), C.tp1);
  b.taper(shY, bustY + 2, Math.round(shHalf * 0.72), Math.round(bustHalf * 0.66), CX + lean - 1, C.tp2);
  // грудь
  for (const d of [-1, 1] as const) {
    b.ellipse(CX + lean + d * Math.round(bustHalf * 0.45), bustY - 1, Math.round(bustHalf * 0.5), Math.round(bustHalf * 0.42), C.tp2);
    b.ellipse(CX + lean + d * Math.round(bustHalf * 0.5), bustY, Math.round(bustHalf * 0.34), Math.round(bustHalf * 0.3), C.tp1);
  }
  b.thickLine(CX + lean, bustY - 1, CX + lean, bustY + 2, 1.4, 1.4, [C.tp0, C.tp0, C.tp0]);
  // подол верха и голый живот до пояса юбки
  if (hem < waistY + 1) {
    b.taper(waistY, waistY + 2, waistHalf, waistHalf + 1, CX, C.tp0);
  } else {
    b.taper(waistY, hem, waistHalf, Math.round(waistHalf * 1.05), CX, C.tp1);
    b.ellipse(CX, hem - 1, Math.round(waistHalf * 1.05), 2, C.tp0);
  }
  b.taper(hem, hipY - 2, Math.round(waistHalf * 0.95), Math.round(hipHalf * 0.76), CX, C.sk1);
  b.taper(hem, hipY - 3, Math.round(waistHalf * 0.62), Math.round(hipHalf * 0.5), CX - 1, C.sk2);
  b.rect(CX - Math.round(hipHalf * 0.78), hipY - 3, Math.round(hipHalf * 1.56), 1, C.trim);

  // ── шея, матросский воротник, платок ──
  b.taper(shY - 4, shY + 1, Math.round(r * 0.38), Math.round(shHalf * 0.46), CX + lean, C.sk1);
  b.taper(shY - 1, shY + Math.round(r * 0.75), shHalf, Math.round(shHalf * 0.5), CX + lean, C.cl1);
  b.taper(shY - 1, shY + Math.round(r * 0.9), Math.round(shHalf * 0.9), Math.round(shHalf * 0.3), CX + lean, C.cl0);
  b.taper(shY - 1, shY + Math.round(r * 0.55), Math.round(shHalf * 0.42), 1, CX + lean, C.sk1);
  b.quad([
    [CX + lean - 3, shY + Math.round(r * 0.35)],
    [CX + lean + 3, shY + Math.round(r * 0.35)],
    [CX + lean, shY + Math.round(r * 0.95)],
  ], C.trim);

  // ── руки ──
  const arms: [number, number][] = [
    [CX - shHalf + 1 + lean, shY + 2],
    [CX + shHalf - 1 + lean, shY + 2],
  ];
  for (const i of order) {
    const [sx, sy] = arms[i];
    const hxp = sx + p.hand[i] * bw;
    const hyp = sy + p.drop[i];
    const ex = (sx + hxp) / 2 + (i ? 2 : -2);
    const ey = (sy + hyp) / 2 + 1;
    const far = i === order[0] && v !== 0;
    b.thickLine(sx, sy, ex, ey, 3.4 * bw + 1, 2.4 * bw + 1, far ? [C.sk1, C.sk0, C.sk0] : SKN);
    b.thickLine(ex, ey, hxp, hyp, 2.4 * bw + 1, 1.8 * bw + 1, SKN);
    // рукав-фонарик матроски
    b.thickLine(sx, sy - 1, sx + (i ? 1 : -1) * 2, sy + 3, 4.2 * bw + 1, 3.4 * bw + 1, [C.tp2, C.tp1, C.tp0]);
    claws(b, Math.round(hxp), Math.round(hyp), i ? 1 : -1, s.broad > 20 ? 1 : 0);
  }

  // голова
  head(b, s, v, CX + lean, top + r + Math.round(p.head * 0.6), r, p);

  if (v < 2) tail(b, CX + Math.round(hipHalf * 1.15), hipY, 1, Math.round(s.tall * 0.24), s.tail);
}

/** павшая: тело на боку, разметавшаяся грива и лужа */
function heap(b: PixBuf, s: Skin, k: number): void {
  const w = Math.round(s.broad * (1.05 + k * 0.2));
  const h = Math.round(s.tall * (0.17 - k * 0.035));
  const base = G - 1;
  // лужа
  const pw = Math.round(w * (1.3 + k * 0.3));
  b.ellipse(CX, base, pw, 3 + k * 2, C.bl0);
  b.ellipse(CX - 2, base - 1, Math.round(pw * 0.7), 2 + k, C.bl1);
  // ноги в чулках вытянуты вправо
  for (const d of [0, 1]) {
    b.thickLine(CX + Math.round(w * 0.2), base - Math.round(h * 0.5) + d * 2, CX + w + 7, base - 1 + d, 5, 4, s.sockH > 0.3 ? SOK : SKN);
    b.rect(CX + w + 6, base - 2 + d, 5, 3, C.bt0);
  }
  // юбка колоколом
  b.ellipse(CX + Math.round(w * 0.35), base - Math.round(h * 0.45), Math.round(w * 0.62), Math.round(h * 0.7), C.cl1);
  b.ellipse(CX + Math.round(w * 0.3), base - Math.round(h * 0.6), Math.round(w * 0.45), Math.round(h * 0.5), C.cl2);
  // корпус
  b.ellipse(CX - Math.round(w * 0.25), base - Math.round(h * 0.5), Math.round(w * 0.5), Math.round(h * 0.6), C.tp1);
  b.ellipse(CX - Math.round(w * 0.3), base - Math.round(h * 0.65), Math.round(w * 0.35), Math.round(h * 0.4), C.tp2);
  b.rect(CX - 1, base - Math.round(h * 0.75), 2, Math.round(h * 0.5), C.trim);
  // рука откинута
  b.thickLine(CX - Math.round(w * 0.3), base - Math.round(h * 0.7), CX - w - 5, base - 2, 4, 3, SKN);
  claws(b, CX - w - 6, base - 2, -1, 0);
  // голова набок
  const hx = CX - Math.round(w * 0.85);
  const hy = base - Math.round(h * 0.8);
  const r = Math.max(4, Math.round(s.tall * 0.095));
  b.ellipse(hx - 3, hy + 1, Math.round(r * (1.4 + s.mane * 0.8)), Math.round(r * 1.05), C.hr0);
  b.ellipse(hx, hy, r, Math.round(r * 0.85), C.sk1);
  b.ellipse(hx, hy - 1, Math.round(r * 0.7), Math.round(r * 0.6), C.sk2);
  b.taper(hy - r, hy, Math.round(r * 0.85), r, hx - 1, C.hr1);
  ear(b, hx - 2, hy - r + 2, -1, Math.round(r * 1.15), s);
  ear(b, hx + 4, hy - r + 3, 1, Math.round(r * 0.85), s);
  b.rect(hx + 1, hy, 3, 1, C.line);
  // хвост вытянут
  b.thickLine(CX + Math.round(w * 0.5), base - 3, CX + w + 11, base - 5, 3 + s.tail * 2, 2, [C.hr1, C.hr1, C.hr0]);
}

/** разрыв в клочья: лужа, ошмётки, косточки */
function gibs(b: PixBuf, s: Skin, k: number): void {
  const base = G - 2;
  // лужа растекается, но не выходит за кадр
  const r = Math.min(26, 10 + k * 5);
  b.ellipse(CX, base, Math.round(r * 1.1), 3 + k, C.bl0);
  b.ellipse(CX - 2, base - 1, Math.round(r * 0.7), 2 + k, C.bl1);
  const n = 10 + k * 3;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + k * 0.7;
    const d = r * (0.45 + ((i * 29) % 13) / 26);
    const px = CX + Math.round(Math.cos(a) * d);
    // ошмётки взлетают в первом кадре и оседают к последнему
    const py = base - Math.round(Math.abs(Math.sin(a)) * d * (0.8 - k * 0.2)) - (4 - k);
    const sz = 2 + ((i * 17) % 3);
    b.ellipse(px, py, sz, sz, i % 3 === 0 ? C.cl1 : C.bl1);
    b.ellipse(px, py - 1, Math.max(1, sz - 1), Math.max(1, sz - 1), i % 3 === 0 ? C.cl2 : C.bl0);
    if (i % 4 === 0) b.ellipse(px, py, 1, 1, C.sk1);
  }
  // уцелевшее ухо и клок гривы — по ним ясно, кого разорвало
  ear(b, CX - r + 5, base - 5, -1, 7, s);
  b.thickLine(CX + Math.round(r * 0.5), base - 4, CX + r - 2, base - 1, 5, 2, [C.hr1, C.hr1, C.hr0]);
}

const cache = new Map<string, HTMLCanvasElement>();

/**
 * Кадр твари: ракурс 0..4 (анфас, три четверти, профиль, три четверти
 * сзади, спина) и поза. Отражение для зеркальных ракурсов делает
 * билборд, а не рисовальщик.
 */
export function foeSprite(id: FoeId, view: number, pose: PoseId, flip = false): HTMLCanvasElement {
  const key = `${id}|${view}|${pose}|${flip ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const def = FOES[id];
  const s = def.skin;
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
