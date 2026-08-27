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

const W = 104;
const H = 92;
const cache = new Map<string, { body: HTMLCanvasElement; flash: HTMLCanvasElement; muzzle: [number, number] }>();

/** палитра: 0 — прозрачно, дальше сталь, дерево, кожа, руны */
const PAL = [
  '#00000000',
  '#0a0b10', // 1 контур
  '#1b1f29', // 2 сталь тень
  '#2f3542', // 3 сталь
  '#454d5e', // 4 сталь свет
  '#6b7488', // 5 сталь блик
  '#241a11', // 6 дерево тень
  '#3d2a19', // 7 дерево
  '#5a4026', // 8 дерево свет
  '#171a22', // 9 перчатка тень
  '#262b38', // 10 перчатка
  '#39404f', // 11 перчатка свет
  '#05060a', // 12 жерло
  '#d8b45c', // 13 руна
  '#fff0c0', // 14 руна ярко
];
const C = {
  line: 1,
  dark: 2,
  steel: 3,
  lit: 4,
  spec: 5,
  woodD: 6,
  wood: 7,
  woodL: 8,
  gloveD: 9,
  glove: 10,
  gloveL: 11,
  bore: 12,
  rune: 13,
  runeL: 14,
};

/** кисть в перчатке: скруглённый блок с полосами пальцев */
function hand(b: PixBuf, x: number, y: number, w: number, h: number): void {
  b.rect(x + 1, y, w - 2, h, C.glove);
  b.rect(x, y + 1, w, h - 2, C.glove);
  b.rect(x + 1, y + 1, w - 2, 2, C.gloveL);
  b.rect(x + 1, y + h - 3, w - 2, 2, C.gloveD);
  for (let i = 1; i < 3; i++) {
    b.rect(x + 2, y + 2 + i * Math.max(2, Math.floor(h / 4)), w - 4, 1, C.gloveD);
  }
}

function build(id: WeaponId): { body: HTMLCanvasElement; flash: HTMLCanvasElement; muzzle: [number, number] } {
  const b = new PixBuf(W, H);
  const cx = W >> 1;
  let muzzle: [number, number] = [cx, 8];
  const glowIdx = C.rune;

  if (id === 'crossbow') {
    muzzle = [cx, 4];
    // ложе
    b.taper(30, H - 1, 5, 9, cx + 1, C.wood);
    b.rect(cx - 3, 30, 2, H - 30, C.woodL);
    // дуга
    for (let x = -30; x <= 30; x++) {
      const y = 34 + Math.round((x * x) / 46);
      b.rect(cx + x, y, 1, 4, C.steel);
      b.set(cx + x, y, C.lit);
    }
    // тетива
    for (let x = -29; x <= 29; x++) {
      const y = 38 + Math.round((x * x) / 46) + Math.round((1 - Math.abs(x) / 29) * 7);
      b.set(cx + x, y, C.spec);
    }
    // болт
    b.rect(cx - 1, 4, 3, 40, C.steel);
    b.rect(cx - 1, 4, 1, 40, C.lit);
    b.ellipse(cx, 5, 2, 3, C.spec);
    // руны на ложе
    b.rect(cx - 2, 50, 5, 1, glowIdx);
    b.rect(cx, 52, 1, 6, glowIdx);
    hand(b, cx - 14, 52, 13, 12);
    hand(b, cx + 2, 68, 14, 14);
  } else if (id === 'censer') {
    muzzle = [cx - 2, 24];
    // цепь
    for (let i = 0; i < 9; i++) b.set(cx + 8 + Math.round(Math.sin(i) * 2), 34 + i * 4, C.steel);
    // чаша
    b.taper(24, 40, 13, 8, cx - 2, C.wood);
    b.rect(cx - 17, 21, 30, 4, C.steel);
    b.rect(cx - 17, 21, 30, 1, C.lit);
    b.rect(cx - 8, 30, 3, 1, glowIdx);
    b.rect(cx - 2, 34, 5, 1, glowIdx);
    hand(b, cx + 2, 62, 16, 16);
  } else {
    muzzle = [cx, 6];
    // приклад уходит вправо за кадр
    b.taper(58, H - 1, 8, 15, cx + 22, C.wood);
    b.rect(cx + 15, 60, 3, H - 60, C.woodL);
    // ствол сужается кверху
    b.taper(10, 46, 6, 16, cx, C.steel);
    b.taper(10, 46, 2, 5, cx - 4, C.lit);
    b.taper(10, 46, 1, 3, cx + 12, C.dark);
    // дульное кольцо и жерло
    b.rect(cx - 8, 5, 17, 6, C.steel);
    b.rect(cx - 8, 5, 17, 1, C.spec);
    b.ellipse(cx, 8, 5, 2, C.bore);
    // обручи
    b.rect(cx - 10, 20, 20, 3, C.lit);
    b.rect(cx - 14, 33, 28, 3, C.lit);
    // руны вдоль ствола
    for (let i = 0; i < 4; i++) b.rect(cx - 3 + i, 26 + i * 5, 4, 1, glowIdx);
    // ствольная коробка
    b.rect(cx - 19, 46, 40, 16, C.steel);
    b.rect(cx - 19, 46, 40, 2, C.lit);
    b.rect(cx - 19, 60, 40, 2, C.dark);
    b.rect(cx - 15, 50, 30, 3, C.dark);
    // скоба
    b.rect(cx + 2, 62, 12, 2, C.steel);
    b.rect(cx + 2, 62, 2, 6, C.steel);
    b.rect(cx + 12, 62, 2, 6, C.steel);
    hand(b, cx - 24, 52, 15, 14);
    hand(b, cx + 1, 66, 16, 16);
  }

  b.outline(C.line);
  const body = b.toCanvas(PAL);

  // вспышка: те же пиксели, звезда из прямоугольников
  const fb = new PixBuf(W, H);
  const [mx, my] = muzzle;
  const FL = ['#00000000', '#00000000', '#ffe9a8', '#ffc453', '#fff8e0'];
  for (let r = 1; r <= 13; r++) {
    const c = r < 4 ? 4 : r < 8 ? 2 : 3;
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      const len = r * (a % 2 ? 0.62 : 1);
      fb.set(mx + Math.round(Math.cos(ang) * len), my + Math.round(Math.sin(ang) * len * 0.8), c);
    }
  }
  fb.ellipse(mx, my, 5, 4, 4);
  fb.ellipse(mx, my, 3, 2, 2);
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
