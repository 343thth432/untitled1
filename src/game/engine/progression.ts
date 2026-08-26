import type { Rarity, Reward } from '../types';
import { MAX_LEVEL, MAX_STARS } from './stats';
import { stagePower } from '../data/campaign';

// ── Уровни героинь ───────────────────────────────────────────
export function expToNext(level: number): number {
  if (level >= MAX_LEVEL) return Infinity;
  return Math.round(48 * Math.pow(level, 1.42) + 40);
}

export function goldToNext(level: number): number {
  if (level >= MAX_LEVEL) return Infinity;
  return Math.round(expToNext(level) * 1.4);
}

// ── Возвышение ───────────────────────────────────────────────
const ASCEND_BASE = [0, 20, 45, 95, 190, 340];
const RARITY_ASCEND: Record<Rarity, number> = { rare: 0.6, epic: 0.85, legend: 1.15, mythic: 1.5 };

export function ascendCost(rarity: Rarity, currentStars: number): { shards: number; dust: number } | null {
  if (currentStars >= MAX_STARS) return null;
  const shards = Math.round(ASCEND_BASE[currentStars] * RARITY_ASCEND[rarity]);
  return { shards, dust: Math.round(shards * 0.8) };
}

// ── Ранг командира ───────────────────────────────────────────
export function commanderLevel(stagesCleared: number, towerBest: number): number {
  return 1 + Math.floor(stagesCleared / 3) + Math.floor(towerBest / 5);
}

/** Максимальный уровень героинь ограничен рангом командира */
export function heroLevelCap(commander: number): number {
  return Math.min(MAX_LEVEL, 12 + commander * 2);
}

// ── Награды ──────────────────────────────────────────────────
export function stageReward(index: number, first: boolean): Reward {
  const p = stagePower(index);
  const r: Reward = {
    gold: Math.round(220 * p),
    exp: Math.round(180 * p),
    dust: Math.round(4 * p),
  };
  if (first) {
    r.gems = index % 12 === 11 ? 120 : 25;
    r.scrolls = index % 4 === 3 ? 1 : 0;
    r.gear = index % 3 === 0 ? 1 : 0;
  } else if (index % 5 === 0) {
    r.gear = 1;
  }
  return r;
}

export interface AfkRates {
  gold: number;
  exp: number;
  dust: number;
  gems: number;
  shards: number;
}

export const AFK_CAP_HOURS = 12;

export function afkRates(index: number): AfkRates {
  const p = stagePower(index);
  return {
    gold: Math.round(1150 * p),
    exp: Math.round(950 * p),
    dust: Math.round(32 * p),
    gems: Math.round(9 + p * 1.6),
    shards: Math.max(1, Math.round(1.2 + p * 0.55)),
  };
}

export function afkAccrued(index: number, seconds: number): AfkRates & { hours: number; capped: boolean } {
  const capSec = AFK_CAP_HOURS * 3600;
  const s = Math.min(seconds, capSec);
  const h = s / 3600;
  const r = afkRates(index);
  return {
    gold: Math.floor(r.gold * h),
    exp: Math.floor(r.exp * h),
    dust: Math.floor(r.dust * h),
    gems: Math.floor(r.gems * h),
    shards: Math.floor(r.shards * h),
    hours: h,
    capped: seconds >= capSec,
  };
}

// ── Призыв ───────────────────────────────────────────────────
export const SUMMON_GEM_COST = 280;
export const SUMMON_RATES: [Rarity, number][] = [
  ['rare', 0.55],
  ['epic', 0.32],
  ['legend', 0.11],
  ['mythic', 0.02],
];
export const PITY_LEGEND = 20;
export const PITY_MYTHIC = 80;

/** Осколки за дубликат */
export function dupeShards(rarity: Rarity): number {
  return { rare: 12, epic: 20, legend: 32, mythic: 55 }[rarity];
}
