import type { FloorId } from '../game/types';

/**
 * Обитательницы подземелья: кошкодевочки. Роли расписаны по образцу
 * бестиария Doom — мелочь, которая берёт числом, стрелки, тяжёлая туша
 * ближнего боя и хозяйка этажа.
 *
 * Спрайты движок собирает сам (foeArt.ts): свободных наборов с восемью
 * ракурсами, замахом, болью и смертью для таких персонажей нет, а тащить
 * чужие арты из сети нельзя. Зато параметрический рисунок даёт ровный
 * стиль и сколько угодно разных тварей.
 */

export type FoeId = 'stray' | 'alley' | 'wing' | 'wolf' | 'brute' | 'stalk' | 'sphinx';
export type Tier = 'foe' | 'elite' | 'boss';

/**
 * Покрой наряда. Каждый кроится своим набором деталей, а не перекраской:
 * лохмотья с голым плечом, матроска, мантия с разрезом, боевая сбруя,
 * доспех с наплечниками, платье в пол.
 */
export type Outfit = 'rags' | 'sailor' | 'robe' | 'harness' | 'armor' | 'gown';

/**
 * Походка. Поза считается из неё, поэтому тяжёлая переваливается с ноги
 * на ногу и держит руки враскачку, а ворожея почти плывёт.
 */
export interface Gait {
  /** размах шага */
  stride: number;
  /** размах рук при ходьбе */
  swing: number;
  /** покачивание таза */
  bounce: number;
  /** постоянный наклон корпуса вперёд */
  stoop: number;
  /** насколько руки отведены от корпуса */
  wide: number;
  /** резкость замаха и отдачи от боли */
  snap: number;
}

/** внешность: палитра и телосложение */
export interface Skin {
  /** базовые цвета материалов: рампу из каждого строит освещение */
  skin: string;
  hair: string;
  cloth: string;
  top: string;
  sock: string;
  /** докуда натянуты чулки: 0 — нет, 1 — под самую юбку */
  sockH: number;
  /** полоса живота между верхом и юбкой, 0..1 */
  bare: number;
  /** длина юбки в долях бедра */
  skirt: number;
  /** покрой */
  outfit: Outfit;
  /** металл: пряжки, наплечники, украшения */
  metal: string;
  /** белок глаза */
  lite: string;
  /** кант, пояс, ленты */
  trim: string;
  /** светящиеся глаза */
  eye: string;
  /** розовая изнанка уха */
  ear: string;
  /** когти или клинок */
  claw: string;
  /** сапоги и перчатки */
  boot: string;
  /** контровой свет по кромке — по нему тварь видно во мгле */
  rim: string;
  /** рост фигуры в пикселях буфера */
  tall: number;
  /** ширина плеч в пикселях */
  broad: number;
  /** длина гривы: 0 — стрижка, 1 — до пояса */
  mane: number;
  /** пушистость хвоста */
  tail: number;
}

export interface FoeDef {
  id: FoeId;
  name: string;
  tier: Tier;
  hp: number;
  /** урон за удар или снаряд */
  dmg: number;
  /** клеток в секунду */
  speed: number;
  /** дальность когтей в клетках */
  reach: number;
  /** пауза между атаками, с */
  cool: number;
  /** замах перед ударом, с */
  wind: number;
  /** снарядов за атаку; 0 — только ближний бой */
  bolts: number;
  /** скорость снаряда, клеток в секунду */
  boltSpeed: number;
  /** вероятность уйти в «боль» от попадания */
  pain: number;
  /** радиус пробуждения в клетках */
  sight: number;
  /** высота в клетках мира */
  scale: number;
  /** высота полёта в долях своего роста; 0 или нет поля — ходит по полу */
  fly?: number;
  /** рывок в замахе: клеток в секунду, на которые тварь наваливается
   *  вперёд, пока заносит когти. 0 или нет поля — бьёт с места */
  lunge?: number;
  where: FloorId[];
  /** сколько таких ставить в стае */
  count: number;
  /** походка */
  gait: Gait;
  aura: string;
  skin: Skin;
}

