import { PixBuf } from './pixel';

/**
 * Оружие в руках, как в старых шутерах: спрайт внизу кадра, покачивание
 * при ходьбе, отдача и вспышка при выстреле. Это предмет из металла и
 * дерева — такие формы код рисует уверенно.
 */

export type WeaponId = 'handcannon' | 'crossbow' | 'censer';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  /** урон за выстрел */
  dmg: number;
  /** секунд между выстрелами */
  cool: number;
  /** разброс в радианах */
  spread: number;
  /** сколько лучей за выстрел */
  pellets: number;
  /** заряд за выстрел */
  cost: number;
  /** цвет вспышки и рун */
  glow: string;
  /** отдача камеры */
  kick: number;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  handcannon: {
    id: 'handcannon',
    name: 'Рунная кулеврина',
    dmg: 26,
    cool: 0.52,
    spread: 0.012,
    pellets: 1,
    cost: 1,
    glow: '#ffca7a',
    kick: 1,
  },
  crossbow: {
    id: 'crossbow',
    name: 'Тяжёлый арбалет',
    dmg: 46,
    cool: 0.95,
    spread: 0.004,
    pellets: 1,
    cost: 1,
    glow: '#bfe4ff',
    kick: 1.35,
  },
  censer: {
    id: 'censer',
    name: 'Кадило Затмения',
    dmg: 11,
    cool: 0.72,
    spread: 0.1,
    pellets: 6,
    cost: 2,
    glow: '#c9a0ff',
    kick: 1.6,
  },
};

const W = 208;
const H = 184;
const cache = new Map<string, { body: HTMLCanvasElement; flash: HTMLCanvasElement; muzzle: [number, number] }>();

/**
 * Палитра оружия: отдельные шкалы для стали, дерева, латуни и перчатки.
 * Именно шкалы, а не по одному тону на материал — иначе части сливаются
 * и не видно, где ствол, где ложе, где замок.
 */
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
  '#e2c濃', // 16 (заменяется ниже)
  '#12141b', // 17 перчатка: тень
  '#1f2431', // 18 перчатка: тело
  '#2e3646', // 19 перчатка: свет
  '#d8b45c', // 20 руна
  '#fff2c8', // 21 руна: жар
  '#04050a', // 22 жерло
];
PAL[16] = '#c2a352';

const C = {
  line: 1,
  s0: 2,
  s1: 3,
  s2: 4,
  s3: 5,
  s4: 6,
  s5: 7,
  w0: 8,
  w1: 9,
  w2: 10,
  w3: 11,
  w4: 12,
  b0: 13,
  b1: 14,
  b2: 15,
  b3: 16,
  g0: 17,
  g1: 18,
  g2: 19,
  rune: 20,
  runeHot: 21,
  bore: 22,
};

/** шкала для круглых стальных тел: кромка — блик — тело — тень */
const STEEL = [C.s4, C.s3, C.s2, C.s1, C.s0, C.line];
const BRASS = [C.b3, C.b2, C.b1, C.b0, C.b0, C.line];
const WOOD = [C.w4, C.w3, C.w2, C.w1, C.w0, C.line];

