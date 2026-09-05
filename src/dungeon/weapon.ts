import { PixBuf } from './pixel';

/**
 * Арсенал: двухстволка, пулемёт, ракетница. Ближнего боя нет — под
 * затмение спускаются с полными карманами и стреляют.
 *
 * Спрайты здесь нарисованы пиксель за пикселем и служат запасным
 * вариантом: если в public/art/weapons лежит готовая лента кадров
 * (см. sheet.ts), рисуется она. Графику из WAD'ов Doom брать нельзя —
 * id Software открыли исходники движка, но не данные игры.
 */

export type WeaponId = 'ssg' | 'chaingun' | 'launcher';
export type AmmoId = 'shells' | 'bullets' | 'rockets';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  short: string;
  /** как считается попадание */
  kind: 'hitscan' | 'projectile';
  /** урон за луч */
  dmg: number;
  /** секунд на весь цикл выстрела */
  cool: number;
  /** доля цикла, на которой наносится урон */
  strike: number;
  spread: number;
  pellets: number;
  ammo: AmmoId | null;
  cost: number;
  glow: string;
  kick: number;
  /** ключевые кадры: [доля цикла, индекс кадра] */
  seq: [number, number][];
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  ssg: {
    id: 'ssg',
    name: 'Двухстволка',
    short: 'двустволка',
    kind: 'hitscan',
    dmg: 13,
    cool: 1.15,
    strike: 0.04,
    spread: 0.15,
    pellets: 14,
    ammo: 'shells',
    cost: 2,
    glow: '#ffca7a',
    kick: 1.9,
    seq: [[0, 1], [0.12, 2], [0.34, 3], [0.58, 4], [0.82, 2], [1, 0]],
  },
  chaingun: {
    id: 'chaingun',
    name: 'Пулемёт',
    short: 'пулемёт',
    kind: 'hitscan',
    dmg: 11,
    cool: 0.12,
    strike: 0.02,
    spread: 0.055,
    pellets: 1,
    ammo: 'bullets',
    cost: 1,
    glow: '#ffe08a',
    kick: 0.5,
    seq: [[0, 1], [0.35, 2], [0.7, 3], [1, 0]],
  },
  launcher: {
    id: 'launcher',
    name: 'Ракетница',
    short: 'ракетница',
    kind: 'projectile',
    dmg: 90,
    cool: 1.05,
    strike: 0.06,
    spread: 0.01,
    pellets: 1,
    ammo: 'rockets',
    cost: 1,
    glow: '#ff9a5a',
    kick: 2.2,
    seq: [[0, 1], [0.2, 2], [0.6, 1], [1, 0]],
  },
};

export const ORDER: WeaponId[] = ['ssg', 'chaingun', 'launcher'];

/**
 * Посадка кадра снята с пропорций классического шутера: экран 320×200,
 * спрайт оружия по высоте занимает около двух третей кадра и стоит снизу.
 * Отсюда холст 200×140 и правило: масса оружия в нижней части, ствол
 * уходит вверх-влево под наклоном, дуло заканчивается внутри кадра,
 * кисти крупные и с предплечьями из-за нижней кромки.
 */
const W = 240;
const H = 200;

const PAL = [
  '#00000000',
  '#07080c', // 1  контур
  '#14171f', // 2  сталь: глубокая тень
  '#232833', // 3  сталь: тень
  '#2e3442', // 4  сталь: тело
  '#434b5c', // 5  сталь: свет
  '#616b80', // 6  сталь: блик
  '#939db2', // 7  сталь: искра
  '#2a1109', // 8  дерево: тень
  '#4a1d0e', // 9  дерево: тело
  '#6b2c15', // 10 дерево: свет
  '#8c3f1e', // 11 дерево: блик
  '#a85529', // 12 дерево: искра
  '#3d2f10', // 13 латунь: тень
  '#6a5219', // 14 латунь: тело
  '#96742a', // 15 латунь: свет
  '#c2a352', // 16 латунь: искра
  '#5e3324', // 17 кожа: тень
  '#8a5738', // 18 кожа: полутень
  '#b17a52', // 19 кожа: тело
  '#cf9a6d', // 20 кожа: свет
  '#e6bf96', // 21 кожа: блик
  '#d8b45c', // 22 руна
  '#fff2c8', // 23 руна: жар
  '#04050a', // 24 жерло
  '#5a1218', // 25 боеголовка: тень
  '#9c2028', // 26 боеголовка
  '#d2434a', // 27 боеголовка: свет
  '#8fd4ff', // 28 клинок: свечение
  '#e8f6ff', // 29 клинок: жар
];