const LIST: FoeDef[] = [
  {
    id: 'stray',
    name: 'Драная',
    tier: 'foe',
    hp: 34,
    dmg: 7,
    speed: 1.5,
    reach: 1.15,
    cool: 1.3,
    wind: 0.36,
    bolts: 0,
    boltSpeed: 0,
    pain: 0.7,
    sight: 11,
    scale: 0.82,
    where: ['crypt', 'catacomb'],
    count: 2,
    gait: { stride: 1.05, swing: 1.15, bounce: 1, stoop: 3, wide: 0.95, snap: 1 },
    aura: '#9aa4b8',
    skin: {
      skin: '#a67c66',
      hair: '#474753',
      cloth: '#5b4838',
      top: '#b8a686',
      sock: '#5e5060',
      sockH: 0.35,
      bare: 0.55,
      skirt: 0.95,
      outfit: 'rags',
      metal: '#9a8e78',
      lite: '#efe6d6',
      trim: '#8d6b3f',
      eye: '#ffe27a',
      ear: '#c47b84',
      claw: '#c6cad4',
      rim: '#4d5871',
      boot: '#3f3730',
      tall: 126,
      broad: 38,
      mane: 0.3,
      tail: 0.8,
    },
  },
  {
    id: 'alley',
    name: 'Подворотня',
    tier: 'foe',
    hp: 28,
    dmg: 5,
    speed: 2.05,
    reach: 1.05,
    cool: 0.9,
    wind: 0.26,
    bolts: 0,
    boltSpeed: 0,
    pain: 0.85,
    sight: 12,
    scale: 0.98,
    where: ['crypt', 'catacomb', 'sanctum'],
    count: 3,
    gait: { stride: 1.2, swing: 1.35, bounce: 1.5, stoop: 1, wide: 0.8, snap: 1.25 },
    aura: '#e08a3c',
    skin: {
      skin: '#ab7a5f',
      hair: '#b25a1c',
      cloth: '#2f5a41',
      top: '#c2c2ca',
      sock: '#4a5c50',
      sockH: 0.75,
      bare: 0.35,
      skirt: 0.85,
      outfit: 'sailor',
      metal: '#e0c874',
      lite: '#f4f2ee',
      trim: '#c9b070',
      eye: '#8affc4',
      ear: '#d08a8a',
      claw: '#d6dae4',
      rim: '#8f5726',
      boot: '#40382f',
      tall: 116,
      broad: 34,
      mane: 0.14,
      tail: 1,
    },
  },
  {
    id: 'wing',
    name: 'Крылатая',
    tier: 'foe',
    hp: 30,
    dmg: 9,
    // на пятую часть быстрее самой прыткой из обычных
    speed: 2.46,
    reach: 1,
    cool: 1.5,
    wind: 0.4,
    bolts: 1,
    boltSpeed: 7.5,
    pain: 0.8,
    sight: 13,
    scale: 0.76,
    fly: 0.42,
    where: ['crypt', 'catacomb', 'sanctum'],
    count: 2,
    gait: { stride: 1.35, swing: 1.1, bounce: 1.9, stoop: 0, wide: 0.9, snap: 1.4 },
    aura: '#3fd0ff',
    skin: {
      skin: '#f4d0ba',
      hair: '#162435',
      cloth: '#0c1b2b',
      top: '#1c2939',
      sock: '#173b61',
      sockH: 0.8,
      bare: 0.6,
      skirt: 0.7,
      outfit: 'harness',
      metal: '#11a8f0',
      lite: '#cee7e9',
      trim: '#0f8dd2',
      eye: '#4accf5',
      ear: '#c89f8d',
      claw: '#94e4f7',
      rim: '#0c6aab',
      boot: '#0c1b2b',
      tall: 108,
      broad: 32,
      mane: 0.2,
      tail: 1,
    },
  },
  {
    id: 'wolf',
    name: 'Матёрая',
    tier: 'elite',
    hp: 120,
    dmg: 19,
    speed: 1.4,
    reach: 1.4,
    cool: 1.1,
    wind: 0.4,
    bolts: 0,
    boltSpeed: 0,
    pain: 0.3,
    sight: 13,
    scale: 1.7,
    where: ['crypt', 'catacomb', 'sanctum'],
    count: 1,
    gait: { stride: 1.15, swing: 0.95, bounce: 1.2, stoop: 4, wide: 1.05, snap: 1.15 },
    aura: '#ff5ea8',
    skin: {
      skin: '#f8e3da',
      hair: '#281519',
      cloth: '#401e27',
      top: '#45292c',
      sock: '#7d2f4d',
      sockH: 0.62,
      bare: 0.8,
      skirt: 0.6,
      outfit: 'harness',
      metal: '#bf4876',
      lite: '#f8e3da',
      trim: '#f47eb6',
      eye: '#f1aac3',
      ear: '#d0a9a5',
      claw: '#eecac0',
      rim: '#934a5c',
      boot: '#281519',
      tall: 150,
      broad: 40,
      mane: 0.45,
      tail: 1,
    },
  },
  {
    id: 'brute',
    name: 'Тяжёлая',
    tier: 'elite',
    hp: 140,
    dmg: 20,
    // еле переставляет ноги, но замах сокращает дистанцию за неё
    speed: 0.8,
    reach: 1.5,
    cool: 1.6,
    wind: 0.6,
    lunge: 4.6,
    bolts: 0,
    boltSpeed: 0,
    pain: 0.15,
    sight: 12,
    scale: 1.55,
    where: ['crypt', 'catacomb', 'sanctum'],
    count: 1,
    gait: { stride: 0.7, swing: 0.6, bounce: 1.9, stoop: 6, wide: 1.35, snap: 0.7 },
    aura: '#4a9fe0',
    skin: {
      skin: '#f4d1ba',
      hair: '#212734',
      cloth: '#18191e',
      top: '#2d303d',
      sock: '#313340',
      sockH: 0.45,
      bare: 0.85,
      skirt: 0.55,
      outfit: 'harness',
      metal: '#427eb2',
      lite: '#e8f0f8',
      trim: '#3e6b94',
      eye: '#5899d1',
      ear: '#c59681',
      claw: '#b39685',
      rim: '#274d70',
      boot: '#18191e',
      tall: 150,
      broad: 62,
      mane: 0.3,
      tail: 1,
    },
  },
  {
    id: 'stalk',
    name: 'Ловчая',
    tier: 'elite',
    hp: 84,
    dmg: 16,
    speed: 1.9,
    reach: 1.3,
    cool: 1.3,
    wind: 0.45,
    // прыжок с места: разгон вперёд, пока сжимается и летит
    lunge: 6,
    bolts: 0,
    boltSpeed: 0,
    pain: 0.45,
    sight: 14,
    scale: 0.81,
    where: ['crypt', 'catacomb', 'sanctum'],
    count: 1,
    gait: { stride: 1.1, swing: 0.6, bounce: 0.5, stoop: 8, wide: 1.1, snap: 1.4 },
    aura: '#7fc9a8',
    skin: {
      skin: '#d7b1a7',
      hair: '#251f21',
      cloth: '#32282b',
      top: '#372e30',
      sock: '#403233',
      sockH: 0.9,
      bare: 0.3,
      skirt: 0.5,
      outfit: 'rags',
      metal: '#b7948d',
      lite: '#e6dcd8',
      trim: '#544040',
      eye: '#8fbfa8',
      ear: '#caa097',
      claw: '#140f13',
      rim: '#674e4e',
      boot: '#0b090c',
      tall: 120,
      broad: 34,
      mane: 0.85,
      tail: 0.9,
    },
  },
  {
    id: 'sphinx',
    name: 'Девятихвостая',
    tier: 'boss',
    hp: 480,
    dmg: 13,
    speed: 1.05,
    reach: 1.8,
    cool: 1.5,
    wind: 0.7,
    // залп по числу хвостов, которые видно на кадре броска
    bolts: 5,
    boltSpeed: 7.5,
    pain: 0.1,
    sight: 18,
    scale: 2.7,
    where: ['crypt', 'catacomb', 'sanctum'],
    count: 1,
    gait: { stride: 0.9, swing: 0.5, bounce: 0.4, stoop: 2, wide: 1.15, snap: 0.8 },
    aura: '#63de8d',
    skin: {
      skin: '#f2e3da',
      hair: '#edd7cd',
      cloth: '#463a3b',
      top: '#362d31',
      sock: '#534543',
      sockH: 0.4,
      bare: 0.7,
      skirt: 1.1,
      outfit: 'gown',
      metal: '#c8a24e',
      lite: '#f6efe6',
      trim: '#d3b070',
      eye: '#9df1b3',
      ear: '#cfb6ae',
      claw: '#e4d4c9',
      rim: '#3f7a58',
      boot: '#463a3b',
      tall: 150,
      broad: 46,
      mane: 0.9,
      tail: 1,
    },
  },
];

export const FOES: Record<FoeId, FoeDef> = Object.fromEntries(LIST.map((f) => [f.id, f])) as Record<FoeId, FoeDef>;
export const FOE_IDS = LIST.map((f) => f.id);

/** кого можно встретить на этаже в этой роли */
export function foePool(tier: Tier, floor: FloorId): FoeId[] {
  const hit = LIST.filter((f) => f.tier === tier && f.where.includes(floor)).map((f) => f.id);
  return hit.length ? hit : [LIST[0].id];
}

export function bossFor(_floor: FloorId): FoeId {
  return 'sphinx';
}