function cannon(b: PixBuf, cx: number): [number, number] {
  // ── ствол: почти параллельный, лёгкое схождение кверху ──
  const barTop = 30;
  const barBot = 98;
  const halfTop = 11;
  const halfBot = 16;
  const halfAt = (y: number): number =>
    Math.round(halfTop + ((halfBot - halfTop) * (y - barTop)) / (barBot - barTop));
  b.cylinder(barTop, barBot, halfTop, halfBot, cx, STEEL);

  // ── дульный срез: латунный раструб шире ствола, чёрное жерло ──
  b.cylinder(14, 30, 18, 13, cx, BRASS);
  b.band(11, 4, () => 18, cx, BRASS);
  b.ellipse(cx, 16, 11, 5, C.bore);
  b.ellipse(cx, 15, 8, 3, C.line);
  b.rect(cx - 10, 14, 5, 1, C.b3);
  // мушка
  b.rect(cx - 2, 4, 4, 8, C.s2);
  b.rect(cx - 2, 4, 1, 8, C.s4);
  b.rect(cx - 1, 4, 2, 1, C.s5);

  // ── обручи ──
  b.band(46, 5, halfAt, cx, BRASS);
  b.band(72, 5, halfAt, cx, BRASS);
  b.screw(cx - 9, 48, 2, C.s1, C.line, C.s4);
  b.screw(cx + 9, 48, 2, C.s1, C.line, C.s4);

  // рунная насечка
  for (let i = 0; i < 4; i++) b.rect(cx - 4 + i, 56 + i * 4, 6 - i, 1, C.rune);
  b.rect(cx - 3, 86, 6, 1, C.runeHot);

  // ── цевьё под стволом ──
  b.cylinder(84, 120, 19, 23, cx - 1, WOOD);
  b.grain(cx - 16, 88, cx + 16, 118, C.w0, 4711);
  b.band(83, 4, () => 20, cx - 1, BRASS);
  b.band(116, 4, () => 23, cx - 1, BRASS);

  // ── ствольная коробка ──
  b.rect(cx - 36, 116, 78, 38, C.s2);
  b.rect(cx - 36, 116, 78, 3, C.s4);
  b.rect(cx - 36, 119, 3, 32, C.s3);
  b.rect(cx + 39, 119, 3, 32, C.s0);
  b.rect(cx - 36, 150, 78, 4, C.s0);
  // накладка замка
  b.rect(cx - 28, 122, 56, 24, C.s3);
  b.rect(cx - 28, 122, 56, 1, C.s5);
  b.rect(cx - 28, 145, 56, 1, C.s0);
  b.screw(cx - 22, 128, 3, C.b1, C.b0, C.b3);
  b.screw(cx + 22, 141, 3, C.b1, C.b0, C.b3);
  // курок над коробкой
  b.rect(cx + 14, 106, 7, 14, C.s1);
  b.rect(cx + 14, 106, 2, 14, C.s3);
  b.rect(cx + 11, 103, 12, 5, C.s2);
  b.rect(cx + 11, 103, 12, 1, C.s4);
  b.rect(cx + 12, 108, 3, 2, C.s0);
  // рунная пластина на замке
  b.rect(cx - 22, 130, 26, 12, C.s1);
  b.rect(cx - 13, 131, 1, 10, C.rune);
  b.rect(cx - 17, 134, 9, 1, C.runeHot);
  b.set(cx - 16, 133, C.rune);
  b.set(cx - 9, 133, C.rune);
  b.set(cx - 16, 135, C.rune);
  b.set(cx - 9, 135, C.rune);
  b.rect(cx - 15, 139, 5, 1, C.rune);

  // ── спусковая скоба и спуск ──
  for (let x = -12; x <= 14; x++) {
    const y = 154 + Math.round((x * x) / 30);
    b.rect(cx + x, y, 1, 5, C.s2);
    b.set(cx + x, y, C.s4);
  }
  b.rect(cx - 12, 154, 3, 7, C.s2);
  b.rect(cx + 12, 154, 3, 7, C.s2);
  b.rect(cx + 1, 154, 3, 10, C.s3);
  b.rect(cx + 1, 154, 1, 10, C.s5);

  // ── приклад уходит вправо-вниз ──
  b.cylinder(146, H - 1, 22, 34, cx + 52, WOOD);
  b.grain(cx + 36, 152, cx + 74, H - 2, C.w0, 9931);
  b.band(146, 4, () => 22, cx + 52, BRASS);

  // ── кисти: левая на цевье, правая на шейке ──
  b.grip(cx - 30, 90, 26, 30, 1, C.g0, C.g1, C.g2, C.line);
  b.grip(cx + 14, 152, 26, 28, -1, C.g0, C.g1, C.g2, C.line);

  return [cx, 15];
}

