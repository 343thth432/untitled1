import type { Faction, Rarity, Role } from '../types';

export const FACTIONS: Record<
  Faction,
  { name: string; short: string; color: string; glow: string; icon: string }
> = {
  flame: { name: 'Пламя', short: 'ПЛМ', color: '#ff6b4a', glow: 'rgba(255,107,74,0.45)', icon: '🔥' },
  tide: { name: 'Прилив', short: 'ПРЛ', color: '#4fb8ff', glow: 'rgba(79,184,255,0.45)', icon: '🌊' },
  verdant: { name: 'Лоза', short: 'ЛОЗ', color: '#68e08a', glow: 'rgba(104,224,138,0.45)', icon: '🌿' },
  lumen: { name: 'Свет', short: 'СВТ', color: '#ffe07a', glow: 'rgba(255,224,122,0.45)', icon: '✦' },
  umbra: { name: 'Тьма', short: 'ТЬМ', color: '#b57cff', glow: 'rgba(181,124,255,0.45)', icon: '🌑' },
};

/** Кто кого контрит: ключ бьёт значение с бонусом */
const COUNTERS: Record<Faction, Faction> = {
  flame: 'verdant',
  verdant: 'tide',
  tide: 'flame',
  lumen: 'umbra',
  umbra: 'lumen',
};

/** Множитель урона атакующей фракции против защищающейся */
export function factionMultiplier(a: Faction, d: Faction): number {
  if (COUNTERS[a] === d) return a === 'lumen' || a === 'umbra' ? 1.3 : 1.25;
  if (COUNTERS[d] === a) return 0.85;
  return 1;
}

export function counterOf(f: Faction): Faction {
  return COUNTERS[f];
}

export const ROLES: Record<Role, { name: string; icon: string; color: string; hint: string }> = {
  guard: { name: 'Страж', icon: '🛡️', color: '#7fd0ff', hint: 'Держит первую линию и защищает тыл' },
  blade: { name: 'Клинок', icon: '⚔️', color: '#ff8f6b', hint: 'Устойчивый урон в ближнем бою' },
  mystic: { name: 'Мистик', icon: '🔮', color: '#c08bff', hint: 'Массовый магический урон' },
  healer: { name: 'Целитель', icon: '✚', color: '#8affb4', hint: 'Лечение, щиты и очищение' },
  shade: { name: 'Тень', icon: '🗡️', color: '#ff6fae', hint: 'Прыгает в тыл и режет слабых' },
  ranger: { name: 'Стрелок', icon: '🏹', color: '#ffd36b', hint: 'Точечный урон с дистанции' },
};

export const RARITY: Record<
  Rarity,
  { name: string; stars: number; color: string; grad: string; shardsToPull: number; power: number }
> = {
  rare: { name: 'Редкая', stars: 2, color: '#63d0ff', grad: 'from-sky-500/40 to-sky-900/10', shardsToPull: 20, power: 1 },
  epic: { name: 'Эпическая', stars: 3, color: '#a78bfa', grad: 'from-violet-500/40 to-violet-900/10', shardsToPull: 40, power: 1.12 },
  legend: { name: 'Легендарная', stars: 4, color: '#ffc857', grad: 'from-amber-400/45 to-amber-900/10', shardsToPull: 80, power: 1.26 },
  mythic: { name: 'Мифическая', stars: 5, color: '#ff5ea8', grad: 'from-pink-500/45 to-fuchsia-900/10', shardsToPull: 140, power: 1.42 },
};

export const RARITY_ORDER: Rarity[] = ['rare', 'epic', 'legend', 'mythic'];