const C = {
  line: 1,
  s0: 2, s1: 3, s2: 4, s3: 5, s4: 6, s5: 7,
  w0: 8, w1: 9, w2: 10, w3: 11, w4: 12,
  b0: 13, b1: 14, b2: 15, b3: 16,
  // кисти голые: в спрайтах старых шутеров это кожа, а не перчатка
  k0: 17, k1: 18, k2: 19, k3: 20, k4: 21,
  rune: 22, runeHot: 23,
  bore: 24,
  r0: 25, r1: 26, r2: 27,
  edge: 28, edgeHot: 29,
};

const STEEL = [C.s4, C.s3, C.s2, C.s1, C.s0, C.line];
const BRASS = [C.b3, C.b2, C.b1, C.b0, C.b0, C.line];
const WOOD = [C.w4, C.w3, C.w2, C.w1, C.w0, C.line];

interface Art {
  frames: HTMLCanvasElement[];
  flash: HTMLCanvasElement;
  muzzles: [number, number][];
}

const cache = new Map<WeaponId, Art>();

/** ось оружия: казна у груди — дуло вдали */
interface Axis {
  bx: number;
  by: number;
  tx: number;
  ty: number;
  ux: number;
  uy: number;
  px: number;
  py: number;
}

function axis(bx: number, by: number, tx: number, ty: number): Axis {
  const dx = tx - bx;
  const dy = ty - by;
  const l = Math.hypot(dx, dy) || 1;
  return { bx, by, tx, ty, ux: dx / l, uy: dy / l, px: -(dy / l), py: dx / l };
}

/** точка на оси: t = 0 у казны, 1 у дула, off — сдвиг поперёк */
function at(a: Axis, t: number, off = 0): [number, number] {
  return [a.bx + (a.tx - a.bx) * t + a.px * off, a.by + (a.ty - a.by) * t + a.py * off];
}

/**
 * Кисть на оружии: ладонь ложится сверху, пальцы загибаются за дальнюю
 * кромку. Предплечья в кадре нет — видно только обрубок запястья,
 * как в спрайтах старых шутеров.
 */
function handAt(b: PixBuf, cx: number, cy: number, w: number, h: number, dir: 1 | -1, over = 9): void {
  const x = dir > 0 ? Math.round(cx) - w : Math.round(cx);
  b.handBack(x, Math.round(cy) - Math.round(h / 2), w, h, dir, over, C.k0, C.k1, C.k2, C.k3, C.k4, C.line);
}

// ── двухстволка ──────────────────────────────────────────────

/** ствол сбоку: плита вдоль оси со светлым верхним ребром */
function sideBarrel(b: PixBuf, a: Axis, t0: number, t1: number, off: number, thick: number, ramp: number[]): void {
  const [x0, y0] = at(a, t0, off);
  const [x1, y1] = at(a, t1, off);
  b.thickLine(x0, y0, x1, y1, thick, thick * 0.92, ramp);
}