function crossbow(b: PixBuf, cx: number): [number, number] {
  // ложе
  b.cylinder(52, H - 1, 13, 22, cx + 2, WOOD);
  b.grain(cx - 8, 60, cx + 14, H - 4, C.w0, 3313);
  // направляющая
  b.rect(cx - 5, 30, 11, 108, C.s2);
  b.rect(cx - 5, 30, 3, 108, C.s4);
  b.rect(cx + 4, 30, 2, 108, C.s0);
  // плечи дуги
  for (let x = -78; x <= 78; x++) {
    const y = 40 + Math.round((x * x) / 96);
    const th = 6 - Math.floor(Math.abs(x) / 26);
    b.rect(cx + x, y, 1, th, C.s2);
    b.set(cx + x, y, C.s4);
    if (Math.abs(x) > 70) b.set(cx + x, y + th, C.b1);
  }
  // тетива
  for (let x = -76; x <= 76; x++) {
    const y0 = 46 + Math.round((x * x) / 96);
    const y = y0 + Math.round((1 - Math.abs(x) / 76) * 16);
    b.set(cx + x, y, C.s5);
  }
  // болт с наконечником
  b.rect(cx - 2, 8, 5, 54, C.s2);
  b.rect(cx - 2, 8, 2, 54, C.s4);
  b.ellipse(cx, 8, 4, 6, C.s3);
  b.rect(cx - 1, 2, 3, 8, C.s5);
  // замок и скоба
  b.rect(cx - 14, 112, 32, 22, C.s2);
  b.rect(cx - 14, 112, 32, 2, C.s4);
  b.screw(cx - 8, 120, 3, C.b1, C.b0, C.b3);
  b.rect(cx - 12, 122, 8, 1, C.rune);
  for (let x = -8; x <= 10; x++) {
    const y = 136 + Math.round((x * x) / 22);
    b.rect(cx + x, y, 1, 3, C.s2);
  }
  b.rect(cx, 136, 3, 8, C.s3);
  // кисти
  b.grip(cx - 26, 70, 24, 26, 1, C.g0, C.g1, C.g2, C.line);
  b.grip(cx + 2, 138, 24, 26, -1, C.g0, C.g1, C.g2, C.line);
  return [cx, 4];
}

function censer(b: PixBuf, cx: number): [number, number] {
  // цепь
  for (let i = 0; i < 12; i++) {
    const y = 56 + i * 6;
    const x = cx + 26 + Math.round(Math.sin(i * 0.8) * 4);
    b.ellipse(x, y, 3, 3, C.s2);
    b.set(x - 1, y - 1, C.s4);
  }
  // чаша
  b.cylinder(40, 84, 30, 20, cx - 4, BRASS);
  b.band(36, 6, () => 32, cx - 4, BRASS);
  b.grain(cx - 26, 48, cx + 18, 80, C.b0, 1777);
  // прорези с жаром
  for (let i = 0; i < 3; i++) {
    const y = 54 + i * 9;
    b.rect(cx - 16 + i * 3, y, 22 - i * 4, 2, C.rune);
    b.rect(cx - 14 + i * 3, y, 8, 1, C.runeHot);
  }
  // крышка
  b.cylinder(20, 38, 8, 30, cx - 4, BRASS);
  b.ellipse(cx - 4, 18, 5, 4, C.b2);
  // кисть на цепи
  b.grip(cx + 12, 126, 28, 32, -1, C.g0, C.g1, C.g2, C.line);
  return [cx - 4, 24];
}

function build(id: WeaponId): { body: HTMLCanvasElement; flash: HTMLCanvasElement; muzzle: [number, number] } {
  const b = new PixBuf(W, H);
  const cx = W >> 1;
  const muzzle = id === 'crossbow' ? crossbow(b, cx) : id === 'censer' ? censer(b, cx) : cannon(b, cx);

  b.outline(C.line);
  const body = b.toCanvas(PAL);

  // вспышка: пиксельная звезда из лучей разной длины
  const fb = new PixBuf(W, H);
  const [mx, my] = muzzle;
  const FL = ['#00000000', '#00000000', '#ffe9a8', '#ff9c3c', '#fff8e0', '#ffcf6a'];
  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2;
    const len = a % 3 === 0 ? 30 : a % 2 ? 15 : 22;
    for (let r = 0; r <= len; r++) {
      const c = r < len * 0.3 ? 4 : r < len * 0.65 ? 2 : 3;
      const th = r < len * 0.4 ? 1 : 0;
      for (let o = -th; o <= th; o++) {
        fb.set(mx + Math.round(Math.cos(ang) * r) + o, my + Math.round(Math.sin(ang) * r * 0.8), c);
      }
    }
  }
  fb.ellipse(mx, my, 11, 8, 5);
  fb.ellipse(mx, my, 8, 6, 2);
  fb.ellipse(mx, my, 5, 4, 4);
  const flash = fb.toCanvas(FL);

  return { body, flash, muzzle };
}

export function weaponArt(id: WeaponId): { body: HTMLCanvasElement; flash: HTMLCanvasElement; muzzle: [number, number] } {
  let hit = cache.get(id);
  if (!hit) {
    hit = build(id);
    cache.set(id, hit);
  }
  return hit;
}

export const WEAPON_ART = { W, H };
