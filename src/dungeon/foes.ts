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
      skin: '#bb8c6e',
      hair: '#8a6a62',
      cloth: '#8e2a24',
      top: '#463442',
      sock: '#5e2e2c',
      sockH: 0.22,
      bare: 0.85,
      skirt: 0.8,
      outfit: 'harness',
      metal: '#8e97a6',
      lite: '#f6ece0',
      trim: '#e0b048',
      eye: '#ff6a52',
      ear: '#cf8288',
      claw: '#b9c2ce',
      rim: '#95392e',
      boot: '#4a2422',
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
