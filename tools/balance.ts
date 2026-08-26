import { simulate, type UnitSpec } from '../src/game/engine/battle';
import { campaignTeam, towerTeam } from '../src/game/engine/units';
import { heroDef } from '../src/game/data/heroes';
import { deriveHero } from '../src/game/engine/stats';
import { commanderLevel, heroLevelCap } from '../src/game/engine/progression';
import { stageInfo } from '../src/game/data/campaign';
import type { GearItem, HeroSave } from '../src/game/types';
import { GEAR_SLOTS, rollGear, upgradeGear } from '../src/game/data/gear';
import { buildTree, treePoints } from '../src/game/data/tree';
import { RNG } from '../src/game/engine/rng';

function save(id: string, level: number, stars: number): HeroSave {
  return { id, level, exp: 0, stars, shards: 0, tree: {}, gear: {} };
}

/** Гардероб «среднего» игрока: 6 предметов подходящего тира, заточенных наполовину */
function kit(id: string, tier: number, plus: number, rng: RNG) {
  const gear: Record<string, GearItem> = {};
  const slots: Record<string, string> = {};
  for (const s of GEAR_SLOTS) {
    let item = rollGear(rng, s.id, tier >= 3 ? 'legend' : tier >= 1 ? 'epic' : 'rare', tier);
    for (let i = 0; i < plus; i++) item = upgradeGear(item);
    item.equippedBy = id;
    gear[item.uid] = item;
    slots[s.id] = item.uid;
  }
  return { gear, slots };
}

function fillTree(role: Parameters<typeof buildTree>[0], points: number): Record<string, number> {
  const nodes = buildTree(role);
  const tree: Record<string, number> = {};
  let left = points;
  for (const n of nodes) {
    while (left > 0 && (tree[n.id] ?? 0) < n.maxRank && (!n.requires || (tree[n.requires] ?? 0) > 0)) {
      tree[n.id] = (tree[n.id] ?? 0) + 1;
      left--;
    }
  }
  return tree;
}

function spec(id: string, level: number, stars: number, tier = -1, plus = 0, rng?: RNG): UnitSpec {
  const def = heroDef(id);
  const s = save(id, level, stars);
  let gearById: Record<string, GearItem> = {};
  if (tier >= 0 && rng) {
    const k = kit(id, tier, plus, rng);
    gearById = k.gear;
    s.gear = k.slots as HeroSave['gear'];
  }
  s.tree = fillTree(def.role, treePoints(level, stars));
  const d = deriveHero(def, s, gearById);
  return { def, stats: d.stats, mods: d.mods, skillLevels: d.skillLevels, uid: `a_${id}` };
}

function playerTeam(index: number, geared = true): UnitSpec[] {
  const cap = heroLevelCap(commanderLevel(index, 0));
  const level = Math.max(1, cap - 2);
  const stars = Math.min(6, 1 + Math.floor(index / 24));
  const ids =
    index < 12
      ? ['midori', 'momo', 'neko', 'rinka', 'seira']
      : index < 40
        ? ['yuki', 'tsubaki', 'sora', 'rinka', 'seira']
        : ['honoka', 'ayane', 'koharu', 'rei', 'kuro'];
  const rng = new RNG(`kit_${index}`);
  const tier = !geared || index < 8 ? -1 : Math.min(4, Math.floor(index / 26));
  const plus = geared ? Math.min(15, Math.floor(index / 12)) : 0;
  return ids.map((id) => spec(id, level, stars, tier, plus, rng));
}

function winRate(allies: UnitSpec[], foes: UnitSpec[], n = 9): number {
  let w = 0;
  for (let i = 0; i < n; i++) if (simulate(allies, foes, `s${i}`).win) w++;
  return w / n;
}

const rows: string[] = [];

// Самый первый бой новичка: четыре стартовые героини 1 уровня без снаряжения
const starters = ['momo', 'midori', 'neko', 'rinka', 'seira'].map((id) => spec(id, 1, 1));
for (const idx of [0, 1, 2, 3, 5, 8, 11]) {
  const wr = winRate(starters, campaignTeam(idx));
  rows.push(`новичок  ${stageInfo(idx).label.padEnd(6)} 5 стартовых ур.1 без шмота        winrate=${String(Math.round(wr * 100)).padStart(3)}%`);
}
rows.push('');
for (const idx of [0, 5, 11, 17, 23, 29, 35, 41, 47, 53, 59, 65, 71, 77, 83, 89, 95, 101, 107, 113, 119, 125, 131, 137, 143]) {
  const info = stageInfo(idx);
  const wrG = winRate(playerTeam(idx, true), campaignTeam(idx));
  const wrN = winRate(playerTeam(idx, false), campaignTeam(idx));
  rows.push(`кампания ${info.label.padEnd(6)} idx=${String(idx).padStart(3)} ${info.boss ? 'БОСС ' : info.elite ? 'элита' : '     '} сшмоткой=${String(Math.round(wrG * 100)).padStart(3)}%  без=${String(Math.round(wrN * 100)).padStart(3)}%`);
}
for (const f of [1, 3, 5, 10, 20, 30, 50, 70, 90, 110, 130]) {
  const wr = winRate(playerTeam(Math.min(143, f * 3), true), towerTeam(f));
  rows.push(`башня  этаж ${String(f).padStart(3)}                          сшмоткой=${String(Math.round(wr * 100)).padStart(3)}%`);
}
console.log(rows.join('\n'));
