import type { GearItem, GearSet, GearSlot, Rarity, StatKey, SubStat } from '../types';
import type { RNG } from '../engine/rng';

export const GEAR_SLOTS: { id: GearSlot; name: string; icon: string }[] = [
  { id: 'weapon', name: 'Оружие', icon: '⚔️' },
  { id: 'helm', name: 'Венец', icon: '👑' },
  { id: 'armor', name: 'Броня', icon: '🥻' },
  { id: 'gloves', name: 'Перчатки', icon: '🧤' },
  { id: 'boots', name: 'Обувь', icon: '👢' },
  { id: 'relic', name: 'Реликвия', icon: '🔱' },
];

export const SLOT_NAME: Record<GearSlot, string> = Object.fromEntries(
  GEAR_SLOTS.map((s) => [s.id, s.name]),
) as Record<GearSlot, string>;

export const SLOT_ICON: Record<GearSlot, string> = Object.fromEntries(
  GEAR_SLOTS.map((s) => [s.id, s.icon]),
) as Record<GearSlot, string>;

export const SETS: GearSet[] = [
  {
    id: 'ember', name: 'Уголь Затмения', color: '#ff6b4a',
    bonus2: { text: '+12% ATK', mods: { atk: 12 } },
    bonus4: { text: '+15% нанесённого урона', mods: { dmgDealt: 15 } },
  },
  {
    id: 'tidecall', name: 'Зов Прилива', color: '#4fb8ff',
    bonus2: { text: '+12% скорости энергии', mods: { haste: 12 } },
    bonus4: { text: '+10% скорости и +8% энергии', mods: { spd: 10, haste: 8 } },
  },
  {
    id: 'thorn', name: 'Терновый Венец', color: '#68e08a',
    bonus2: { text: '+15% HP', mods: { hp: 15 } },
    bonus4: { text: '−12% получаемого урона', mods: { dmgTaken: -12 } },
  },
  {
    id: 'dawn', name: 'Свет Зари', color: '#ffe07a',
    bonus2: { text: '+15% силы лечения', mods: { healPower: 15 } },
    bonus4: { text: '+12% HP и +10% DEF', mods: { hp: 12, def: 10 } },
  },
  {
    id: 'eclipse', name: 'Печать Затмения', color: '#b57cff',
    bonus2: { text: '+10% шанса крита', mods: { crit: 10 } },
    bonus4: { text: '+30% крит-урона', mods: { critDmg: 30 } },
  },
  {
    id: 'vampire', name: 'Алая Жажда', color: '#ff5ea8',
    bonus2: { text: '+10% вампиризма', mods: { lifesteal: 10 } },
    bonus4: { text: '+10% ATK и +8% вампиризма', mods: { atk: 10, lifesteal: 8 } },
  },
];

export const SET_BY_ID: Record<string, GearSet> = Object.fromEntries(SETS.map((s) => [s.id, s]));

/** Главный стат по слоту: [стат, процентный ли, базовое значение на уровне 1] */
const MAIN_POOL: Record<GearSlot, { stat: StatKey; pct: boolean; base: number }[]> = {
  weapon: [{ stat: 'atk', pct: false, base: 26 }],
  helm: [{ stat: 'hp', pct: false, base: 240 }],
  armor: [{ stat: 'def', pct: false, base: 20 }],
  gloves: [
    { stat: 'crit', pct: true, base: 8 },
    { stat: 'critDmg', pct: true, base: 14 },
    { stat: 'atk', pct: true, base: 9 },
  ],
  boots: [
    { stat: 'spd', pct: true, base: 6 },
    { stat: 'haste', pct: true, base: 10 },
  ],
  relic: [
    { stat: 'hp', pct: true, base: 10 },
    { stat: 'def', pct: true, base: 11 },
    { stat: 'atk', pct: true, base: 9 },
    { stat: 'lifesteal', pct: true, base: 8 },
  ],
};

const SUB_POOL: { stat: StatKey; pct: boolean; base: number }[] = [
  { stat: 'hp', pct: false, base: 110 },
  { stat: 'atk', pct: false, base: 12 },
  { stat: 'def', pct: false, base: 9 },
  { stat: 'hp', pct: true, base: 5 },
  { stat: 'atk', pct: true, base: 5 },
  { stat: 'def', pct: true, base: 6 },
  { stat: 'spd', pct: true, base: 3 },
  { stat: 'crit', pct: true, base: 4 },
  { stat: 'critDmg', pct: true, base: 7 },
  { stat: 'haste', pct: true, base: 5 },
  { stat: 'lifesteal', pct: true, base: 4 },
];

