import type { OmenDef } from '../types';

const RAW: OmenDef[] = [
  {
    id: 'wellspring',
    name: 'Родник у камня',
    text: 'Из-под серого валуна бьёт вода. Она пахнет железом и почему-то мёдом.',
    choices: [
      { text: 'Напиться', outcome: 'Тепло растекается по телу.', effects: { hp: 14 } },
      { text: 'Наполнить флягу', outcome: 'Тяжелее идти, но спокойнее.', effects: { maxHp: 8, hp: 8 } },
      { text: 'Пройти мимо', outcome: 'Ты запоминаешь место. Пригодится.', effects: { sparks: 25 } },
    ],
  },
  {
    id: 'wanderer',
    name: 'Странник без лица',
    text: 'Он сидит спиной к дороге и перебирает камешки. Лица не разглядеть, сколько ни наклоняйся.',
    choices: [
      { text: 'Отдать искры', outcome: 'Он молча кладёт тебе в ладонь что-то тёплое.', effects: { sparks: -40, relic: 'random' } },
      { text: 'Сесть рядом', outcome: 'Вы молчите вместе. Становится легче.', effects: { hp: 10 } },
      { text: 'Уйти', outcome: 'Спиной ты чувствуешь взгляд.', effects: {} },
    ],
  },
  {
    id: 'shrine',
    name: 'Придорожный алтарь',
    text: 'Плоский камень, на нём — след ладони. Он глубже, чем должен быть.',
    choices: [
      { text: 'Вложить ладонь', outcome: 'Кожа горит, но в голове проясняется.', effects: { hp: -8, upgrade: true } },
      { text: 'Оставить искры', outcome: 'Камень тускло светится в ответ.', effects: { sparks: -30, maxHp: 12, hp: 12 } },
      { text: 'Пройти мимо', outcome: 'Ты не оглядываешься.', effects: {} },
    ],
  },
  {
    id: 'crows',
    name: 'Вороний суд',
    text: 'Три вороны на изгороди смотрят, как ты подходишь. Одна каркает — остальные ждут.',
    choices: [
      { text: 'Бросить им хлеб', outcome: 'Они расступаются и что-то роняют на дорогу.', effects: { sparks: 35 } },
      { text: 'Пройти под ними', outcome: 'Одна задевает крылом. Щека саднит.', effects: { hp: -6, card: 'random' } },
      { text: 'Обойти полем', outcome: 'Дольше, зато тихо.', effects: {} },
    ],
  },
  {
    id: 'burden',
    name: 'Брошенная поклажа',
    text: 'Мешок посреди дороги. Хозяина нигде нет, а следы обрываются в двух шагах.',
    choices: [
      { text: 'Забрать всё', outcome: 'Тяжело. Что-то в мешке тебе не нравится.', effects: { sparks: 60, card: 'weight' } },
      { text: 'Взять только нужное', outcome: 'Ты выбираешь одну вещь.', effects: { sparks: 25 } },
      { text: 'Не трогать', outcome: 'Через сто шагов ты слышишь, как мешок волочат обратно.', effects: {} },
    ],
  },
  {
    id: 'mirror',
    name: 'Зеркальная лужа',
    text: 'Вода не отражает небо — только твоё лицо, и оно чуть старше.',
    choices: [
      { text: 'Смотреть до конца', outcome: 'Ты видишь то, что умеешь, но забыла.', effects: { upgrade: true } },
      { text: 'Разбить отражение', outcome: 'Осколки холодят пальцы.', effects: { removeCard: true } },
      { text: 'Отвернуться', outcome: 'Правильно.', effects: { hp: 6 } },
    ],
  },
];

export const OMENS: Record<string, OmenDef> = Object.fromEntries(RAW.map((o) => [o.id, o]));
export const OMEN_IDS = RAW.map((o) => o.id);
