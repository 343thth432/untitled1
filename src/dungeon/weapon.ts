import { PixBuf } from './pixel';

/**
 * Арсенал: двухстволка, пулемёт, ракетница, меч и топор. Спрайты
 * нарисованы здесь пиксель за пикселем — брать чужие из Doom нельзя,
 * а свободные паки заметно грубее.
 */

export type WeaponId = 'ssg' | 'chaingun' | 'launcher' | 'sword' | 'axe';
export type AmmoId = 'shells' | 'bullets' | 'rockets';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  short: string;
  /** как считается попадание */
  kind: 'hitscan' | 'projectile' | 'melee';
  /** урон за луч (для ближнего — за замах) */
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
  /** дальность замаха в клетках */
  reach?: number;
  /** ключевые кадры: [доля цикла, индекс кадра] */
  seq: [number, number][];
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  sword: {
    id: 'sword',
    name: 'Клинок затмения',
    short: 'клинок',
    kind: 'melee',
    dmg: 34,
    cool: 0.42,
    strike: 0.34,
    spread: 0,
    pellets: 1,
    ammo: null,
    cost: 0,
    glow: '#bfe4ff',
    kick: 0.5,
    reach: 1.7,
    seq: [[0, 1], [0.28, 2], [0.5, 3], [0.72, 4], [1, 0]],
  },
  axe: {
    id: 'axe',
    name: 'Тяжёлый топор',
    short: 'топор',
    kind: 'melee',
    dmg: 62,
    cool: 0.78,
    strike: 0.46,
    spread: 0,
    pellets: 1,
    ammo: null,
    cost: 0,
    glow: '#ffcf8a',
    kick: 1.2,
    reach: 1.55,
    seq: [[0, 1], [0.34, 2], [0.52, 3], [0.78, 4], [1, 0]],
  },
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

export const ORDER: WeaponId[] = ['sword', 'axe', 'ssg', 'chaingun', 'launcher'];

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
  '#120e09', // 8  дерево: тень
  '#20190f', // 9  дерево: тело
  '#2d2415', // 10 дерево: свет
  '#3d301c', // 11 дерево: блик
  '#4e3e26', // 12 дерево: искра
  '#3d2f10', // 13 латунь: тень
  '#6a5219', // 14 латунь: тело
  '#96742a', // 15 латунь: свет
  '#c2a352', // 16 латунь: искра
  '#12141b', // 17 перчатка: тень
  '#1f2431', // 18 перчатка: тело
  '#2e3646', // 19 перчатка: свет
  '#d8b45c', // 20 руна
  '#fff2c8', // 21 руна: жар
  '#04050a', // 22 жерло
  '#5a1218', // 23 боеголовка: тень
  '#9c2028', // 24 боеголовка
  '#d2434a', // 25 боеголовка: свет
  '#8fd4ff', // 26 клинок: свечение
  '#e8f6ff', // 27 клинок: жар
];

const C = {
  line: 1,
  s0: 2, s1: 3, s2: 4, s3: 5, s4: 6, s5: 7,
  w0: 8, w1: 9, w2: 10, w3: 11, w4: 12,
  b0: 13, b1: 14, b2: 15, b3: 16,
  g0: 17, g1: 18, g2: 19,
  rune: 20, runeHot: 21,
  bore: 22,
  r0: 23, r1: 24, r2: 25,
  edge: 26, edgeHot: 27,
};

const STEEL = [C.s4, C.s3, C.s2, C.s1, C.s0, C.line];
const BRASS = [C.b3, C.b2, C.b1, C.b0, C.b0, C.line];
const WOOD = [C.w4, C.w3, C.w2, C.w1, C.w0, C.line];
const EDGE = [C.s5, C.s4, C.s3, C.s1, C.s0, C.line];

interface Art {
  frames: HTMLCanvasElement[];
  flash: HTMLCanvasElement;
  /** точки дул: вспышка ставится в каждую */
  muzzles: [number, number][];
}

const cache = new Map<WeaponId, Art>();

// ── двухстволка ──────────────────────────────────────────────

