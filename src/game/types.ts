/** Слои подземелья */
export type FloorId = 'crypt' | 'catacomb' | 'sanctum';

/**
 * Как персонаж выглядит в подземелье. Людей движок не рисует: в кадре —
 * тёмный силуэт со свечением, а полноценный портрет подставляется картинкой,
 * если она положена в public/art.
 */
export interface Portrait {
  /** цвет свечения — им подсвечен силуэт и интерфейс */
  aura: string;
  /** цвет глаз в темноте */
  eyes: string;
  /** рогатый силуэт */
  horns?: boolean;
  /** путь к картинке относительно public, если она есть */
  img?: string;
}

// ── стихии ───────────────────────────────────────────────────
export type Element = 'flame' | 'tide' | 'verdant' | 'lumen' | 'umbra';

// ── статусы ──────────────────────────────────────────────────
export type StatusId =
  /** +урон за каждую атаку */
  | 'might'
  /** +блок за каждую защиту */
  | 'grace'
  /** входящий урон +40% */
  | 'frail'
  /** исходящий урон −30% */
  | 'weak'
  /** урон в конце хода, спадает по 1 */
  | 'burn'
  /** урон за каждую сыгранную карту */
  | 'bleed'
  /** лечение в конце хода */
  | 'regen'
  /** пропуск следующего намерения */
  | 'root'
  /** возвращает урон атакующему */
  | 'thorns'
  /** +1 карта в добор */
  | 'focus';

export interface StatusDef {
  id: StatusId;
  name: string;
  icon: string;
  text: string;
  /** спадает на 1 в конце хода */
  decays: boolean;
  good: boolean;
}

// ── карты ────────────────────────────────────────────────────
export type CardType = 'attack' | 'guard' | 'art' | 'burden';
export type CardRare = 'base' | 'common' | 'rare' | 'legend';

export type Effect =
  | { t: 'damage'; v: number; hits?: number; /** весь блок в урон */ fromBlock?: boolean }
  | { t: 'block'; v: number; times?: number }
  | { t: 'status'; who: 'self' | 'foe'; id: StatusId; v: number }
  | { t: 'draw'; v: number }
  | { t: 'energy'; v: number }
  | { t: 'heal'; v: number }
  | { t: 'discard'; v: number }
  | { t: 'perStatus'; id: StatusId; who: 'self' | 'foe'; damage: number }
  | { t: 'doubleBlock' }
  | { t: 'reflect' };

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  cost: number;
  element: Element | null;
  rare: CardRare;
  /** {0}, {1}… подставляются числами из effects по порядку */
  text: string;
  effects: Effect[];
  /** уходит из колоды после розыгрыша */
  exhaust?: boolean;
  /** id улучшенной версии */
  up?: string;
  /** какую анимацию играет героиня */
  anim?: 'attack' | 'cast' | 'win';
}

// ── противники ───────────────────────────────────────────────
export type IntentKind = 'strike' | 'guard' | 'buff' | 'curse' | 'rest' | 'special';

export interface Intent {
  kind: IntentKind;
  /** урон за удар */
  v?: number;
  hits?: number;
  block?: number;
  status?: { who: 'self' | 'foe'; id: StatusId; v: number };
  label: string;
}

export type FoeTier = 'foe' | 'elite' | 'boss';

export interface FoeDef {
  id: string;
  name: string;
  title: string;
  tier: FoeTier;
  element: Element;
  hp: number;
  /** откуда берётся внешность */
  portrait: Portrait;
  /** биомы, где встречается */
  where: FloorId[];
  /** сколько фигур в сцене: свора выходит втроём */
  count?: number;
  /** цикл намерений; turn начинается с 0 */
  pattern: Intent[][];
}

// ── реликвии ─────────────────────────────────────────────────
export type RelicHook =
  | { t: 'startEnergy'; v: number }
  | { t: 'startBlock'; v: number }
  | { t: 'startDraw'; v: number }
  | { t: 'startStatus'; id: StatusId; v: number }
  | { t: 'maxHp'; v: number }
  | { t: 'healAfterDuel'; v: number }
  | { t: 'damageBonus'; v: number }
  | { t: 'blockBonus'; v: number }
  | { t: 'firstCardFree' }
  | { t: 'onKillHeal'; v: number }
  | { t: 'extraReward' }
  | { t: 'restBonus'; v: number };

export interface RelicDef {
  id: string;
  name: string;
  text: string;
  icon: string;
  rare: 'common' | 'rare' | 'legend';
  hooks: RelicHook[];
}

// ── героиня ──────────────────────────────────────────────────
export interface HeroDef {
  id: string;
  name: string;
  title: string;
  element: Element;
  lore: string;
  portrait: Portrait;
  maxHp: number;
  /** стартовая колода: id карт с повторами */
  deck: string[];
  /** личная реликвия */
  relic: string;
}

// ── путь ─────────────────────────────────────────────────────
export type NodeKind = 'foe' | 'elite' | 'boss' | 'rest' | 'find' | 'trade' | 'omen';

export interface RunNode {
  id: string;
  kind: NodeKind;
  /** для боёв — id противника */
  foe?: string;
  /** для событий — id знамения */
  omen?: string;
  /** товары торговца */
  wares?: { cards: string[]; relics: string[]; prices: number[] };
}

export interface Leg {
  tier: FloorId;
  name: string;
  /** зерно для генерации этажа — карта не хранится, а строится заново */
  seed: string;
  /** события этажа; последнее — хранитель у спуска */
  nodes: RunNode[];
}

export interface RunState {
  seed: string;
  heroId: string;
  hp: number;
  maxHp: number;
  /** искры — валюта торговца */
  sparks: number;
  deck: string[];
  relics: string[];
  legs: Leg[];
  /** текущий этаж */
  leg: number;
  /** id пройденных событий */
  done: string[];
}

// ── знамения ─────────────────────────────────────────────────
export interface OmenChoice {
  text: string;
  /** что произойдёт */
  outcome: string;
  effects: {
    hp?: number;
    maxHp?: number;
    sparks?: number;
    card?: string;
    removeCard?: boolean;
    relic?: string;
    upgrade?: boolean;
  };
}

export interface OmenDef {
  id: string;
  name: string;
  text: string;
  choices: OmenChoice[];
}
