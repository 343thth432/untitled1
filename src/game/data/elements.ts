import type { Element, StatusDef, StatusId } from '../types';

export const ELEMENTS: Record<
  Element,
  { name: string; icon: string; color: string; glow: string; soft: string }
> = {
  flame: { name: 'Пламя', icon: '🔥', color: '#e2572f', glow: 'rgba(226,87,47,0.5)', soft: '#ffe6dc' },
  tide: { name: 'Прилив', icon: '🌊', color: '#2f7fc4', glow: 'rgba(47,127,196,0.5)', soft: '#dcecfa' },
  verdant: { name: 'Лоза', icon: '🌿', color: '#37945c', glow: 'rgba(55,148,92,0.5)', soft: '#dff2e4' },
  lumen: { name: 'Свет', icon: '✦', color: '#c08a17', glow: 'rgba(192,138,23,0.5)', soft: '#fbf0d6' },
  umbra: { name: 'Тьма', icon: '🌑', color: '#7a4bd4', glow: 'rgba(122,75,212,0.5)', soft: '#ece0fb' },
};

export const STATUSES: Record<StatusId, StatusDef> = {
  might: { id: 'might', name: 'Сила', icon: '⚔', text: 'Каждая атака бьёт сильнее на это число.', decays: false, good: true },
  grace: { id: 'grace', name: 'Плавность', icon: '🜁', text: 'Каждая защита даёт на это число больше блока.', decays: false, good: true },
  frail: { id: 'frail', name: 'Надлом', icon: '💔', text: 'Входящий урон +40%. Спадает по 1 за ход.', decays: true, good: false },
  weak: { id: 'weak', name: 'Слабость', icon: '🥀', text: 'Исходящий урон −30%. Спадает по 1 за ход.', decays: true, good: false },
  burn: { id: 'burn', name: 'Ожог', icon: '🔥', text: 'В конце хода отнимает это число здоровья и спадает на 1.', decays: true, good: false },
  bleed: { id: 'bleed', name: 'Кровь', icon: '🩸', text: 'Каждая сыгранная карта отнимает 1 здоровье. Спадает по 1 за ход.', decays: true, good: false },
  regen: { id: 'regen', name: 'Исток', icon: '🌱', text: 'В конце хода лечит на это число и спадает на 1.', decays: true, good: true },
  root: { id: 'root', name: 'Корни', icon: '⛓', text: 'Пропускает столько ходов.', decays: true, good: false },
  thorns: { id: 'thorns', name: 'Шипы', icon: '🜛', text: 'Атакующий получает это число урона.', decays: false, good: true },
  focus: { id: 'focus', name: 'Сосредоточение', icon: '◈', text: 'Добираешь на это число карт больше.', decays: false, good: true },
};

/** Кто кого продавливает: ключ бьёт значение с бонусом */
const COUNTER: Record<Element, Element> = {
  flame: 'verdant',
  verdant: 'tide',
  tide: 'flame',
  lumen: 'umbra',
  umbra: 'lumen',
};

export function elementBonus(a: Element, d: Element): number {
  if (COUNTER[a] === d) return 1.2;
  if (COUNTER[d] === a) return 0.9;
  return 1;
}
