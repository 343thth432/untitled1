import type { Element, StatusDef, StatusId } from '../types';

export const ELEMENTS: Record<
  Element,
  { name: string; icon: string; color: string; glow: string; soft: string }
> = {
  flame: { name: 'Пламя', icon: '🔥', color: '#ff7f52', glow: 'rgba(255,127,82,0.55)', soft: '#3a1c15' },
  tide: { name: 'Прилив', icon: '🌊', color: '#5fb0f2', glow: 'rgba(95,176,242,0.55)', soft: '#14283d' },
  verdant: { name: 'Лоза', icon: '🌿', color: '#5ecb8b', glow: 'rgba(94,203,139,0.55)', soft: '#132e21' },
  lumen: { name: 'Свет', icon: '✦', color: '#f5cc5c', glow: 'rgba(245,204,92,0.55)', soft: '#33290f' },
  umbra: { name: 'Тьма', icon: '🌑', color: '#a882ff', glow: 'rgba(168,130,255,0.55)', soft: '#241c3d' },
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
