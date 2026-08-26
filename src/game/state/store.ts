import { create } from 'zustand';
import type {
  BattleResult,
  GearItem,
  GearSlot,
  HeroSave,
  Rarity,
  Reward,
  Resources,
  Screen,
  TowerRun,
} from '../types';
import type { UnitSpec } from '../engine/battle';
import { HEROES, heroDef } from '../data/heroes';
import { GEAR_SLOTS, gearScore, gearUpgradeCost, rollGear, upgradeGear } from '../data/gear';
import { buildTree, treePoints } from '../data/tree';
import { deriveHero, MAX_STARS } from '../engine/stats';
import { RNG } from '../engine/rng';
import { arenaTeam, ARENA_NAMES, campaignTeam, playerSpec, specPower, towerTeam, type TeamMods } from '../engine/units';
import {
  AFK_CAP_HOURS,
  afkAccrued,
  ascendCost,
  commanderLevel,
  dupeShards,
  expToNext,
  goldToNext,
  heroLevelCap,
  PITY_LEGEND,
  PITY_MYTHIC,
  SUMMON_GEM_COST,
  SUMMON_RATES,
  stageReward,
} from '../engine/progression';
import { stageInfo, TOTAL_STAGES } from '../data/campaign';
import { BUFF_BY_ID, draftBuffs, towerReward } from '../data/tower';
import { loadRaw, saveRaw, clearSave } from './storage';

const SAVE_VERSION = 1;
const ARENA_TICKET_MS = 25 * 60 * 1000;
const ARENA_TICKET_CAP = 5;
const QUICK_FREE_PER_DAY = 3;

export interface ArenaOpponent {
  seed: string;
  name: string;
  level: number;
  mult: number;
  points: number;
  power: number;
}

export interface BattleSetup {
  mode: 'campaign' | 'tower' | 'arena';
  title: string;
  subtitle: string;
  seed: string;
  allies: UnitSpec[];
  foes: UnitSpec[];
  stageIndex?: number;
  floor?: number;
  opponent?: ArenaOpponent;
  bg: [string, string];
  accent: string;
}

export interface SummonResult {
  heroId: string;
  rarity: Rarity;
  isNew: boolean;
  shards: number;
}

export interface Toast {
  id: number;
  text: string;
  icon?: string;
  tone?: 'good' | 'bad' | 'info';
}

interface Persisted {
  v: number;
  res: Resources;
  heroes: Record<string, HeroSave>;
  gear: Record<string, GearItem>;
  team: (string | null)[];
  stage: number;
  afkSince: number;
  lastSeen: number;
  pity: { legend: number; mythic: number; total: number };
  tower: TowerRun;
  arena: { points: number; tickets: number; ticketAt: number; wins: number; losses: number; season: number };
  quick: { date: string; used: number };
  settings: { auto: boolean; speed: number; manual: boolean; reduceFx: boolean };
  seen: { intro: boolean };
}

export interface GameStore extends Persisted {
  ready: boolean;
  screen: Screen;
  activeHero: string | null;
  gearFilter: GearSlot | 'all';
  battle: BattleSetup | null;
  lastResult: (BattleResult & { mode: BattleSetup['mode'] }) | null;
  summonResults: SummonResult[] | null;
  arenaOpponents: ArenaOpponent[];
  toasts: Toast[];

  init: () => Promise<void>;
  persist: () => void;
  hardReset: () => Promise<void>;

  go: (s: Screen) => void;
  openHero: (id: string) => void;
  setGearFilter: (f: GearSlot | 'all') => void;
  toast: (text: string, tone?: Toast['tone'], icon?: string) => void;
  dropToast: (id: number) => void;

  grant: (r: Reward, silent?: boolean) => void;
  spend: (r: Partial<Resources>) => boolean;

  levelHero: (id: string, times?: number) => void;
  ascendHero: (id: string) => void;
  learnNode: (heroId: string, nodeId: string) => void;
  resetTree: (heroId: string) => void;

  equip: (heroId: string, uid: string) => void;
  unequip: (heroId: string, slot: GearSlot) => void;
  autoEquip: (heroId: string) => void;
  upgradeGearItem: (uid: string) => void;
  dismantle: (uids: string[]) => void;
  toggleLock: (uid: string) => void;
  rollGearReward: (count: number, tier: number) => GearItem[];

