import type { ModKey } from '../types';
import { RNG } from '../engine/rng';

export type BuffTier = 'common' | 'rare' | 'epic';

export interface TowerBuff {
  id: string;
  name: string;
  icon: string;
  tier: BuffTier;
  text: string;
  mods?: Partial<Record<ModKey, number>>;
  special?: 'heal50' | 'healFull' | 'reviveAll';
}

export const TOWER_BUFFS: TowerBuff[] = [
  { id: 'atk1', name: 'Острый край', icon: '🗡️', tier: 'common', text: '+10% ATK отряду', mods: { atk: 10 } },
  { id: 'hp1', name: 'Толстая кожа', icon: '🧱', tier: 'common', text: '+12% HP отряду', mods: { hp: 12 } },
  { id: 'def1', name: 'Пластины', icon: '🛡️', tier: 'common', text: '+14% DEF отряду', mods: { def: 14 } },
  { id: 'spd1', name: 'Лёгкий шаг', icon: '💨', tier: 'common', text: '+6% скорости', mods: { spd: 6 } },
  { id: 'crit1', name: 'Слабое место', icon: '🎯', tier: 'common', text: '+8% шанса крита', mods: { crit: 8 } },
  { id: 'haste1', name: 'Прилив сил', icon: '⚡', tier: 'common', text: '+12% скорости энергии', mods: { haste: 12 } },
  { id: 'ls1', name: 'Жажда', icon: '🩸', tier: 'common', text: '+7% вампиризма', mods: { lifesteal: 7 } },
  { id: 'heal1', name: 'Перевязка', icon: '✚', tier: 'common', text: 'Лечит отряд на 50% HP', special: 'heal50' },

  { id: 'atk2', name: 'Ярость затмения', icon: '🔥', tier: 'rare', text: '+18% ATK, −5% HP', mods: { atk: 18, hp: -5 } },
  { id: 'cd2', name: 'Точный расчёт', icon: '💥', tier: 'rare', text: '+30% крит-урона', mods: { critDmg: 30 } },
  { id: 'dr2', name: 'Каменная воля', icon: '🪨', tier: 'rare', text: '−10% получаемого урона', mods: { dmgTaken: -10 } },
  { id: 'dd2', name: 'Резонанс', icon: '📡', tier: 'rare', text: '+12% наносимого урона', mods: { dmgDealt: 12 } },
  { id: 'hp2', name: 'Сердце рощи', icon: '🌿', tier: 'rare', text: '+22% HP и +12% силы лечения', mods: { hp: 22, healPower: 12 } },
  { id: 'spd2', name: 'Ускорение', icon: '🌀', tier: 'rare', text: '+10% скорости, +8% энергии', mods: { spd: 10, haste: 8 } },
  { id: 'heal2', name: 'Живая вода', icon: '💧', tier: 'rare', text: 'Полностью лечит отряд', special: 'healFull' },
  { id: 'crit2', name: 'Глаз бури', icon: '👁️', tier: 'rare', text: '+14% крита, +14% крит-урона', mods: { crit: 14, critDmg: 14 } },

  { id: 'atk3', name: 'Клинок Затмения', icon: '🌑', tier: 'epic', text: '+28% ATK и +8% наносимого урона', mods: { atk: 28, dmgDealt: 8 } },
  { id: 'tank3', name: 'Бастион', icon: '🏰', tier: 'epic', text: '+30% DEF, −14% получаемого урона', mods: { def: 30, dmgTaken: -14 } },
  { id: 'vamp3', name: 'Алый пир', icon: '🍷', tier: 'epic', text: '+16% вампиризма и +14% ATK', mods: { lifesteal: 16, atk: 14 } },
  { id: 'rush3', name: 'Штурм', icon: '🚀', tier: 'epic', text: '+25% энергии и +12% скорости', mods: { haste: 25, spd: 12 } },
  { id: 'rev3', name: 'Второй шанс', icon: '🕊️', tier: 'epic', text: 'Воскрешает павших и лечит отряд', special: 'reviveAll' },
  { id: 'exec3', name: 'Палач', icon: '⚰️', tier: 'epic', text: '+45% крит-урона и +10% крита', mods: { critDmg: 45, crit: 10 } },
];

export const BUFF_BY_ID: Record<string, TowerBuff> = Object.fromEntries(TOWER_BUFFS.map((b) => [b.id, b]));

const TIER_WEIGHT: Record<BuffTier, number> = { common: 62, rare: 30, epic: 8 };

export function draftBuffs(rng: RNG, floor: number, count = 3): string[] {
  const bonus = Math.min(22, Math.floor(floor / 5) * 3);
  const pool: [TowerBuff, number][] = TOWER_BUFFS.map((b) => [
    b,
    TIER_WEIGHT[b.tier] + (b.tier === 'epic' ? bonus : b.tier === 'rare' ? bonus / 2 : 0),
  ]);
  const out: string[] = [];
  const taken = new Set<string>();
  let guard = 0;
  while (out.length < count && guard < 60) {
    guard++;
    const b = rng.weighted(pool);
    if (taken.has(b.id)) continue;
    taken.add(b.id);
    out.push(b.id);
  }
  return out;
}

export function towerReward(floor: number): { echo: number; gold: number; gems: number; exp: number; dust: number } {
  return {
    echo: Math.round(8 + floor * 2.2),
    gold: Math.round(220 + floor * 70),
    exp: Math.round(180 + floor * 60),
    dust: Math.round(6 + floor * 2),
    gems: floor % 5 === 0 ? 30 : 0,
  };
}