export const STAT_LABEL: Record<StatKey, string> = {
  hp: 'HP',
  atk: 'ATK',
  def: 'DEF',
  spd: 'СКОР',
  crit: 'КРИТ',
  critDmg: 'КР.УРОН',
  haste: 'ЭНЕРГИЯ',
  lifesteal: 'ВАМПИР',
};

const SUBS_BY_RARITY: Record<Rarity, number> = { rare: 1, epic: 2, legend: 3, mythic: 4 };
const MAIN_MULT: Record<Rarity, number> = { rare: 1, epic: 1.3, legend: 1.7, mythic: 2.2 };

const PREFIX: Record<Rarity, string[]> = {
  rare: ['Простое', 'Походное', 'Ученическое'],
  epic: ['Гранёное', 'Лунное', 'Резное'],
  legend: ['Затменное', 'Королевское', 'Древнее'],
  mythic: ['Предвечное', 'Звёздное', 'Абсолютное'],
};

export function gearName(slot: GearSlot, rarity: Rarity, setId: string, rng: RNG): string {
  const p = PREFIX[rarity][rng.int(PREFIX[rarity].length)];
  return `${p} ${SLOT_NAME[slot].toLowerCase()} · ${SET_BY_ID[setId].name}`;
}

/** Значение главного стата с учётом уровня заточки (0..15) */
export function mainValue(base: number, rarity: Rarity, tier: number, level: number): number {
  const v = base * MAIN_MULT[rarity] * (1 + tier * 0.28) * (1 + level * 0.11);
  return Math.round(v * 10) / 10;
}

let gearCounter = 0;
export function nextGearUid(): string {
  gearCounter += 1;
  return `g${Date.now().toString(36)}${gearCounter.toString(36)}`;
}

export function rollGear(rng: RNG, slot: GearSlot, rarity: Rarity, tier: number): GearItem {
  const setId = SETS[rng.int(SETS.length)].id;
  const mp = MAIN_POOL[slot];
  const main = mp[rng.int(mp.length)];
  const subCount = SUBS_BY_RARITY[rarity];
  const used = new Set<string>();
  const subs: SubStat[] = [];
  for (let i = 0; i < subCount; i++) {
    for (let tries = 0; tries < 12; tries++) {
      const s = SUB_POOL[rng.int(SUB_POOL.length)];
      const key = `${s.stat}${s.pct}`;
      if (used.has(key)) continue;
      used.add(key);
      const value = Math.round(s.base * (1 + tier * 0.25) * rng.range(0.8, 1.25) * 10) / 10;
      subs.push({ stat: s.stat, value, pct: s.pct });
      break;
    }
  }
  return {
    uid: nextGearUid(),
    slot,
    name: gearName(slot, rarity, setId, rng),
    rarity,
    level: 0,
    setId,
    mainStat: main.stat,
    mainValue: mainValue(main.base, rarity, tier, 0),
    mainPct: main.pct,
    subs,
  };
}

export function gearUpgradeCost(item: GearItem): number {
  const rarityMult: Record<Rarity, number> = { rare: 1, epic: 1.6, legend: 2.6, mythic: 4 };
  return Math.round(180 * Math.pow(1.32, item.level) * rarityMult[item.rarity]);
}

export function upgradeGear(item: GearItem): GearItem {
  const mp = MAIN_POOL[item.slot].find((m) => m.stat === item.mainStat && m.pct === item.mainPct);
  const base = mp ? mp.base : item.mainValue;
  const tier = Math.max(0, Math.round((item.mainValue / (base * MAIN_MULT[item.rarity] * (1 + item.level * 0.11)) - 1) / 0.28));
  return {
    ...item,
    level: item.level + 1,
    mainValue: mainValue(base, item.rarity, tier, item.level + 1),
  };
}

export function gearScore(item: GearItem): number {
  const w: Record<StatKey, number> = { hp: 0.1, atk: 1.1, def: 0.9, spd: 6, crit: 5, critDmg: 3, haste: 4, lifesteal: 4 };
  let s = item.mainValue * (item.mainPct ? 6 : 1) * w[item.mainStat];
  for (const sub of item.subs) s += sub.value * (sub.pct ? 6 : 1) * w[sub.stat];
  return Math.round(s);
}

export function formatStat(stat: StatKey, value: number, pct: boolean): string {
  const v = pct ? `${value}%` : `${Math.round(value)}`;
  return `${STAT_LABEL[stat]} +${v}`;
}