function ssgFrame(open: number, shells: boolean, recoil: number): PixBuf {
  const b = new PixBuf(W, H);
  // ствол лежит наискось: видно его бок, а не торец
  const hinge = 0.24;
  const a = axis(206 + recoil * 0.6, 170 + recoil, 46 + recoil * 0.4, 44 + open + recoil * 0.5);

  // казённик и ствольная коробка
  const [bx0, by0] = at(a, -0.05, 6);
  const [bx1, by1] = at(a, hinge + 0.04, 4);
  b.thickLine(bx0, by0, bx1, by1, 54, 46, STEEL);

  // пара стволов, одна над другой в кадре
  for (const off of [-13, 12] as const) {
    sideBarrel(b, a, hinge, 1.0, off, 25, STEEL);
    const [tx, ty] = at(a, 1.0, off);
    // срез: тёмная скошенная площадка
    b.ellipse(Math.round(tx), Math.round(ty), 9, 12, C.s1);
    b.ellipse(Math.round(tx), Math.round(ty), 6, 9, C.bore);
  }
  // верхнее ребро и шов между стволами
  const [e0x, e0y] = at(a, hinge, -24);
  const [e1x, e1y] = at(a, 1.0, -24);
  b.thickLine(e0x, e0y, e1x, e1y, 4, 3, [C.s5, C.s4, C.s3, C.s2, C.s1, C.line]);
  const [s0x, s0y] = at(a, hinge, 0);
  const [s1x, s1y] = at(a, 1.0, 0);
  b.thickLine(s0x, s0y, s1x, s1y, 3, 2, [C.line, C.line, C.s0, C.s0, C.line, C.line]);
  // обручи
  for (const t of [0.44, 0.72]) {
    const [gx, gy] = at(a, t);
    b.thickLine(gx + a.px * -26, gy + a.py * -26, gx + a.px * 26, gy + a.py * 26, 7, 7, BRASS);
  }
  // мушка
  if (open < 6) {
    const [mx, my] = at(a, 0.96, -26);
    b.rect(Math.round(mx) - 2, Math.round(my) - 5, 4, 7, C.s3);
  }

  // деревянное цевьё под стволами
  const [wx0, wy0] = at(a, 0.16, 26);
  const [wx1, wy1] = at(a, 0.5, 22);
  b.thickLine(wx0, wy0, wx1, wy1, 42, 36, WOOD);
  // насечка на дереве
  for (let i = 0; i < 10; i++) {
    const t = 0.2 + i * 0.03;
    const [gx, gy] = at(a, t, 26);
    b.thickLine(gx + a.px * -14, gy + a.py * -14, gx + a.px * 14, gy + a.py * 14, 2, 2, [C.w0, C.w0, C.w0, C.w0, C.w0, C.w0]);
  }
  const [k0x, k0y] = at(a, 0.5, 22);
  b.thickLine(k0x + a.px * -18, k0y + a.py * -18, k0x + a.px * 18, k0y + a.py * 18, 6, 6, BRASS);

  // рычаг слома и курки
  const [lvx, lvy] = at(a, hinge + 0.02, -18);
  b.rect(Math.round(lvx) - 5, Math.round(lvy) - 10, 11, 14, C.s1);
  b.rect(Math.round(lvx) - 5, Math.round(lvy) - 10, 11, 3, C.s4);
  const [rn, rny] = at(a, 0.1, 0);
  b.rect(Math.round(rn) - 14, Math.round(rny) - 8, 28, 16, C.s1);
  b.rect(Math.round(rn) - 9, Math.round(rny) - 4, 1, 9, C.rune);
  b.rect(Math.round(rn) - 5, Math.round(rny), 10, 1, C.runeHot);
  b.rect(Math.round(rn) + 4, Math.round(rny) - 4, 1, 9, C.rune);

  if (shells) {
    for (const off of [-13, 12] as const) {
      const [sx, sy] = at(a, 1.14, off - 14);
      b.rect(Math.round(sx) - 5, Math.round(sy) - 16, 10, 14, C.r1);
      b.rect(Math.round(sx) - 5, Math.round(sy) - 16, 3, 14, C.r2);
      b.rect(Math.round(sx) - 5, Math.round(sy) - 4, 10, 5, C.b1);
    }
  }

  // кисти лежат на самом оружии: дальняя обхватывает цевьё,
  // ближняя — шейку у казённика
  const [fhx, fhy] = at(a, 0.44, 36);
  const [nhx, nhy] = at(a, -0.06, 30);
  handAt(b, fhx + 2, fhy + 16, 50, 44, 1, 11);
  handAt(b, nhx - 26, nhy + 18, 50, 44, -1, 11);
  b.outline(C.line);
  return b;
}

// ── пулемёт ──────────────────────────────────────────────────

