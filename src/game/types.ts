// ─────────────────────────────────────────────────────────────
//  Базовые типы игры «Эклипс: Дочери Затмения»
// ─────────────────────────────────────────────────────────────

export type Faction = 'flame' | 'tide' | 'verdant' | 'lumen' | 'umbra';
export type Role = 'guard' | 'blade' | 'mystic' | 'healer' | 'shade' | 'ranger';
export type Rarity = 'rare' | 'epic' | 'legend' | 'mythic';

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  /** шанс крита, % */
  crit: number;
  /** бонус крит-урона, % (сверх базовых 150%) */
  critDmg: number;
  /** скорость набора энергии, % */
  haste: number;
  /** вампиризм, % */
  lifesteal: number;
}

export type StatKey = keyof Stats;

/** Динамические модификаторы, которых нет в базовых статах */
export type ModKey = StatKey | 'dmgDealt' | 'dmgTaken' | 'healPower';

// ── Цели ──────────────────────────────────────────────────────
export type TargetSel =
  | 'self'
  | 'enemyFront'
  | 'enemyBack'
  | 'enemyLowestHp'
  | 'enemyHighestAtk'
  | 'enemyRandom'
  | 'enemyAll'
  | 'enemySplash'
  | 'allyLowestHp'
  | 'allyRandom'
  | 'allyAll'
  | 'allyDead';

// ── Эффекты навыков ───────────────────────────────────────────
export type Effect =
  | {
      t: 'damage';
      target: TargetSel;
      mult: number;
      scale?: 'atk' | 'maxHp' | 'def';
      hits?: number;
      /** доля игнорируемой защиты, 0..1 */
      pierce?: number;
      critBonus?: number;
    }
  | { t: 'heal'; target: TargetSel; mult: number; scale: 'atk' | 'casterMaxHp' | 'targetMaxHp' }
  | { t: 'shield'; target: TargetSel; mult: number; scale: 'atk' | 'casterMaxHp'; dur: number }
  | { t: 'mod'; target: TargetSel; id: string; stat: ModKey; pct: number; dur: number; label: string }
  | { t: 'dot'; target: TargetSel; id: string; mult: number; dur: number; label: string }
  | { t: 'stun'; target: TargetSel; dur: number; chance?: number }
  | { t: 'energy'; target: TargetSel; amount: number }
  | { t: 'cleanse'; target: TargetSel }
  | { t: 'revive'; target: 'allyDead'; hpPct: number };

export type SkillKind = 'basic' | 'ultimate' | 'passive';

export type PassiveTrigger =
  | 'battleStart'
  | 'onUltimate'
  | 'onCrit'
  | 'onKill'
  | 'onHpBelow50'
  | 'onAllyDeath'
  | 'periodic';

export interface SkillDef {
  id: string;
  name: string;
  kind: SkillKind;
  icon: string;
  text: string;
  effects: Effect[];
  /** для ultimate: стоимость энергии (по умолчанию 100) */
  cost?: number;
  /** для passive */
  trigger?: PassiveTrigger;
  /** для periodic-пассивок — интервал в секундах */
  every?: number;
  /** пассивка срабатывает один раз за бой */
  once?: boolean;
  /** кулдаун пассивки, сек */
  cd?: number;
}

// ── Внешность (процедурная 3D-модель) ─────────────────────────
export type HairStyle = 'long' | 'twin' | 'bob' | 'ponytail' | 'braid' | 'short' | 'wavy' | 'buns';

export type OutfitStyle =
  /** боди с высоким вырезом на бёдрах + чулки */
  | 'leotard'
  /** латный бюстгальтер и набедренные пластины */
  | 'plate'
  /** платье с глубокими разрезами */
  | 'slit'
  /** распахнутый плащ поверх топа и шорт */
  | 'coat'
  /** бинты сараси и хакама с разрезом */
  | 'sarashi'
  /** полупрозрачная мантия жрицы */
  | 'robe'
  /** ремни-портупея и мини */
  | 'harness'
  /** ципао с разрезом до бедра */
  | 'qipao';

export type WeaponId =
  | 'katana'
  | 'greatsword'
  | 'bow'
  | 'staff'
  | 'scythe'
  | 'daggers'
  | 'hammer'
  | 'spear'
  | 'grimoire'
  | 'chakram'
  | 'crossbow'
  | 'glaive'
  | 'wand'
  | 'claws';

export interface Appearance {
  hair: HairStyle;
  hairColor: string;
  hairColor2: string;
  eyeColor: string;
  skin: string;
  outfit: string;
  outfitTrim: string;
  accessory: 'horns' | 'halo' | 'ears' | 'crown' | 'visor' | 'hairpin' | 'veil' | 'none';
  aura: string;
  /** 0..1 — «настроение», влияет на брови, разрез глаз и линию рта */
  mood: number;
  /** крой костюма */
  outfitStyle: OutfitStyle;
  /** цвет чулок/поножей, null — без них */
  stockings: string | null;
  /** плащ за спиной */
  cape: boolean;
  /** личное оружие */
  weapon: WeaponId;
  /** 0..1 — фигура: рост и пропорции */
  figure: number;
}

