import type { GearItem, HeroDef, HeroSave, ModKey, Stats, StatKey } from '../types';
import { SET_BY_ID } from '../data/gear';
import { buildTree } from '../data/tree';

export interface Derived {
  stats: Stats;
  mods: { dmgDealt: number; dmgTaken: number; healPower: number };
  /** [базовый, ультимейт, пассивка] */
  skillLevels: number[];
  power: number;
  sets: { setId: string; count: number }[];
}

export const MAX_LEVEL = 120;
export const MAX_STARS = 6;

const EMPTY_STATS = (): Stats => ({
  hp: 0, atk: 0, def: 0, spd: 0, crit: 0, critDmg: 0, haste: 0, lifesteal: 0,
});

export function starMultiplier(stars: number): number {
  return 1 + 0.14 * (stars - 1);
}

export function levelMultiplier(def: HeroDef, level: number): number {
  return 1 + def.growth * (level - 1);
}

/** Итоговые характеристики героини с учётом уровня, звёзд, снаряжения и дерева. */
export function deriveHero(
  def: HeroDef,
  save: HeroSave,
  gearById: Record<string, GearItem>,
): Derived {
  const lvlM = levelMultiplier(def, save.level);
  const starM = starMultiplier(save.stars);

  const stats: Stats = {
    hp: def.base.hp * lvlM * starM,
    atk: def.base.atk * lvlM * starM,
    def: def.base.def * lvlM * starM,
    spd: def.base.spd,
    crit: def.base.crit,
    critDmg: def.base.critDmg,
    haste: def.base.haste,
    lifesteal: def.base.lifesteal,
  };

  const flat = EMPTY_STATS();
  const pct = EMPTY_STATS();
  const mods = { dmgDealt: 0, dmgTaken: 0, healPower: 0 };

  const setCount: Record<string, number> = {};

  for (const slot of Object.keys(save.gear) as (keyof HeroSave['gear'])[]) {
    const uid = save.gear[slot];
    if (!uid) continue;
    const item = gearById[uid];
    if (!item) continue;
    setCount[item.setId] = (setCount[item.setId] ?? 0) + 1;
    addStat(item.mainStat, item.mainValue, item.mainPct, flat, pct);
    for (const s of item.subs) addStat(s.stat, s.value, s.pct, flat, pct);
  }

  const sets: { setId: string; count: number }[] = [];
  for (const [setId, count] of Object.entries(setCount)) {
    sets.push({ setId, count });
    const set = SET_BY_ID[setId];
    if (!set) continue;
    if (count >= 2) applyMods(set.bonus2.mods, pct, mods);
    if (count >= 4) applyMods(set.bonus4.mods, pct, mods);
  }

  const skillLevels = [save.stars, save.stars, save.stars];
  const nodes = buildTree(def.role);
  for (const node of nodes) {
    const rank = save.tree[node.id] ?? 0;
    if (rank <= 0) continue;
    applyMods(node.apply(rank), pct, mods);
    if (node.skillBoost) {
      skillLevels[node.skillBoost.skillIndex] += node.skillBoost.perRank * rank;
    }
  }

  const out: Stats = {
    hp: Math.round((stats.hp + flat.hp) * (1 + pct.hp / 100)),
    atk: Math.round((stats.atk + flat.atk) * (1 + pct.atk / 100)),
    def: Math.round((stats.def + flat.def) * (1 + pct.def / 100)),
    spd: Math.round((stats.spd + flat.spd) * (1 + pct.spd / 100)),
    crit: round1(stats.crit + flat.crit + pct.crit),
    critDmg: round1(stats.critDmg + flat.critDmg + pct.critDmg),
    haste: round1(stats.haste + flat.haste + pct.haste),
    lifesteal: round1(stats.lifesteal + flat.lifesteal + pct.lifesteal),
  };

  return { stats: out, mods, skillLevels, power: powerOf(out, mods), sets };
}

function addStat(stat: StatKey, value: number, isPct: boolean, flat: Stats, pct: Stats): void {
  // Скорость, крит, крит-урон, энергия и вампиризм всегда считаются в процентах/пунктах
  const alwaysPct: StatKey[] = ['crit', 'critDmg', 'haste', 'lifesteal'];
  if (isPct || alwaysPct.includes(stat)) pct[stat] += value;
  else flat[stat] += value;
}

function applyMods(
  src: Partial<Record<ModKey, number>>,
  pct: Stats,
  mods: { dmgDealt: number; dmgTaken: number; healPower: number },
): void {
  for (const [k, v] of Object.entries(src) as [ModKey, number][]) {
    if (k === 'dmgDealt' || k === 'dmgTaken' || k === 'healPower') mods[k] += v;
    else pct[k] += v;
  }
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

export function powerOf(s: Stats, mods: { dmgDealt: number; dmgTaken: number; healPower: number }): number {
  const offense = s.atk * (1 + s.crit / 100 * (0.5 + s.critDmg / 100)) * (1 + mods.dmgDealt / 100);
  const defense = (s.hp * 0.11 + s.def * 2.4) * (1 - mods.dmgTaken / 100);
  const tempo = 1 + (s.spd - 100) / 260 + s.haste / 400;
  return Math.round((offense * 2.6 + defense) * tempo);
}

/** Уровень боевой мощи отряда */
export function teamPower(list: Derived[]): number {
  return list.reduce((a, d) => a + d.power, 0);
}