/** ствольный блок: две трубы рядом, планка между ними */
function ssgBarrels(b: PixBuf, cx: number, top: number, bot: number, open: boolean): void {
  for (const s of [-1, 1] as const) {
    const bx = cx + s * 23;
    b.cylinder(top, bot, 15, 16, bx, STEEL);
    if (open) {
      // казна раскрытого ствола: чёрный зев и латунная закраина гильзы
      b.ellipse(bx, top + 4, 11, 5, C.b1);
      b.ellipse(bx, top + 4, 8, 3, C.bore);
    } else {
      b.ellipse(bx, top + 2, 10, 4, C.bore);
      b.ellipse(bx, top + 1, 7, 2, C.line);
    }
  }
  // планка и мушка
  b.rect(cx - 4, top + 2, 8, bot - top - 2, C.s2);
  b.rect(cx - 4, top + 2, 3, bot - top - 2, C.s4);
  if (!open) {
    b.rect(cx - 2, top - 5, 4, 6, C.s2);
    b.rect(cx - 1, top - 5, 2, 1, C.s5);
  }
  // обручи
  b.band(top + 26, 5, () => 40, cx, BRASS);
  b.band(bot - 18, 5, () => 41, cx, BRASS);
}

function ssgFrame(open: number, shells: boolean): PixBuf {
  const b = new PixBuf(W, H);
  const cx = W >> 1;
  const top = 18 + open;
  const bot = 104 + open;
  ssgBarrels(b, cx, top, bot, open > 8);

  // цевьё
  b.cylinder(bot - 6, bot + 26, 44, 46, cx, WOOD);
  b.grain(cx - 38, bot - 2, cx + 38, bot + 24, C.w0, 1234);
  b.band(bot - 7, 4, () => 45, cx, BRASS);

  // коробка и шейка
  b.rect(cx - 48, 126, 96, 36, C.s2);
  b.rect(cx - 48, 126, 96, 3, C.s4);
  b.rect(cx - 48, 158, 96, 4, C.s0);
  b.rect(cx - 40, 132, 80, 22, C.s3);
  b.rect(cx - 40, 132, 80, 1, C.s5);
  b.screw(cx - 33, 138, 3, C.b1, C.b0, C.b3);
  b.screw(cx + 33, 150, 3, C.b1, C.b0, C.b3);
  // рычаг слома
  b.rect(cx - 6, 120, 12, 8, C.s1);
  b.rect(cx - 6, 120, 12, 2, C.s4);
  // курки
  for (const s of [-1, 1] as const) {
    b.rect(cx + s * 30 - 3, 116, 6, 12, C.s1);
    b.rect(cx + s * 30 - 3, 116, 2, 12, C.s3);
  }
  // рунная пластина
  b.rect(cx - 16, 138, 32, 12, C.s1);
  b.rect(cx - 2, 139, 1, 10, C.rune);
  b.rect(cx - 10, 142, 17, 1, C.runeHot);
  b.rect(cx - 8, 146, 13, 1, C.rune);

  // скоба и спуски
  for (let x = -16; x <= 18; x++) {
    const y = 162 + Math.round((x * x) / 40);
    b.rect(cx + x, y, 1, 5, C.s2);
    b.set(cx + x, y, C.s4);
  }
  b.rect(cx - 4, 162, 3, 10, C.s3);
  b.rect(cx + 3, 162, 3, 10, C.s3);

  // приклад
  b.cylinder(154, H - 1, 26, 40, cx + 58, WOOD);
  b.grain(cx + 40, 160, cx + 80, H - 2, C.w0, 4242);
  b.band(154, 4, () => 26, cx + 58, BRASS);

  // гильзы вылетают
  if (shells) {
    for (const s of [-1, 1] as const) {
      const sx = cx + s * 26 + s * 6;
      b.rect(sx - 5, 6, 10, 16, C.r1);
      b.rect(sx - 5, 6, 3, 16, C.r2);
      b.rect(sx - 5, 18, 10, 5, C.b1);
      b.rect(sx - 5, 18, 3, 5, C.b3);
    }
  }

  // кисти
  b.grip(cx - 60, bot + 2, 28, 30, 1, C.g0, C.g1, C.g2, C.line);
  b.grip(cx + 20, 160, 28, 30, -1, C.g0, C.g1, C.g2, C.line);
  b.outline(C.line);
  return b;
}

