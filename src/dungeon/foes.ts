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

export type FoeId = 'stray' | 'alley' | 'hex' | 'brute' | 'lance' | 'matron';
export type Tier = 'foe' | 'elite' | 'boss';

/**
 * Покрой наряда. Каждый кроится своим набором деталей, а не перекраской:
 * лохмотья с голым плечом, матроска, мантия с разрезом, боевая сбруя,
 * доспех с наплечниками, платье в пол.
 */
export type Outfit = 'rags' | 'sailor' | 'robe' | 'harness' | 'armor' | 'gown';

/** внешность: палитра и телосложение */
export interface Skin {
  /** тень, тон, свет кожи */
  skin: [string, string, string];
  /** тень, тон, свет волос */
  hair: [string, string, string];
  /** тень, тон, свет юбки */
  cloth: [string, string, string];
  /** тень, тон, свет верха — блузка, топ, лиф */
  top: [string, string, string];
  /** тень и тон чулок */
  sock: [string, string];
  /** докуда натянуты чулки: 0 — нет, 1 — под самую юбку */
  sockH: number;
  /** полоса живота между верхом и юбкой, 0..1 */
  bare: number;
  /** длина юбки в долях бедра */
  skirt: number;
  /** покрой */
  outfit: Outfit;
  /** тень и блик металла: пряжки, наплечники, украшения */
  metal: [string, string];
  /** белок глаза и блики на ткани */
  lite: string;
  /** кант, пояс, ленты */
  trim: string;
  /** светящиеся глаза */
  eye: string;
  /** розовая изнанка уха */
  ear: string;
  /** когти или клинок */
  claw: [string, string];
  /** сапоги и перчатки */
  boot: [string, string];
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
  where: FloorId[];
  /** сколько таких ставить в стае */
  count: number;
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
    scale: 1.05,
    where: ['crypt', 'catacomb'],
    count: 2,
    aura: '#9aa4b8',
    skin: {
      skin: ['#7a5a4c', '#a67c66', '#c99b80'],
      hair: ['#2b2b33', '#474753', '#6a6a78'],
      cloth: ['#3a2f28', '#5b4838', '#7d6449'],
      top: ['#8a7a63', '#b8a686', '#e2d4b6'],
      sock: ['#3a3038', '#5e5060'],
      sockH: 0.35,
      bare: 0.55,
      skirt: 0.95,
      outfit: 'rags',
      metal: ['#4a4038', '#9a8e78'],
      lite: '#efe6d6',
      trim: '#8d6b3f',
      eye: '#ffe27a',
      ear: '#c47b84',
      claw: ['#6d6f78', '#c6cad4'],
      rim: '#4d5871',
      boot: ['#241f1c', '#3f3730'],
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
    aura: '#e08a3c',
    skin: {
      skin: ['#7d5546', '#ab7a5f', '#d09b78'],
      hair: ['#7a3510', '#b25a1c', '#e08a3c'],
      cloth: ['#1f3a2c', '#2f5a41', '#437a58'],
      top: ['#8a8a92', '#c2c2ca', '#f0f0f4'],
      sock: ['#2e3a34', '#4a5c50'],
      sockH: 0.75,
      bare: 0.35,
      skirt: 0.85,
      outfit: 'sailor',
      metal: ['#6a5a2c', '#e0c874'],
      lite: '#f4f2ee',
      trim: '#c9b070',
      eye: '#8affc4',
      ear: '#d08a8a',
      claw: ['#6d6f78', '#d6dae4'],
      rim: '#8f5726',
      boot: ['#241f1c', '#40382f'],
      tall: 116,
      broad: 34,
      mane: 0.14,
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
    aura: '#a06cff',
    skin: {
      skin: ['#7a5a70', '#a67d99', '#cd9fbc'],
      hair: ['#3a1c5c', '#5c2e8c', '#8a52c6'],
      cloth: ['#1b1430', '#2e2050', '#4a3378'],
      top: ['#4a3670', '#6d4fa8', '#9a78d8'],
      sock: ['#1d1630', '#33264f'],
      sockH: 0.9,
      bare: 0.5,
      skirt: 1.05,
      outfit: 'robe',
      metal: ['#3a2a58', '#c0a0f0'],
      lite: '#efe4ff',
      trim: '#a06cff',
      eye: '#d0a4ff',
      ear: '#b06f9a',
      claw: ['#4a3a6a', '#a88cd8'],
      rim: '#63419a',
      boot: ['#120e20', '#231a36'],
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
    hp: 105,
    dmg: 16,
    speed: 1.25,
    reach: 1.45,
    cool: 1.15,
    wind: 0.5,
    bolts: 0,
    boltSpeed: 0,
    pain: 0.25,
    sight: 12,
    scale: 1.4,
    where: ['crypt', 'catacomb', 'sanctum'],
    count: 1,
    aura: '#ff5a48',
    skin: {
      skin: ['#8a6350', '#bb8c6e', '#e0b28c'],
      hair: ['#5a4642', '#8a6a62', '#bfa096'],
      cloth: ['#5a1418', '#8e2a24', '#c4553c'],
      top: ['#2a1e26', '#463442', '#68505f'],
      sock: ['#3a1c1e', '#5e2e2c'],
      sockH: 0.22,
      bare: 0.85,
      skirt: 0.8,
      outfit: 'harness',
      metal: ['#5c4420', '#e8c268'],
      lite: '#f6ece0',
      trim: '#e0b048',
      eye: '#ff6a52',
      ear: '#cf8288',
      claw: ['#5c5f68', '#e2e6ee'],
      rim: '#95392e',
      boot: ['#2a1416', '#4a2422'],
      tall: 158,
      broad: 48,
      mane: 0.28,
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
    aura: '#5ac8ff',
    skin: {
      skin: ['#6d5a55', '#98807a', '#c0a49b'],
      hair: ['#123a5c', '#1f5f92', '#3d92cc'],
      cloth: ['#26303e', '#3d4c62', '#5f748f'],
      top: ['#5a6a80', '#93aac4', '#d6e8f6'],
      sock: ['#1e2a36', '#33485c'],
      sockH: 0.8,
      bare: 0.85,
      skirt: 0.9,
      outfit: 'armor',
      metal: ['#43596e', '#cfe6f6'],
      lite: '#eef6ff',
      trim: '#5ac8ff',
      eye: '#9be4ff',
      ear: '#bb8090',
      claw: ['#3c5a6e', '#bfeaff'],
      rim: '#35789c',
      boot: ['#1a2029', '#2e3948'],
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
    aura: '#ffb03a',
    skin: {
      skin: ['#7a5860', '#a67b83', '#cfa0a6'],
      hair: ['#1c1826', '#332c44', '#554a68'],
      cloth: ['#2a1c38', '#463060', '#6b4a8c'],
      top: ['#3a2a44', '#5c4268', '#8a6a96'],
      sock: ['#241a2c', '#3e2e46'],
      sockH: 0.85,
      bare: 0.75,
      skirt: 1.35,
      outfit: 'gown',
      metal: ['#6a4c14', '#ffd479'],
      lite: '#f6e8ff',
      trim: '#ffb03a',
      eye: '#ffcf5a',
      ear: '#c07a86',
      claw: ['#6a5220', '#ffd88a'],
      rim: '#6a4a1c',
      boot: ['#141018', '#2a2130'],
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