export interface HeroDef {
  id: string;
  name: string;
  title: string;
  faction: Faction;
  role: Role;
  rarity: Rarity;
  base: Stats;
  /** прирост статов за уровень, доля от базы */
  growth: number;
  skills: SkillDef[];
  look: Appearance;
  lore: string;
}

// ── Снаряжение ────────────────────────────────────────────────
export type GearSlot = 'weapon' | 'helm' | 'armor' | 'gloves' | 'boots' | 'relic';

export interface SubStat {
  stat: StatKey;
  value: number;
  /** флэт или процент */
  pct: boolean;
}

export interface GearItem {
  uid: string;
  slot: GearSlot;
  name: string;
  rarity: Rarity;
  level: number;
  setId: string;
  mainStat: StatKey;
  mainValue: number;
  mainPct: boolean;
  subs: SubStat[];
  /** id героини, на которой надет предмет */
  equippedBy?: string;
  locked?: boolean;
}

export interface GearSet {
  id: string;
  name: string;
  color: string;
  bonus2: { text: string; mods: Partial<Record<ModKey, number>> };
  bonus4: { text: string; mods: Partial<Record<ModKey, number>> };
}

// ── Сохранённое состояние героини ─────────────────────────────
export interface HeroSave {
  id: string;
  level: number;
  exp: number;
  /** звёзды возвышения 1..6 */
  stars: number;
  shards: number;
  /** потраченные очки дерева навыков: id узла -> ранг */
  tree: Record<string, number>;
  gear: Partial<Record<GearSlot, string>>;
  favorite?: boolean;
}

// ── Дерево навыков ────────────────────────────────────────────
export interface TreeNode {
  id: string;
  name: string;
  tier: number;
  col: number;
  maxRank: number;
  icon: string;
  text: (rank: number) => string;
  apply: (rank: number) => Partial<Record<ModKey, number>>;
  /** узел усиливает конкретный навык героини */
  skillBoost?: { skillIndex: number; perRank: number };
  requires?: string;
}

// ── Бой ───────────────────────────────────────────────────────
export interface StatusInstance {
  id: string;
  label: string;
  kind: 'buff' | 'debuff' | 'dot' | 'shield' | 'stun';
  stat?: ModKey;
  pct?: number;
  /** для dot */
  power?: number;
  value?: number;
  remaining: number;
  sourceUid: string;
}

export interface Combatant {
  uid: string;
  defId: string;
  name: string;
  faction: Faction;
  role: Role;
  rarity: Rarity;
  look: Appearance;
  side: 'ally' | 'foe';
  slot: number;
  stats: Stats;
  maxHp: number;
  hp: number;
  energy: number;
  atkTimer: number;
  statuses: StatusInstance[];
  skills: SkillDef[];
  skillLevels: number[];
  alive: boolean;
  mods: { dmgDealt: number; dmgTaken: number; healPower: number };
  passiveState: Record<string, number>;
  /** оставшееся время каста ультимейта */
  castTimer: number;
  castName: string | null;
  holdingUlt: boolean;
  /** накопленный урон и лечение за бой — для итогов */
  dmgDone: number;
  healDone: number;
}

export type FloatKind = 'dmg' | 'crit' | 'heal' | 'shield' | 'miss' | 'buff';

export interface FloatText {
  id: number;
  uid: string;
  text: string;
  kind: FloatKind;
  at: number;
}

export interface BattleLogEntry {
  t: number;
  text: string;
  kind: 'ult' | 'death' | 'info';
}

export interface BattleSnapshotUnit {
  uid: string;
  hp: number;
  maxHp: number;
  energy: number;
  alive: boolean;
  statuses: StatusInstance[];
  casting: string | null;
}

export interface BattleResult {
  win: boolean;
  ticks: number;
  mvp: string | null;
  dmg: Record<string, number>;
  /** доля оставшегося HP по uid — переносится между этажами башни */
  hp: Record<string, number>;
}

// ── Прогресс ──────────────────────────────────────────────────
export interface Resources {
  gold: number;
  gems: number;
  exp: number;
  scrolls: number;
  dust: number;
  /** валюта башни */
  echo: number;
  /** валюта арены */
  glory: number;
  stamina: number;
}

export type ResourceKey = keyof Resources;

export interface Reward {
  gold?: number;
  gems?: number;
  exp?: number;
  scrolls?: number;
  dust?: number;
  echo?: number;
  glory?: number;
  shards?: { heroId: string; amount: number }[];
  gear?: number;
}

export interface TowerRun {
  active: boolean;
  floor: number;
  best: number;
  /** сохранённые hp героинь между этажами (uid -> доля) */
  hp: Record<string, number>;
  buffs: string[];
  team: string[];
  pendingDraft: string[] | null;
}

export type Screen =
  | 'campaign'
  | 'heroes'
  | 'summon'
  | 'tower'
  | 'arena'
  | 'gear'
  | 'battle'
  | 'hero'
  | 'formation';
