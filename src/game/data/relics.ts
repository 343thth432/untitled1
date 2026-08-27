import type { RelicDef } from '../types';

const RAW: RelicDef[] = [
  // ── личные ──
  { id: 'ashmark', name: 'Пепельная метка', icon: '🜂', rare: 'common', text: 'Начинаешь дуэль с 2 силы.', hooks: [{ t: 'startStatus', id: 'might', v: 2 }] },
  { id: 'tidestone', name: 'Камень отлива', icon: '🜄', rare: 'common', text: 'Каждый ход начинаешь с 5 блока.', hooks: [{ t: 'startBlock', v: 5 }] },
  { id: 'seedring', name: 'Кольцо семени', icon: '🜃', rare: 'common', text: '+12 к пределу здоровья.', hooks: [{ t: 'maxHp', v: 12 }] },
  { id: 'sunbead', name: 'Солнечная бусина', icon: '☉', rare: 'common', text: 'После дуэли лечит 6.', hooks: [{ t: 'healAfterDuel', v: 6 }] },
  { id: 'nightglass', name: 'Ночное стекло', icon: '🌑', rare: 'common', text: 'Первая карта за ход бесплатна.', hooks: [{ t: 'firstCardFree' }] },

  // ── находки ──
  { id: 'coalheart', name: 'Угольное сердце', icon: '🔥', rare: 'common', text: 'Атаки бьют на 2 сильнее.', hooks: [{ t: 'damageBonus', v: 2 }] },
  { id: 'ironleaf', name: 'Железный лист', icon: '🛡', rare: 'common', text: 'Защита даёт на 2 больше блока.', hooks: [{ t: 'blockBonus', v: 2 }] },
  { id: 'quill', name: 'Перо ветра', icon: '🪶', rare: 'common', text: 'Добираешь на 1 карту больше.', hooks: [{ t: 'startDraw', v: 1 }] },
  { id: 'oldmap', name: 'Ветхая карта', icon: '🗺', rare: 'common', text: 'За бой дают на одну карту больше на выбор.', hooks: [{ t: 'extraReward' }] },
  { id: 'kettle', name: 'Походный котелок', icon: '🍵', rare: 'common', text: 'Привал лечит на 8 больше.', hooks: [{ t: 'restBonus', v: 8 }] },
  { id: 'wolfclaw', name: 'Волчий коготь', icon: '🐺', rare: 'rare', text: 'После победы лечит 5.', hooks: [{ t: 'onKillHeal', v: 5 }] },
  { id: 'emberchain', name: 'Тлеющая цепь', icon: '⛓', rare: 'rare', text: 'Начинаешь дуэль с 3 шипов.', hooks: [{ t: 'startStatus', id: 'thorns', v: 3 }] },
  { id: 'saltvial', name: 'Склянка соли', icon: '🧂', rare: 'rare', text: '+20 к пределу здоровья.', hooks: [{ t: 'maxHp', v: 20 }] },
  { id: 'lantern', name: 'Дорожный фонарь', icon: '🏮', rare: 'rare', text: 'Каждый ход +1 энергии.', hooks: [{ t: 'startEnergy', v: 1 }] },
  { id: 'mirrorshard', name: 'Осколок зеркала', icon: '🪞', rare: 'rare', text: 'Начинаешь дуэль с 2 плавности.', hooks: [{ t: 'startStatus', id: 'grace', v: 2 }] },
  { id: 'eclipsecoin', name: 'Монета затмения', icon: '🌘', rare: 'legend', text: 'Атаки бьют на 3 сильнее, защита даёт на 3 больше.', hooks: [{ t: 'damageBonus', v: 3 }, { t: 'blockBonus', v: 3 }] },
  { id: 'roadsong', name: 'Песнь дороги', icon: '🎐', rare: 'legend', text: 'Начинаешь дуэль с 1 сосредоточения и 8 блока.', hooks: [{ t: 'startStatus', id: 'focus', v: 1 }, { t: 'startBlock', v: 8 }] },
  { id: 'sunkenbell', name: 'Утонувший колокол', icon: '🔔', rare: 'legend', text: '+30 к пределу здоровья, после дуэли лечит 8.', hooks: [{ t: 'maxHp', v: 30 }, { t: 'healAfterDuel', v: 8 }] },
];

export const RELICS: Record<string, RelicDef> = Object.fromEntries(RAW.map((r) => [r.id, r]));

/** реликвии, которые могут выпасть в находке */
export const FOUND_POOL = RAW.filter((r) => !['ashmark', 'tidestone', 'seedring', 'sunbead', 'nightglass'].includes(r.id)).map((r) => r.id);
