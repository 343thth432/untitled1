import type { ModKey, Role, TreeNode } from '../types';

const KEYSTONE: Record<Role, { name: string; icon: string; mods: Partial<Record<ModKey, number>>; text: string }> = {
  guard: { name: 'Несокрушимость', icon: '🛡️', mods: { dmgTaken: -10, hp: 10 }, text: '−10% получаемого урона, +10% HP' },
  blade: { name: 'Кровавый ритм', icon: '⚔️', mods: { atk: 12, lifesteal: 8 }, text: '+12% ATK, +8% вампиризма' },
  mystic: { name: 'Перегрузка', icon: '🔮', mods: { dmgDealt: 15 }, text: '+15% наносимого урона' },
  healer: { name: 'Живая вода', icon: '✚', mods: { healPower: 22, haste: 6 }, text: '+22% силы лечения, +6% энергии' },
  shade: { name: 'Убийца', icon: '🗡️', mods: { crit: 12, critDmg: 20 }, text: '+12% крита, +20% крит-урона' },
  ranger: { name: 'Меткость', icon: '🏹', mods: { dmgDealt: 10, crit: 8 }, text: '+10% урона, +8% крита' },
};

function statNode(
  id: string,
  name: string,
  icon: string,
  tier: number,
  col: number,
  maxRank: number,
  stat: ModKey,
  per: number,
  requires?: string,
): TreeNode {
  return {
    id, name, icon, tier, col, maxRank, requires,
    text: (r) => `${statLabel(stat)} ${per > 0 ? '+' : ''}${(per * Math.max(r, 1)).toFixed(0)}%`,
    apply: (r) => ({ [stat]: per * r }) as Partial<Record<ModKey, number>>,
  };
}

function statLabel(s: ModKey): string {
  const map: Record<string, string> = {
    hp: 'HP', atk: 'ATK', def: 'DEF', spd: 'Скорость', crit: 'Шанс крита',
    critDmg: 'Крит-урон', haste: 'Скорость энергии', lifesteal: 'Вампиризм',
    dmgDealt: 'Наносимый урон', dmgTaken: 'Получаемый урон', healPower: 'Сила лечения',
  };
  return map[s] ?? s;
}

export function buildTree(role: Role): TreeNode[] {
  const k = KEYSTONE[role];
  return [
    statNode('t1a', 'Закалка', '❤️', 1, 0, 5, 'hp', 3),
    statNode('t1b', 'Заточка', '🗡️', 1, 1, 5, 'atk', 3),

    statNode('t2a', 'Реакция', '💨', 2, 0, 3, 'spd', 2, 't1a'),
    statNode('t2b', 'Пластины', '🪖', 2, 1, 5, 'def', 3, 't1a'),
    statNode('t2c', 'Точность', '🎯', 2, 2, 3, 'crit', 2, 't1b'),

    statNode('t3a', 'Резонанс', '⚡', 3, 0, 3, 'haste', 4, 't2a'),
    statNode('t3b', 'Жестокость', '💥', 3, 1, 3, 'critDmg', 6, 't2c'),
    statNode('t3c', 'Стойкость', '🧱', 3, 2, 3, 'dmgTaken', -2, 't2b'),

    {
      id: 't4u', name: 'Мастерство ульты', icon: '🌟', tier: 4, col: 0, maxRank: 3, requires: 't3a',
      text: (r) => `Уровень ультимейта +${Math.max(r, 1)}`,
      apply: () => ({}),
      skillBoost: { skillIndex: 1, perRank: 1 },
    },
    {
      id: 't4p', name: 'Глубина таланта', icon: '📖', tier: 4, col: 1, maxRank: 2, requires: 't3b',
      text: (r) => `Уровень пассивки +${Math.max(r, 1)}`,
      apply: () => ({}),
      skillBoost: { skillIndex: 2, perRank: 1 },
    },
    {
      id: 't5k', name: k.name, icon: k.icon, tier: 5, col: 1, maxRank: 1, requires: 't4u',
      text: () => k.text,
      apply: (r) => (r > 0 ? k.mods : {}),
    },
  ];
}

/** Сколько очков дерева доступно героине */
export function treePoints(level: number, stars: number): number {
  return Math.floor((level + 3) / 4) + (stars - 1) * 2;
}