function chainFrame(spin: number): PixBuf {
  const b = new PixBuf(W, H);
  const a = axis(202, 174, 50, 54);

  // кожух у груди
  const [hx0, hy0] = at(a, -0.06, 8);
  const [hx1, hy1] = at(a, 0.32, 6);
  b.thickLine(hx0, hy0, hx1, hy1, 58, 50, STEEL);
  const [rn, rny] = at(a, 0.08, 2);
  b.rect(Math.round(rn) - 15, Math.round(rny) - 9, 30, 18, C.s1);
  b.rect(Math.round(rn) - 10, Math.round(rny) - 4, 8, 1, C.rune);
  b.rect(Math.round(rn), Math.round(rny) - 6, 1, 11, C.rune);
  b.rect(Math.round(rn) + 4, Math.round(rny) + 1, 9, 1, C.runeHot);

  // блок стволов: шесть труб вокруг оси, ближние светлее
  const order = [0, 1, 2, 3, 4, 5].sort(
    (x, z) => Math.sin(spin + (z / 6) * Math.PI * 2) - Math.sin(spin + (x / 6) * Math.PI * 2),
  );
  for (const i of order) {
    const ang = spin + (i / 6) * Math.PI * 2;
    const depth = Math.sin(ang);
    const off = Math.cos(ang) * 17;
    const shade =
      depth > 0.3
        ? [C.s5, C.s4, C.s3, C.s2, C.s1, C.line]
        : depth > -0.3
          ? STEEL
          : [C.s2, C.s1, C.s0, C.s0, C.s0, C.line];
    sideBarrel(b, a, 0.3, 1 - (1 - depth) * 0.03, off, 15, shade);
    const [tx, ty] = at(a, 1 - (1 - depth) * 0.03, off);
    b.ellipse(Math.round(tx), Math.round(ty), 6, 8, C.s1);
    b.ellipse(Math.round(tx), Math.round(ty), 4, 5, C.bore);
  }
  // обоймы блока
  for (const t of [0.36, 0.9]) {
    const [gx, gy] = at(a, t);
    b.thickLine(gx + a.px * -20, gy + a.py * -20, gx + a.px * 20, gy + a.py * 20, 8, 8, BRASS);
  }

  // лента с патронами уходит вниз-вправо
  for (let i = 0; i < 8; i++) {
    const [px, py] = at(a, -0.04 - i * 0.02, 34 + i * 8);
    b.rect(Math.round(px), Math.round(py), 9, 14, C.b1);
    b.rect(Math.round(px), Math.round(py), 3, 14, C.b3);
    b.rect(Math.round(px), Math.round(py) + 14, 9, 4, C.s1);
  }

  const [fhx, fhy] = at(a, 0.4, 34);
  const [nhx, nhy] = at(a, -0.04, 28);
  handAt(b, fhx + 2, fhy + 14, 50, 44, 1, 11);
  handAt(b, nhx - 26, nhy + 18, 50, 44, -1, 11);
  b.outline(C.line);
  return b;
}

// ── ракетница ────────────────────────────────────────────────

function launcherFrame(back: number): PixBuf {
  const b = new PixBuf(W, H);
  const a = axis(202 + back * 0.6, 176 + back, 46 + back * 0.5, 52 + back * 0.4);

  // труба целиком, сбоку
  sideBarrel(b, a, 0.06, 1, 0, 52, STEEL);
  // верхнее ребро
  const [e0x, e0y] = at(a, 0.1, -24);
  const [e1x, e1y] = at(a, 1, -24);
  b.thickLine(e0x, e0y, e1x, e1y, 5, 4, [C.s5, C.s4, C.s3, C.s2, C.s1, C.line]);
  // дульный срез и боеголовка в нём
  const [tx, ty] = at(a, 1);
  b.ellipse(Math.round(tx), Math.round(ty), 13, 25, C.s1);
  b.ellipse(Math.round(tx), Math.round(ty), 10, 21, C.bore);
  if (back === 0) {
    b.ellipse(Math.round(tx) + 2, Math.round(ty), 7, 13, C.r0);
    b.ellipse(Math.round(tx) + 3, Math.round(ty) - 2, 5, 9, C.r1);
    b.ellipse(Math.round(tx) + 4, Math.round(ty) - 5, 3, 4, C.r2);
  }
  // обручи
  for (const t of [0.34, 0.72]) {
    const [gx, gy] = at(a, t);
    b.thickLine(gx + a.px * -28, gy + a.py * -28, gx + a.px * 28, gy + a.py * 28, 8, 8, BRASS);
  }
  // прицельная планка сверху
  const [sx, sy] = at(a, 0.56, -30);
  b.rect(Math.round(sx) - 5, Math.round(sy) - 16, 11, 20, C.s2);
  b.rect(Math.round(sx) - 5, Math.round(sy) - 16, 3, 20, C.s4);
  b.rect(Math.round(sx) - 3, Math.round(sy) - 26, 5, 12, C.s2);
  b.rect(Math.round(sx) - 3, Math.round(sy) - 26, 5, 2, C.s5);
  // руны вдоль трубы
  for (let i = 0; i < 3; i++) {
    const [gx, gy] = at(a, 0.5 - i * 0.12, 12 + i * 4);
    b.rect(Math.round(gx), Math.round(gy), 12 - i * 3, 2, i === 0 ? C.runeHot : C.rune);
  }
  // казённая часть и рукоять
  const [ex, ey] = at(a, -0.02, 10);
  b.thickLine(ex, ey, ex + a.ux * 26, ey + a.uy * 26, 48, 44, STEEL);
  const [gx2, gy2] = at(a, -0.02, 40);
  b.rect(Math.round(gx2) - 8, Math.round(gy2) - 6, 20, 30, C.s2);
  b.rect(Math.round(gx2) - 8, Math.round(gy2) - 6, 5, 30, C.s4);

  const [fhx, fhy] = at(a, 0.42, 38);
  const [nhx, nhy] = at(a, -0.04, 32);
  handAt(b, fhx + 2, fhy + 14, 50, 44, 1, 11);
  handAt(b, nhx - 26, nhy + 18, 50, 44, -1, 11);
  b.outline(C.line);
  return b;
}

