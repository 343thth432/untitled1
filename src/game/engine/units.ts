import type { GearItem, HeroDef, HeroSave, ModKey, Rarity, Stats } from '../types';
import type { UnitSpec } from './battle';
import { HEROES, heroDef } from '../data/heroes';
import { deriveHero, levelMultiplier, powerOf, starMultiplier } from './stats';
import { RNG } from './rng';
import { stageInfo } from '../data/campaign';

export type TeamMods = Partial<Record<ModKey, number>>;

/** Спека героини игрока (уровень, звёзды, снаряжение, дерево) */
export function playerSpec(
  save: HeroSave,
  gearById: Record<string, GearItem>,
  teamMods: TeamMods = {},
): UnitSpec {
  const def = heroDef(save.id);
  const d = deriveHero(def, save, gearById);
  const stats = applyTeamMods(d.stats, teamMods);
  const mods = {
    dmgDealt: d.mods.dmgDealt + (teamMods.dmgDealt ?? 0),
    dmgTaken: d.mods.dmgTaken + (teamMods.dmgTaken ?? 0),
    healPower: d.mods.healPower + (teamMods.healPower ?? 0),
  };
  return { def, stats, mods, skillLevels: d.skillLevels, uid: `a_${save.id}` };
}

function applyTeamMods(s: Stats, m: TeamMods): Stats {
  return {
    hp: Math.round(s.hp * (1 + (m.hp ?? 0) / 100)),
    atk: Math.round(s.atk * (1 + (m.atk ?? 0) / 100)),
    def: Math.round(s.def * (1 + (m.def ?? 0) / 100)),
    spd: Math.round(s.spd * (1 + (m.spd ?? 0) / 100)),
    crit: s.crit + (m.crit ?? 0),
    critDmg: s.critDmg + (m.critDmg ?? 0),
    haste: s.haste + (m.haste ?? 0),
    lifesteal: s.lifesteal + (m.lifesteal ?? 0),
  };
}

/** Оценка боевой мощи готовой спеки — единая формула для игрока и врага */
export function specPower(spec: UnitSpec): number {
  return powerOf(spec.stats, spec.mods);
}

/** Спека врага: без снаряжения, но с общим множителем силы */
export function enemySpec(
  def: HeroDef,
  level: number,
  stars: number,
  mult: number,
  uid: string,
  name?: string,
): UnitSpec {
  const lvlM = levelMultiplier(def, level);
  const starM = starMultiplier(stars);
  const stats: Stats = {
    hp: Math.round(def.base.hp * lvlM * starM * mult),
    atk: Math.round(def.base.atk * lvlM * starM * mult),
    def: Math.round(def.base.def * lvlM * starM * mult),
    spd: def.base.spd,
    crit: def.base.crit + Math.min(20, stars * 2),
    critDmg: def.base.critDmg + stars * 4,
    haste: def.base.haste,
    lifesteal: def.base.lifesteal,
  };
  return {
    def,
    stats,
    mods: { dmgDealt: 0, dmgTaken: 0, healPower: 0 },
    skillLevels: [stars, stars, stars],
    uid,
    name,
  };
}

const BOSS_PREFIX = ['Затменная', 'Порченая', 'Пустотная', 'Багровая', 'Безымянная'];

/** Порождения затмения носят собственные имена, а не имена героинь */
const FOE_NAMES: Record<string, string[]> = {
  guard: ['Страж Врат', 'Каменная Дева', 'Хранительница Праха', 'Щит Затмения'],
  blade: ['Отступница', 'Клинок Праха', 'Рубака Теней', 'Дева Раскола'],
  mystic: ['Жрица Пустоты', 'Чтица Знаков', 'Заклинательница', 'Голос Разлома'],
  healer: ['Сестра Скорби', 'Плакальщица', 'Шептунья Праха', 'Носительница Чаш'],
  shade: ['Ночная Гостья', 'Тихая Смерть', 'Тень Переулка', 'Безликая'],
  ranger: ['Дозорная', 'Лучница Затмения', 'Стрелок Пустоши', 'Око Стаи'],
};