  setTeamSlot: (slot: number, heroId: string | null) => void;
  autoTeam: () => void;
  moveTeam: (from: number, to: number) => void;

  summon: (count: number, useScrolls: boolean) => void;
  clearSummon: () => void;

  collectAfk: () => void;
  quickAfk: () => void;

  beginCampaign: () => void;
  beginTowerFloor: () => void;
  startTowerRun: () => void;
  abandonTower: () => void;
  pickTowerBuff: (id: string) => void;
  refreshArena: (force?: boolean) => void;
  beginArena: (op: ArenaOpponent) => void;

  finishBattle: (r: BattleResult) => void;
  exitBattle: () => void;

  setSetting: <K extends keyof Persisted['settings']>(k: K, v: Persisted['settings'][K]) => void;
}

// ── Начальный сейв ────────────────────────────────────────────
function newHero(id: string, level = 1, stars = 1): HeroSave {
  return { id, level, exp: 0, stars, shards: 0, tree: {}, gear: {} };
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function freshSave(): Persisted {
  const now = Date.now();
  const starters = ['momo', 'midori', 'neko', 'rinka', 'seira'];
  const heroes: Record<string, HeroSave> = {};
  for (const id of starters) heroes[id] = newHero(id, 1, 1);
  return {
    v: SAVE_VERSION,
    res: { gold: 12000, gems: 3200, exp: 9000, scrolls: 6, dust: 300, echo: 0, glory: 0, stamina: 60 },
    heroes,
    gear: {},
    team: [...starters],
    stage: 0,
    afkSince: now,
    lastSeen: now,
    pity: { legend: 0, mythic: 0, total: 0 },
    tower: { active: false, floor: 1, best: 0, hp: {}, buffs: [], team: [], pendingDraft: null },
    arena: { points: 1000, tickets: ARENA_TICKET_CAP, ticketAt: now, wins: 0, losses: 0, season: 1 },
    quick: { date: todayKey(), used: 0 },
    settings: { auto: true, speed: 1, manual: true, reduceFx: false },
    seen: { intro: false },
  };
}

function pickPersisted(s: GameStore): Persisted {
  return {
    v: SAVE_VERSION,
    res: s.res,
    heroes: s.heroes,
    gear: s.gear,
    team: s.team,
    stage: s.stage,
    afkSince: s.afkSince,
    lastSeen: Date.now(),
    pity: s.pity,
    tower: s.tower,
    arena: s.arena,
    quick: s.quick,
    settings: s.settings,
    seen: s.seen,
  };
}

let persistTimer: number | undefined;
let toastId = 1;

// ── Сам стор ─────────────────────────────────────────────────
export const useGame = create<GameStore>((set, get) => ({
  ...freshSave(),
  ready: false,
  screen: 'campaign',
  activeHero: null,
  gearFilter: 'all',
  battle: null,
  lastResult: null,
  summonResults: null,
  arenaOpponents: [],
  toasts: [],

  init: async () => {
    const raw = await loadRaw();
    if (raw) {
      try {
        const data = JSON.parse(raw) as Persisted;
        if (data && data.v === SAVE_VERSION) {
          set({ ...data, ready: true });
          get().refreshArena(true);
          return;
        }
      } catch {
        /* битый сейв — начинаем заново */
      }
    }
    set({ ...freshSave(), ready: true });
    get().refreshArena(true);
    get().persist();
  },

  persist: () => {
    if (persistTimer) window.clearTimeout(persistTimer);
    persistTimer = window.setTimeout(() => {
      void saveRaw(JSON.stringify(pickPersisted(get())));
    }, 400);
  },

  hardReset: async () => {
    await clearSave();
    set({ ...freshSave(), ready: true, battle: null, lastResult: null, summonResults: null, screen: 'campaign' });
    get().refreshArena(true);
    get().persist();
  },

  go: (screen) => set({ screen }),
  openHero: (id) => set({ activeHero: id, screen: 'hero' }),
  setGearFilter: (gearFilter) => set({ gearFilter }),

  toast: (text, tone = 'info', icon) => {
    const id = toastId++;
    set((s) => ({ toasts: [...s.toasts, { id, text, tone, icon }] }));
    window.setTimeout(() => get().dropToast(id), 2600);
  },
  dropToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // ── Ресурсы ────────────────────────────────────────────────
  grant: (r, silent) => {
    set((s) => {
      const res = { ...s.res };
      res.gold += r.gold ?? 0;
      res.gems += r.gems ?? 0;
      res.exp += r.exp ?? 0;
      res.scrolls += r.scrolls ?? 0;
      res.dust += r.dust ?? 0;
      res.echo += r.echo ?? 0;
      res.glory += r.glory ?? 0;
      const heroes = { ...s.heroes };
      for (const sh of r.shards ?? []) {
        const h = heroes[sh.heroId];
        if (h) heroes[sh.heroId] = { ...h, shards: h.shards + sh.amount };
        else heroes[sh.heroId] = { ...newHero(sh.heroId), shards: sh.amount };
      }
      return { res, heroes };
    });
    if (r.gear) {
      const items = get().rollGearReward(r.gear, Math.floor(get().stage / 12));
      if (!silent && items.length) get().toast(`Найдено снаряжение ×${items.length}`, 'good', '🎁');
    }
    get().persist();
  },

  spend: (cost) => {
    const res = get().res;
    for (const [k, v] of Object.entries(cost) as [keyof Resources, number][]) {
      if ((res[k] ?? 0) < v) return false;
    }
    set((s) => {
      const next = { ...s.res };
      for (const [k, v] of Object.entries(cost) as [keyof Resources, number][]) next[k] -= v;
      return { res: next };
    });
    get().persist();
    return true;
  },

  // ── Героини ────────────────────────────────────────────────
  levelHero: (id, times = 1) => {
    const s = get();
    const h = s.heroes[id];
    if (!h) return;
    const cap = heroLevelCap(commanderLevel(s.stage, s.tower.best));
    let level = h.level;
    let exp = s.res.exp;
    let gold = s.res.gold;
    let gained = 0;
    for (let i = 0; i < times; i++) {
      if (level >= cap) break;
      const ne = expToNext(level);
      const ng = goldToNext(level);
      if (exp < ne || gold < ng) break;
      exp -= ne;
      gold -= ng;
      level += 1;
      gained += 1;
    }
    if (!gained) {
      get().toast(level >= cap ? `Предел уровня: ${cap}. Пройдите кампанию` : 'Не хватает опыта или золота', 'bad', '⚠️');
      return;
    }
    set((st) => ({
      heroes: { ...st.heroes, [id]: { ...st.heroes[id], level } },
      res: { ...st.res, exp, gold },
    }));
    get().persist();
  },

  ascendHero: (id) => {
    const s = get();
    const h = s.heroes[id];
    if (!h) return;
    const def = heroDef(id);
    const cost = ascendCost(def.rarity, h.stars);
    if (!cost) return;
    if (h.shards < cost.shards || s.res.dust < cost.dust) {
      get().toast(`Нужно ${cost.shards} осколков и ${cost.dust} пыли`, 'bad', '⚠️');
      return;
    }
    set((st) => ({
      heroes: { ...st.heroes, [id]: { ...st.heroes[id], stars: st.heroes[id].stars + 1, shards: st.heroes[id].shards - cost.shards } },
      res: { ...st.res, dust: st.res.dust - cost.dust },
    }));
    get().toast(`${def.name}: ${h.stars + 1} ★`, 'good', '⭐');
    get().persist();
  },

  learnNode: (heroId, nodeId) => {
    const s = get();
    const h = s.heroes[heroId];
    if (!h) return;
    const def = heroDef(heroId);
    const nodes = buildTree(def.role);
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const spent = Object.values(h.tree).reduce((a, b) => a + b, 0);
    const avail = treePoints(h.level, h.stars) - spent;
    if (avail <= 0) {
      get().toast('Нет свободных очков навыков', 'bad', '⚠️');
      return;
    }
    const rank = h.tree[nodeId] ?? 0;
    if (rank >= node.maxRank) return;
    if (node.requires && (h.tree[node.requires] ?? 0) === 0) {
      get().toast('Сначала откройте предыдущий узел', 'bad', '🔒');
      return;
    }
    set((st) => ({
      heroes: { ...st.heroes, [heroId]: { ...st.heroes[heroId], tree: { ...st.heroes[heroId].tree, [nodeId]: rank + 1 } } },
    }));
    get().persist();
  },

  resetTree: (heroId) => {
    const s = get();
    const h = s.heroes[heroId];
    if (!h) return;
    const spent = Object.values(h.tree).reduce((a, b) => a + b, 0);
    if (!spent) return;
    const cost = spent * 30;
    if (s.res.dust < cost) {
      get().toast(`Сброс стоит ${cost} пыли`, 'bad', '⚠️');
      return;
    }
    set((st) => ({
      heroes: { ...st.heroes, [heroId]: { ...st.heroes[heroId], tree: {} } },
      res: { ...st.res, dust: st.res.dust - cost },
    }));
    get().toast('Дерево навыков сброшено', 'info', '♻️');
    get().persist();
  },

  // ── Снаряжение ─────────────────────────────────────────────
  equip: (heroId, uid) => {
    set((s) => {
      const item = s.gear[uid];
      if (!item) return {};
      const gear = { ...s.gear };
      const heroes = { ...s.heroes };
      // снять с прежней владелицы
      if (item.equippedBy && heroes[item.equippedBy]) {
        const prev = { ...heroes[item.equippedBy] };
        prev.gear = { ...prev.gear };
        delete prev.gear[item.slot];
        heroes[item.equippedBy] = prev;
      }
      const target = { ...heroes[heroId] };
      const oldUid = target.gear[item.slot];
      if (oldUid && gear[oldUid]) gear[oldUid] = { ...gear[oldUid], equippedBy: undefined };
      target.gear = { ...target.gear, [item.slot]: uid };
      heroes[heroId] = target;
      gear[uid] = { ...item, equippedBy: heroId };
      return { gear, heroes };
    });
    get().persist();
  },

  unequip: (heroId, slot) => {
    set((s) => {
      const h = s.heroes[heroId];
      const uid = h?.gear[slot];
      if (!uid) return {};
      const heroes = { ...s.heroes };
      const next = { ...h, gear: { ...h.gear } };
      delete next.gear[slot];
      heroes[heroId] = next;
      const gear = { ...s.gear, [uid]: { ...s.gear[uid], equippedBy: undefined } };
      return { heroes, gear };
    });
    get().persist();
  },

  autoEquip: (heroId) => {
    const s = get();
    let equipped = 0;
    for (const slot of GEAR_SLOTS) {
      const pool = Object.values(get().gear)
        .filter((g) => g.slot === slot.id && (!g.equippedBy || g.equippedBy === heroId))
        .sort((a, b) => gearScore(b) - gearScore(a));
      const best = pool[0];
      if (!best) continue;
      const current = get().heroes[heroId]?.gear[slot.id];
      if (current === best.uid) continue;
      get().equip(heroId, best.uid);
      equipped++;
    }
    get().toast(equipped ? `Экипировано предметов: ${equipped}` : 'Лучшего снаряжения не нашлось', equipped ? 'good' : 'info', '⚙️');
    void s;
  },

  upgradeGearItem: (uid) => {
    const s = get();
    const item = s.gear[uid];
    if (!item || item.level >= 15) return;
    const cost = gearUpgradeCost(item);
    const dust = Math.round(cost / 22);
    if (s.res.gold < cost || s.res.dust < dust) {
      get().toast(`Нужно ${cost} золота и ${dust} пыли`, 'bad', '⚠️');
      return;
    }
    set((st) => ({
      gear: { ...st.gear, [uid]: upgradeGear(st.gear[uid]) },
      res: { ...st.res, gold: st.res.gold - cost, dust: st.res.dust - dust },
    }));
    get().persist();
  },

  dismantle: (uids) => {
    let dust = 0;
    let gold = 0;
    set((s) => {
      const gear = { ...s.gear };
      const heroes = { ...s.heroes };
      for (const uid of uids) {
        const item = gear[uid];
        if (!item || item.locked) continue;
        const mult: Record<Rarity, number> = { rare: 1, epic: 2.2, legend: 4.5, mythic: 9 };
        dust += Math.round((14 + item.level * 8) * mult[item.rarity]);
        gold += Math.round((40 + item.level * 26) * mult[item.rarity]);
        if (item.equippedBy && heroes[item.equippedBy]) {
          const h = { ...heroes[item.equippedBy], gear: { ...heroes[item.equippedBy].gear } };
          delete h.gear[item.slot];
          heroes[item.equippedBy] = h;
        }
        delete gear[uid];
      }
      return { gear, heroes, res: { ...s.res, dust: s.res.dust + dust, gold: s.res.gold + gold } };
    });
    if (dust) get().toast(`Разобрано: +${dust} пыли, +${gold} золота`, 'good', '♻️');
    get().persist();
  },

  toggleLock: (uid) => {
    set((s) => ({ gear: { ...s.gear, [uid]: { ...s.gear[uid], locked: !s.gear[uid].locked } } }));
    get().persist();
  },

  rollGearReward: (count, tier) => {
    const rng = new RNG(`gear_${Date.now()}_${Math.random()}`);
    const items: GearItem[] = [];
    for (let i = 0; i < count; i++) {
      const rarity = rng.weighted<Rarity>([
        ['rare', Math.max(6, 52 - tier * 5)],
        ['epic', 34],
        ['legend', 11 + tier * 3],
        ['mythic', 3 + tier * 2],
      ]);
      const slot = GEAR_SLOTS[rng.int(GEAR_SLOTS.length)].id;
      items.push(rollGear(rng, slot, rarity, tier));
    }
    set((s) => {
      const gear = { ...s.gear };
      for (const it of items) gear[it.uid] = it;
      return { gear };
    });
    get().persist();
    return items;
  },

  // ── Отряд ──────────────────────────────────────────────────
  setTeamSlot: (slot, heroId) => {
    set((s) => {
      const team = [...s.team];
      if (heroId) {
        const existing = team.indexOf(heroId);
        if (existing >= 0) team[existing] = team[slot];
      }
      team[slot] = heroId;
      return { team };
    });
    get().persist();
  },

  moveTeam: (from, to) => {
    set((s) => {
      const team = [...s.team];
      const [x] = team.splice(from, 1);
      team.splice(to, 0, x);
      return { team };
    });
    get().persist();
  },

  autoTeam: () => {
    const s = get();
    const owned = Object.values(s.heroes);
    const scored = owned
      .map((h) => ({ h, d: deriveHero(heroDef(h.id), h, s.gear) }))
      .sort((a, b) => b.d.power - a.d.power);
    const guards = scored.filter((x) => heroDef(x.h.id).role === 'guard');
    const healers = scored.filter((x) => heroDef(x.h.id).role === 'healer');
    const rest = scored.filter((x) => !['guard', 'healer'].includes(heroDef(x.h.id).role));
    const team: (string | null)[] = [];
    if (guards[0]) team.push(guards[0].h.id);
    for (const r of rest) {
      if (team.length >= 4) break;
      team.push(r.h.id);
    }
    if (healers[0] && !team.includes(healers[0].h.id)) team.push(healers[0].h.id);
    for (const x of scored) {
      if (team.length >= 5) break;
      if (!team.includes(x.h.id)) team.push(x.h.id);
    }
    while (team.length < 5) team.push(null);
    set({ team: team.slice(0, 5) });
    get().toast('Отряд собран автоматически', 'good', '✨');
    get().persist();
  },

  // ── Призыв ─────────────────────────────────────────────────
  summon: (count, useScrolls) => {
    const s = get();
    const cost = useScrolls ? { scrolls: count } : { gems: SUMMON_GEM_COST * count };
    if (!get().spend(cost as Partial<Resources>)) {
      get().toast(useScrolls ? 'Не хватает свитков' : 'Не хватает кристаллов', 'bad', '💎');
      return;
    }
    const rng = new RNG(`summon_${Date.now()}_${s.pity.total}_${Math.random()}`);
    const results: SummonResult[] = [];
    const heroes = { ...get().heroes };
    const pity = { ...get().pity };

    for (let i = 0; i < count; i++) {
      pity.total += 1;
      pity.legend += 1;
      pity.mythic += 1;
      let rarity: Rarity;
      if (pity.mythic >= PITY_MYTHIC) rarity = 'mythic';
      else if (pity.legend >= PITY_LEGEND) rarity = rng.chance(0.16) ? 'mythic' : 'legend';
      else rarity = rng.weighted(SUMMON_RATES.map(([r, w]) => [r, w] as [Rarity, number]));

      if (rarity === 'mythic') {
        pity.mythic = 0;
        pity.legend = 0;
      } else if (rarity === 'legend') {
        pity.legend = 0;
      }

      const pool = HEROES.filter((h) => h.rarity === rarity);
      const def = pool[rng.int(pool.length)];
      const existing = heroes[def.id];
      if (existing) {
        const sh = dupeShards(rarity);
        heroes[def.id] = { ...existing, shards: existing.shards + sh };
        results.push({ heroId: def.id, rarity, isNew: false, shards: sh });
      } else {
        heroes[def.id] = newHero(def.id, 1, 1);
        results.push({ heroId: def.id, rarity, isNew: true, shards: 0 });
      }
    }

    set({ heroes, pity, summonResults: results });
    // автоматически посадить новую героиню в пустой слот
    const team = [...get().team];
    for (const r of results) {
      if (!r.isNew) continue;
      const empty = team.indexOf(null);
      if (empty >= 0) team[empty] = r.heroId;
    }
    set({ team });
    get().persist();
  },

  clearSummon: () => set({ summonResults: null }),

  // ── AFK-награды ────────────────────────────────────────────
  collectAfk: () => {
    const s = get();
    const seconds = (Date.now() - s.afkSince) / 1000;
    if (seconds < 30) {
      get().toast('Награда ещё копится', 'info', '⏳');
      return;
    }
    const a = afkAccrued(s.stage, seconds);
    const shards = pickAfkShards(s, a.shards);
    get().grant({ gold: a.gold, exp: a.exp, dust: a.dust, gems: a.gems, shards }, true);
    set({ afkSince: Date.now() });
    get().toast(`Собрано за ${a.hours.toFixed(1)} ч`, 'good', '📦');
    get().persist();
  },

  quickAfk: () => {
    const s = get();
    const today = todayKey();
    const quick = s.quick.date === today ? { ...s.quick } : { date: today, used: 0 };
    const free = quick.used < QUICK_FREE_PER_DAY;
    if (!free) {
      if (!get().spend({ gems: 120 })) {
        get().toast('Быстрые награды кончились (120 💎 за попытку)', 'bad', '💎');
        return;
      }
    }
    quick.used += 1;
    const a = afkAccrued(s.stage, 2 * 3600);
    const shards = pickAfkShards(s, a.shards);
    get().grant({ gold: a.gold, exp: a.exp, dust: a.dust, gems: a.gems, shards }, true);
    set({ quick });
    get().toast(`Быстрая награда: 2 ч${free ? ` (осталось ${QUICK_FREE_PER_DAY - quick.used})` : ''}`, 'good', '⚡');
    get().persist();
  },

  // ── Бои ────────────────────────────────────────────────────
  beginCampaign: () => {
    const s = get();
    if (s.stage >= TOTAL_STAGES) {
      get().toast('Кампания пройдена полностью!', 'good', '🏆');
      return;
    }
    const allies = buildAllies(s);
    if (!allies.length) {
      get().toast('Соберите отряд', 'bad', '⚠️');
      return;
    }
    const info = stageInfo(s.stage);
    set({
      battle: {
        mode: 'campaign',
        title: `${info.chapter.name} · ${info.label}`,
        subtitle: info.boss ? 'Босс главы' : info.elite ? 'Элитный отряд' : info.chapter.subtitle,
        seed: `camp_${s.stage}_${Date.now()}`,
        allies,
        foes: campaignTeam(s.stage),
        stageIndex: s.stage,
        bg: info.chapter.bg,
        accent: info.chapter.accent,
      },
      screen: 'battle',
      lastResult: null,
    });
  },

  startTowerRun: () => {
    const s = get();
    const allies = buildAllies(s);
    if (!allies.length) {
      get().toast('Соберите отряд', 'bad', '⚠️');
      return;
    }
    set({
      tower: {
        active: true,
        floor: 1,
        best: s.tower.best,
        hp: {},
        buffs: [],
        team: s.team.filter(Boolean) as string[],
        pendingDraft: null,
      },
    });
    get().persist();
    get().beginTowerFloor();
  },

  abandonTower: () => {
    const s = get();
    const reached = s.tower.floor - 1;
    set({ tower: { ...s.tower, active: false, pendingDraft: null, buffs: [], hp: {} } });
    if (reached > 0) get().toast(`Забег окончен на ${reached} этаже`, 'info', '🏳️');
    get().persist();
  },

  beginTowerFloor: () => {
    const s = get();
    const mods = towerMods(s.tower.buffs);
    const allies = buildAllies(s, mods).map((a) => ({
      ...a,
      hpFraction: s.tower.hp[a.uid] ?? 1,
    }));
    if (!allies.length) {
      get().toast('Соберите отряд', 'bad', '⚠️');
      return;
    }
    set({
      battle: {
        mode: 'tower',
        title: `Башня Эха · этаж ${s.tower.floor}`,
        subtitle: s.tower.floor % 10 === 0 ? 'Страж этажа' : `Пройдено этажей: ${s.tower.floor - 1}`,
        seed: `tower_${s.tower.floor}_${Date.now()}`,
        allies,
        foes: towerTeam(s.tower.floor),
        floor: s.tower.floor,
        bg: ['#1b1440', '#07050f'],
        accent: '#a06bff',
      },
      screen: 'battle',
      lastResult: null,
    });
  },

  pickTowerBuff: (id) => {
    const s = get();
    if (!s.tower.pendingDraft) return;
    const buff = BUFF_BY_ID[id];
    const tower: TowerRun = { ...s.tower, pendingDraft: null };
    if (buff?.special === 'healFull' || buff?.special === 'reviveAll') {
      tower.hp = {};
    } else if (buff?.special === 'heal50') {
      const hp: Record<string, number> = {};
      for (const [uid, v] of Object.entries(tower.hp)) hp[uid] = v > 0 ? Math.min(1, v + 0.5) : 0;
      tower.hp = hp;
    }
    if (buff && !buff.special) tower.buffs = [...tower.buffs, id];
    else if (buff?.special) tower.buffs = [...tower.buffs];
    set({ tower });
    get().persist();
    get().beginTowerFloor();
  },

  refreshArena: (force) => {
    const s = get();
    if (!force && s.arenaOpponents.length) return;
    const level = Math.max(1, Math.round(2 + s.stage * 0.9));
    const rng = new RNG(`arena_${Math.floor(Date.now() / 60000)}_${s.arena.points}`);
    const ops: ArenaOpponent[] = [];
    const deltas = [-0.14, -0.05, 0.04, 0.12, 0.24];
    for (let i = 0; i < 5; i++) {
      const seed = `op_${rng.int(1e9)}`;
      const mult = Math.max(0.35, 0.55 * (1 + s.stage * 0.017) * (1 + deltas[i]));
      const team = arenaTeam(seed, mult, level);
      ops.push({
        seed,
        name: ARENA_NAMES[rng.int(ARENA_NAMES.length)],
        level,
        mult,
        points: Math.round(12 + i * 6),
        power: Math.round(team.reduce((a, t) => a + specPower(t), 0)),
      });
    }
    set({ arenaOpponents: ops });
  },

  beginArena: (op) => {
    const s = get();
    const tickets = arenaTickets(s);
    if (tickets.count <= 0) {
      get().toast('Билеты арены кончились', 'bad', '🎟️');
      return;
    }
    const allies = buildAllies(s);
    if (!allies.length) {
      get().toast('Соберите отряд', 'bad', '⚠️');
      return;
    }
    set({
      arena: { ...s.arena, tickets: tickets.count - 1, ticketAt: tickets.at },
      battle: {
        mode: 'arena',
        title: `Арена · ${op.name}`,
        subtitle: `Сила соперника ≈ ${formatPower(op.power)}`,
        seed: `arena_${op.seed}_${Date.now()}`,
        allies,
        foes: arenaTeam(op.seed, op.mult, op.level),
        opponent: op,
        bg: ['#2a1030', '#08050e'],
        accent: '#ff5ea8',
      },
      screen: 'battle',
      lastResult: null,
    });
    get().persist();
  },

  finishBattle: (r) => {
    const s = get();
    const b = s.battle;
    if (!b) return;
    set({ lastResult: { ...r, mode: b.mode } });

    if (b.mode === 'campaign' && b.stageIndex !== undefined) {
      if (r.win) {
        const first = b.stageIndex >= s.stage;
        const reward = stageReward(b.stageIndex, first);
        get().grant(reward, true);
        if (first) set({ stage: Math.min(TOTAL_STAGES, s.stage + 1) });
      }
    }

    if (b.mode === 'tower' && b.floor !== undefined) {
      if (r.win) {
        get().grant(towerReward(b.floor), true);
        const hp: Record<string, number> = {};
        for (const a of b.allies) hp[a.uid] = r.hp[a.uid] ?? 0;
        const rng = new RNG(`draft_${b.floor}_${Date.now()}`);
        set({
          tower: {
            ...s.tower,
            floor: b.floor + 1,
            best: Math.max(s.tower.best, b.floor),
            hp,
            pendingDraft: draftBuffs(rng, b.floor),
          },
        });
      } else {
        set({ tower: { ...s.tower, active: false, pendingDraft: null, buffs: [], hp: {} } });
      }
    }

    if (b.mode === 'arena' && b.opponent) {
      const delta = r.win ? b.opponent.points : -Math.round(b.opponent.points * 0.45);
      set({
        arena: {
          ...s.arena,
          points: Math.max(0, s.arena.points + delta),
          wins: s.arena.wins + (r.win ? 1 : 0),
          losses: s.arena.losses + (r.win ? 0 : 1),
        },
      });
      get().grant(
        {
          glory: r.win ? 40 + b.opponent.points : 12,
          gold: r.win ? 900 + s.stage * 40 : 250,
          exp: r.win ? 600 + s.stage * 30 : 150,
        },
        true,
      );
      get().refreshArena(true);
    }

    get().persist();
  },

  exitBattle: () => {
    const s = get();
    const mode = s.battle?.mode;
    const won = s.lastResult?.win;
    set({ battle: null, lastResult: null });
    if (mode === 'tower') {
      set({ screen: 'tower' });
      if (won && get().tower.pendingDraft) return;
    } else if (mode === 'arena') {
      set({ screen: 'arena' });
    } else {
      set({ screen: 'campaign' });
    }
  },

  setSetting: (k, v) => {
    set((s) => ({ settings: { ...s.settings, [k]: v } }));
    get().persist();
  },
}));

// ── Вспомогательные функции ──────────────────────────────────
export function buildAllies(s: GameStore, mods: TeamMods = {}): UnitSpec[] {
  return s.team
    .filter((id): id is string => Boolean(id) && Boolean(s.heroes[id as string]))
    .map((id) => playerSpec(s.heroes[id], s.gear, mods));
}

export function towerMods(buffIds: string[]): TeamMods {
  const out: TeamMods = {};
  for (const id of buffIds) {
    const b = BUFF_BY_ID[id];
    if (!b?.mods) continue;
    for (const [k, v] of Object.entries(b.mods) as [keyof TeamMods, number][]) {
      out[k] = (out[k] ?? 0) + v;
    }
  }
  return out;
}

export function teamPowerOf(s: GameStore): number {
  return s.team
    .filter((id): id is string => Boolean(id) && Boolean(s.heroes[id as string]))
    .reduce((a, id) => a + deriveHero(heroDef(id), s.heroes[id], s.gear).power, 0);
}

function pickAfkShards(s: GameStore, amount: number): { heroId: string; amount: number }[] {
  if (amount <= 0) return [];
  const owned = Object.keys(s.heroes);
  if (!owned.length) return [];
  const rng = new RNG(`afk_${Date.now()}`);
  const target = owned[rng.int(owned.length)];
  return [{ heroId: target, amount }];
}

export function arenaTickets(s: GameStore): { count: number; at: number; nextIn: number } {
  const now = Date.now();
  let count = s.arena.tickets;
  let at = s.arena.ticketAt;
  while (count < ARENA_TICKET_CAP && now - at >= ARENA_TICKET_MS) {
    count += 1;
    at += ARENA_TICKET_MS;
  }
  if (count >= ARENA_TICKET_CAP) at = now;
  return { count, at, nextIn: count >= ARENA_TICKET_CAP ? 0 : ARENA_TICKET_MS - (now - at) };
}

export function afkSeconds(s: GameStore): number {
  return Math.min(AFK_CAP_HOURS * 3600, (Date.now() - s.afkSince) / 1000);
}

export function formatPower(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

export function ownedHeroes(s: GameStore): HeroSave[] {
  return Object.values(s.heroes);
}

export { MAX_STARS };