// ── вспышка ──────────────────────────────────────────────────

function flashArt(muzzles: [number, number][], big: number): HTMLCanvasElement {
  const fb = new PixBuf(W, H);
  const FL = ['#00000000', '#00000000', '#ffe9a8', '#ff9c3c', '#fff8e0', '#ffcf6a'];
  for (const [mx, my] of muzzles) {
    for (let a2 = 0; a2 < 12; a2++) {
      const ang = (a2 / 12) * Math.PI * 2;
      const len = (a2 % 3 === 0 ? 34 : a2 % 2 ? 17 : 25) * big;
      for (let r = 0; r <= len; r++) {
        const c = r < len * 0.3 ? 4 : r < len * 0.65 ? 2 : 3;
        const th = r < len * 0.4 ? 1 : 0;
        for (let o = -th; o <= th; o++) {
          fb.set(mx + Math.round(Math.cos(ang) * r) + o, my + Math.round(Math.sin(ang) * r * 0.8), c);
        }
      }
    }
    fb.ellipse(mx, my, Math.round(12 * big), Math.round(9 * big), 5);
    fb.ellipse(mx, my, Math.round(9 * big), Math.round(7 * big), 2);
    fb.ellipse(mx, my, Math.round(6 * big), Math.round(4 * big), 4);
  }
  return fb.toCanvas(FL);
}

function build(id: WeaponId): Art {
  if (id === 'ssg') {
    const frames = [
      ssgFrame(0, false, 0),
      ssgFrame(0, false, 10),
      ssgFrame(26, false, 4),
      ssgFrame(34, true, 2),
      ssgFrame(14, false, 0),
    ].map((b) => b.toCanvas(PAL));
    const a = axis(206, 170, 46, 44);
    const muzzles: [number, number][] = [
      [Math.round(at(a, 1, -13)[0]), Math.round(at(a, 1, -13)[1])],
      [Math.round(at(a, 1, 12)[0]), Math.round(at(a, 1, 12)[1])],
    ];
    return { frames, flash: flashArt(muzzles, 1.15), muzzles };
  }
  if (id === 'chaingun') {
    const frames = [0, 0.5, 1, 1.5].map((s) => chainFrame(s).toCanvas(PAL));
    const muzzles: [number, number][] = [[50, 54]];
    return { frames, flash: flashArt(muzzles, 0.85), muzzles };
  }
  if (id === 'launcher') {
    const frames = [launcherFrame(0), launcherFrame(6), launcherFrame(16)].map((b) => b.toCanvas(PAL));
    const muzzles: [number, number][] = [[46, 52]];
    return { frames, flash: flashArt(muzzles, 1.5), muzzles };
  }
  // сюда не попасть: в арсенале только три ствола, и все разобраны выше
  throw new Error(`нет спрайта для ${id}`);
}

export function weaponArt(id: WeaponId): Art {
  let hit = cache.get(id);
  if (!hit) {
    hit = build(id);
    cache.set(id, hit);
  }
  return hit;
}

/** кадр по раскадровке и доле цикла выстрела; ph < 0 — покой */
export function seqFrame(seq: [number, number][], ph: number): number {
  if (ph < 0) return 0;
  let f = seq[0][1];
  for (const [t, i] of seq) {
    if (ph >= t) f = i;
  }
  return f;
}

/** кадр по доле цикла выстрела; ph < 0 — покой */
export function frameAt(def: WeaponDef, ph: number): number {
  return seqFrame(def.seq, ph);
}

export const WEAPON_ART = { W, H };
