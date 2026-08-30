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

export type FoeId = 'stray' | 'alley' | 'wing' | 'hex' | 'brute' | 'lance' | 'matron';
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
    id: 'hex',
    name: 'Ворожея',
    tier: 'foe',
    hp: 44,
    dmg: 11,
    speed: 1.15,
    reach: 1.1,
    cool: 1.9,
    wind: 0.55,
    bolts: 1,
    boltSpeed: 6.5,
    pain: 0.55,
    sight: 14,
    scale: 1.08,
    where: ['crypt', 'catacomb', 'sanctum'],
    count: 1,
    gait: { stride: 0.68, swing: 0.5, bounce: 0.35, stoop: -1, wide: 0.62, snap: 0.7 },
    aura: '#a06cff',
    skin: {
      skin: '#a67d99',
      hair: '#5c2e8c',
      cloth: '#2e2050',
      top: '#6d4fa8',
      sock: '#33264f',
      sockH: 0.9,
      bare: 0.5,
      skirt: 1.05,
      outfit: 'robe',
      metal: '#c0a0f0',
      lite: '#efe4ff',
      trim: '#a06cff',
      eye: '#d0a4ff',
      ear: '#b06f9a',
      claw: '#a88cd8',
      rim: '#63419a',
      boot: '#231a36',
      tall: 134,
      broad: 38,
      mane: 0.62,
      tail: 0.7,
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
    id: 'lance',
    name: 'Копейщица',
    tier: 'elite',
    hp: 76,
    dmg: 13,
    speed: 1.55,
    reach: 1.2,
    cool: 1.35,
    wind: 0.4,
    bolts: 2,
    boltSpeed: 9,
    pain: 0.4,
    sight: 15,
    scale: 1.2,
    where: ['catacomb', 'sanctum'],
    count: 1,
    gait: { stride: 1, swing: 0.7, bounce: 0.55, stoop: 0, wide: 0.72, snap: 1.35 },
    aura: '#5ac8ff',
    skin: {
      skin: '#98807a',
      hair: '#1f5f92',
      cloth: '#3d4c62',
      top: '#5d7085',
      sock: '#33485c',
      sockH: 0.8,
      bare: 0.85,
      skirt: 0.9,
      outfit: 'armor',
      metal: '#cfe6f6',
      lite: '#eef6ff',
      trim: '#5ac8ff',
      eye: '#9be4ff',
      ear: '#bb8090',
      claw: '#bfeaff',
      rim: '#35789c',
      boot: '#2e3948',
      tall: 141,
      broad: 43,
      mane: 0.48,
      tail: 0.9,
    },
  },
  {
    id: 'matron',
    name: 'Хозяйка склепа',
    tier: 'boss',
    hp: 340,
    dmg: 20,
    speed: 1.1,
    reach: 1.7,
    cool: 1.5,
    wind: 0.6,
    bolts: 3,
    boltSpeed: 7.5,
    pain: 0.12,
    sight: 18,
    scale: 2.05,
    where: ['crypt', 'catacomb', 'sanctum'],
    count: 1,
    gait: { stride: 0.55, swing: 0.4, bounce: 0.25, stoop: -2, wide: 0.85, snap: 0.75 },
    aura: '#ffb03a',
    skin: {
      skin: '#a67b83',
      hair: '#332c44',
      cloth: '#463060',
      top: '#5c4268',
      sock: '#3e2e46',
      sockH: 0.85,
      bare: 0.75,
      skirt: 1.35,
      outfit: 'gown',
      metal: '#ffd479',
      lite: '#f6e8ff',
      trim: '#ffb03a',
      eye: '#ffcf5a',
      ear: '#c07a86',
      claw: '#ffd88a',
      rim: '#6a4a1c',
      boot: '#2a2130',
      tall: 168,
      broad: 52,
      mane: 0.66,
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
  return 'matron';
}