// ── пулемёт ──────────────────────────────────────────────────

function chainFrame(spin: number): PixBuf {
  const b = new PixBuf(W, H);
  const cx = W >> 1;
  // блок стволов: шесть труб по кругу, вращается
  const order = [0, 1, 2, 3, 4, 5].sort(
    (a, z) => Math.sin(spin + (z / 6) * Math.PI * 2) - Math.sin(spin + (a / 6) * Math.PI * 2),
  );
  for (const i of order) {
    const a = spin + (i / 6) * Math.PI * 2;
    const bx = cx + Math.round(Math.cos(a) * 22);
    const depth = Math.sin(a);
    // дальние стволы темнее и чуть короче — так виден объём блока
    const shade =
      depth > 0.3
        ? [C.s5, C.s4, C.s3, C.s2, C.s1, C.line]
        : depth > -0.3
          ? STEEL
          : [C.s2, C.s1, C.s0, C.s0, C.s0, C.line];
    const top = 30 + Math.round((1 - depth) * 4);
    b.cylinder(top, 98, 10, 11, bx, shade);
    b.ellipse(bx, top + 3, 8, 4, C.s1);
    b.ellipse(bx, top + 3, 5, 2, C.bore);
  }
  // ось и обойма блока
  b.band(26, 6, () => 30, cx, BRASS);
  b.band(90, 7, () => 31, cx, BRASS);
  b.ellipse(cx, 62, 8, 8, C.s1);
  b.ellipse(cx, 62, 4, 4, C.s3);

  // кожух
  b.rect(cx - 34, 96, 68, 40, C.s2);
  b.rect(cx - 34, 96, 68, 3, C.s4);
  b.rect(cx - 34, 132, 68, 4, C.s0);
  b.rect(cx - 26, 102, 52, 24, C.s3);
  b.rect(cx - 26, 102, 52, 1, C.s5);
  b.screw(cx - 20, 108, 3, C.b1, C.b0, C.b3);
  b.screw(cx + 20, 122, 3, C.b1, C.b0, C.b3);
  b.rect(cx - 14, 110, 6, 1, C.rune);
  b.rect(cx - 4, 108, 1, 8, C.rune);
  b.rect(cx + 2, 112, 8, 1, C.runeHot);

  // лента с патронами уходит вправо
  for (let i = 0; i < 9; i++) {
    const x = cx + 34 + i * 9;
    const y = 128 + Math.round(Math.sin(i * 0.6) * 6) + i;
    b.rect(x, y, 7, 12, C.b1);
    b.rect(x, y, 2, 12, C.b3);
    b.rect(x, y + 12, 7, 4, C.s1);
  }

  // рукоять и кисти
  b.rect(cx - 4, 136, 22, 30, C.s2);
  b.rect(cx - 4, 136, 4, 30, C.s4);
  b.grip(cx - 56, 100, 26, 30, 1, C.g0, C.g1, C.g2, C.line);
  b.grip(cx + 2, 150, 26, 30, -1, C.g0, C.g1, C.g2, C.line);
  b.outline(C.line);
  return b;
}

// ── ракетница ────────────────────────────────────────────────

function launcherFrame(back: number): PixBuf {
  const b = new PixBuf(W, H);
  const cx = W >> 1;
  const top = 22 + back;
  // труба
  b.cylinder(top, 150 + back, 25, 31, cx, STEEL);
  b.band(top + 34, 6, () => 27, cx, BRASS);
  b.band(top + 92, 6, () => 30, cx, BRASS);
  // дульный срез: чёрный зев и видимая боеголовка
  b.ellipse(cx, top + 6, 21, 9, C.bore);
  if (back === 0) {
    b.ellipse(cx, top + 8, 12, 6, C.r0);
    b.ellipse(cx, top + 6, 9, 4, C.r1);
    b.ellipse(cx - 3, top + 4, 6, 3, C.r2);
  }
  // прицельная планка
  b.rect(cx - 34, top + 18, 12, 26, C.s2);
  b.rect(cx - 34, top + 18, 3, 26, C.s4);
  b.rect(cx - 38, top + 14, 20, 5, C.s1);
  b.rect(cx - 28, top + 2, 4, 16, C.s2);
  b.rect(cx - 28, top + 2, 4, 2, C.s5);
  // руны вдоль трубы
  for (let i = 0; i < 3; i++) b.rect(cx + 10 + i * 3, top + 46 + i * 12, 12 - i * 3, 1, C.rune);
  b.rect(cx + 12, top + 84, 10, 1, C.runeHot);
  // задняя часть и рукоять
  b.rect(cx - 30, 150 + back, 62, 26, C.s2);
  b.rect(cx - 30, 150 + back, 62, 3, C.s4);
  b.rect(cx - 2, 168 + back, 22, 30, C.s2);
  b.rect(cx - 2, 168 + back, 4, 30, C.s4);
  // кисти
  b.grip(cx - 54, 118 + back, 28, 30, 1, C.g0, C.g1, C.g2, C.line);
  b.grip(cx + 4, 172 + back, 26, 26, -1, C.g0, C.g1, C.g2, C.line);
  b.outline(C.line);
  return b;
}