function foeName(rng: RNG, role: string): string {
  const pool = FOE_NAMES[role] ?? FOE_NAMES.blade;
  return pool[rng.int(pool.length)];
}

/** Какие редкости встречаются на данном отрезке прогресса */
function allowedRarities(depth: number): Rarity[] {
  if (depth < 16) return ['rare', 'epic'];
  if (depth < 45) return ['rare', 'epic', 'legend'];
  return ['rare', 'epic', 'legend', 'mythic'];
}

function foePool(depth: number): HeroDef[] {
  const allowed = allowedRarities(depth);
  return HEROES.filter((h) => allowed.includes(h.rarity));
}

/** Всегда набирает полный отряд из пяти: один страж впереди, остальные добираются
 *  без повторов, а если пул мал — с повторами (у порождений всё равно свои имена). */
function pickFoes(rng: RNG, pool: HeroDef[]): HeroDef[] {
  const guards = pool.filter((h) => h.role === 'guard');
  const others = pool.filter((h) => h.role !== 'guard');
  const team: HeroDef[] = [guards.length ? rng.pick(guards) : rng.pick(pool)];
  const rest = rng.sample(others, 4);
  team.push(...rest);
  while (team.length < 5) team.push(rng.pick(others.length ? others : pool));
  return team;
}

/** Отряд врага в кампании — детерминирован по номеру этапа */
export function campaignTeam(index: number): UnitSpec[] {
  const info = stageInfo(index);
  const rng = new RNG(`camp_${index}`);
  const level = Math.max(1, Math.round(1 + index * 1.02));
  const stars = Math.min(6, 1 + Math.floor(index / 24));
  const mult = 0.55 * (1 + index * 0.017) * (info.boss ? 1.2 : info.elite ? 1.1 : 1);

  const picked = pickFoes(rng, foePool(index));

  return picked.map((def, i) => {
    const isBoss = info.boss && i === 0;
    return enemySpec(
      def,
      level,
      stars,
      mult * (isBoss ? 1.28 : 1),
      `f_${index}_${i}`,
      isBoss ? `${rng.pick(BOSS_PREFIX)} ${def.name}` : foeName(rng, def.role),
    );
  });
}

/** Отряд врага в башне */
export function towerTeam(floor: number): UnitSpec[] {
  const rng = new RNG(`tower_${floor}`);
  const level = Math.max(1, Math.round(floor * 1.6));
  const stars = Math.min(6, 1 + Math.floor(floor / 16));
  const isBoss = floor % 10 === 0;
  const mult = 0.55 * (1 + floor * 0.055) * (isBoss ? 1.28 : 1);
  const picked = pickFoes(rng, foePool(Math.floor(floor * 1.5)));
  return picked.map((def, i) =>
    enemySpec(def, level, stars, mult * (isBoss && i === 0 ? 1.35 : 1), `t_${floor}_${i}`,
      isBoss && i === 0 ? `Страж ${floor}-го этажа` : foeName(rng, def.role)),
  );
}

/** Соперник на арене — генерируется от силы игрока */
export function arenaTeam(seed: string, targetPower: number, level: number): UnitSpec[] {
  const rng = new RNG(seed);
  const stars = Math.min(6, 1 + Math.floor(level / 22));
  const picked = pickFoes(rng, foePool(level));
  return picked.map((def, i) => enemySpec(def, level, stars, targetPower, `p_${seed}_${i}`, foeName(rng, def.role)));
}

export const ARENA_NAMES = [
  'Багровый Хор', 'Дочери Прилива', 'Тихий Клинок', 'Сёстры Пепла', 'Ночная Смена',
  'Осколки Луны', 'Хор Пустоты', 'Заря Отступниц', 'Терновый Круг', 'Последний Свет',
  'Стеклянные Сердца', 'Полночный Чай', 'Гнев Рощи', 'Сияющий Предел', 'Клуб Затмения',
];