// ── меч и топор ──────────────────────────────────────────────

/** ключевые точки замаха: рукоять и остриё */
function swordFrame(k: number): PixBuf {
  const b = new PixBuf(W, H);
  const cx = W >> 1;
  // дуга удара: от правого верха к левому низу
  const path: [number, number, number, number][] = [
    [cx + 34, H - 34, cx + 82, 58],   // покой
    [cx + 44, H - 40, cx + 96, 2],    // замах
    [cx + 20, H - 44, cx - 34, 2],    // удар: клинок через кадр
    [cx - 22, H - 38, cx - 106, 58],  // проводка
    [cx + 16, H - 36, cx + 72, 78],   // возврат
  ];
  const [hx, hy, tx, ty] = path[Math.min(path.length - 1, k)];
  // клинок
  b.thickLine(hx, hy, tx, ty, 15, 5, EDGE);
  // дол и светящаяся кромка
  const dx = tx - hx;
  const dy = ty - hy;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  for (let i = 0; i <= len; i += 1) {
    const t = i / len;
    const px = hx + dx * t;
    const py = hy + dy * t;
    b.set(Math.round(px), Math.round(py), C.s5);
    b.set(Math.round(px + nx * (6 - t * 2)), Math.round(py + ny * (6 - t * 2)), t > 0.2 ? C.edge : C.s3);
    if (k >= 1 && k <= 3 && t > 0.25) {
      b.set(Math.round(px + nx * (8 - t * 2)), Math.round(py + ny * (8 - t * 2)), C.edgeHot);
    }
  }
  // гарда и рукоять
  b.thickLine(hx - nx * 16, hy - ny * 16, hx + nx * 16, hy + ny * 16, 8, 8, BRASS);
  b.thickLine(hx, hy, hx - (dx / len) * 26, hy - (dy / len) * 26, 11, 9, WOOD);
  b.ellipse(Math.round(hx - (dx / len) * 28), Math.round(hy - (dy / len) * 28), 6, 6, C.b2);
  // кисти на рукояти
  b.grip(Math.round(hx - (dx / len) * 6) - 13, Math.round(hy - (dy / len) * 6) - 12, 26, 26, -1, C.g0, C.g1, C.g2, C.line);
  b.outline(C.line);
  return b;
}

function axeFrame(k: number): PixBuf {
  const b = new PixBuf(W, H);
  const cx = W >> 1;
  const path: [number, number, number, number][] = [
    [cx + 30, H - 26, cx + 68, 72],
    [cx + 44, H - 34, cx + 92, 8],
    [cx + 24, H - 44, cx + 16, -12],
    [cx - 4, H - 40, cx - 18, 34],
    [cx + 12, H - 30, cx + 56, 86],
  ];
  const [hx, hy, tx, ty] = path[Math.min(path.length - 1, k)];
  const dx = tx - hx;
  const dy = ty - hy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  // топорище
  b.thickLine(hx, hy, tx, ty, 13, 10, WOOD);
  b.grain(Math.min(hx, tx) - 4, Math.min(hy, ty), Math.max(hx, tx) + 4, Math.max(hy, ty), C.w0, 77 + k);
  // обух и лопасть-полумесяц
  const ax = tx;
  const ay = ty;
  const blade = (out: number, back: number, front: number, c: number): void => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const r = out * (0.34 + Math.sin(t * Math.PI) * 0.66);
      const along = -back + (front + back) * t;
      pts.push([ax + nx * r + ux * along, ay + ny * r + uy * along]);
    }
    for (let i = 10; i >= 0; i--) {
      const t = i / 10;
      const along = -back * 0.35 + (front * 0.35 + back * 0.35) * t;
      pts.push([ax + nx * 8 + ux * along, ay + ny * 8 + uy * along]);
    }
    b.quad(pts, c);
  };
  blade(48, 16, 30, C.s2);
  blade(48, 12, 26, C.s3);
  blade(48, 6, 16, k >= 1 && k <= 3 ? C.s5 : C.s4);
  // обух с обратной стороны
  b.quad(
    [
      [ax - nx * 22 - ux * 14, ay - ny * 22 - uy * 14],
      [ax - nx * 4 - ux * 16, ay - ny * 4 - uy * 16],
      [ax - nx * 4 + ux * 8, ay - ny * 4 + uy * 8],
      [ax - nx * 22 + ux * 4, ay - ny * 22 + uy * 4],
    ],
    C.s1,
  );
  // проушина
  b.thickLine(ax - ux * 18, ay - uy * 18, ax + ux * 14, ay + uy * 14, 20, 20, STEEL);

  // оковка и кисти
  b.thickLine(hx + ux * 26, hy + uy * 26, hx + ux * 36, hy + uy * 36, 15, 15, BRASS);
  b.grip(Math.round(hx + ux * 4) - 13, Math.round(hy + uy * 4) - 14, 26, 28, -1, C.g0, C.g1, C.g2, C.line);
  b.grip(Math.round(hx + ux * 46) - 13, Math.round(hy + uy * 46) - 13, 24, 26, 1, C.g0, C.g1, C.g2, C.line);
  b.outline(C.line);
  return b;
}

// ── вспышка ──────────────────────────────────────────────────

function flashArt(muzzles: [number, number][], big: number): HTMLCanvasElement {
  const fb = new PixBuf(W, H);
  const FL = ['#00000000', '#00000000', '#ffe9a8', '#ff9c3c', '#fff8e0', '#ffcf6a'];
  for (const [mx, my] of muzzles) {
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2;
      const len = (a % 3 === 0 ? 34 : a % 2 ? 17 : 25) * big;
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
  const cx = W >> 1;
  if (id === 'ssg') {
    const frames = [
      ssgFrame(0, false),
      ssgFrame(4, false),
      ssgFrame(22, false),
      ssgFrame(30, true),
      ssgFrame(12, false),
    ].map((b) => b.toCanvas(PAL));
    const muzzles: [number, number][] = [[cx - 23, 20], [cx + 23, 20]];
    return { frames, flash: flashArt(muzzles, 1.15), muzzles };
  }
  if (id === 'chaingun') {
    const frames = [0, 0.5, 1, 1.5].map((s) => chainFrame(s).toCanvas(PAL));
    const muzzles: [number, number][] = [[cx, 30]];
    return { frames, flash: flashArt(muzzles, 0.8), muzzles };
  }
  if (id === 'launcher') {
    const frames = [launcherFrame(0), launcherFrame(6), launcherFrame(16)].map((b) => b.toCanvas(PAL));
    const muzzles: [number, number][] = [[cx, 28]];
    return { frames, flash: flashArt(muzzles, 1.5), muzzles };
  }
  const gen = id === 'sword' ? swordFrame : axeFrame;
  const frames = [0, 1, 2, 3, 4].map((k) => gen(k).toCanvas(PAL));
  return { frames, flash: flashArt([[cx, H]], 0.01), muzzles: [] };
}

export function weaponArt(id: WeaponId): Art {
  let hit = cache.get(id);
  if (!hit) {
    hit = build(id);
    cache.set(id, hit);
  }
  return hit;
}

/** кадр по доле цикла выстрела; ph < 0 — покой */
export function frameAt(def: WeaponDef, ph: number): number {
  if (ph < 0) return 0;
  let f = def.seq[0][1];
  for (const [t, i] of def.seq) {
    if (ph >= t) f = i;
  }
  return f;
}

export const WEAPON_ART = { W, H };
