import { useMemo, useState } from 'react';
import { useGame, formatPower } from '../../game/state/store';
import { heroDef } from '../../game/data/heroes';
import { FACTIONS, RARITY, ROLES } from '../../game/data/factions';
import { buildTree, treePoints } from '../../game/data/tree';
import { GEAR_SLOTS, SET_BY_ID, formatStat, gearScore, STAT_LABEL } from '../../game/data/gear';
import { deriveHero, MAX_STARS } from '../../game/engine/stats';
import { ascendCost, commanderLevel, expToNext, goldToNext, heroLevelCap } from '../../game/engine/progression';
import { skillText, SKILL_KIND_LABEL } from '../../game/engine/skillText';
import type { GearItem, GearSlot, StatKey } from '../../game/types';
import HeroStage from '../../art/HeroStage';
import Sheet from '../components/Sheet';
import GearCard from '../components/GearCard';
import { Bar, Pill, StarRow } from '../components/Bits';

type Tab = 'stats' | 'skills' | 'tree' | 'gear';

export default function HeroScreen() {
  const id = useGame((s) => s.activeHero);
  const heroes = useGame((s) => s.heroes);
  const gearAll = useGame((s) => s.gear);
  const stage = useGame((s) => s.stage);
  const towerBest = useGame((s) => s.tower.best);
  const res = useGame((s) => s.res);
  const go = useGame((s) => s.go);
  const levelHero = useGame((s) => s.levelHero);
  const ascend = useGame((s) => s.ascendHero);
  const autoEquip = useGame((s) => s.autoEquip);
  const [tab, setTab] = useState<Tab>('stats');

  const save = id ? heroes[id] : null;
  const def = useMemo(() => (id ? heroDef(id) : null), [id]);
  const derived = useMemo(
    () => (def && save ? deriveHero(def, save, gearAll) : null),
    [def, save, gearAll],
  );

  if (!id || !save || !def || !derived) {
    return (
      <div className="pt-10 text-center text-ink-500">
        Героиня не выбрана.
        <button type="button" onClick={() => go('heroes')} className="btn-ghost mt-3 block w-full">
          К списку
        </button>
      </div>
    );
  }

  const f = FACTIONS[def.faction];
  const r = RARITY[def.rarity];
  const cap = heroLevelCap(commanderLevel(stage, towerBest));
  const nextExp = expToNext(save.level);
  const nextGold = goldToNext(save.level);
  const asc = ascendCost(def.rarity, save.stars);
  const canLevel = save.level < cap && res.exp >= nextExp && res.gold >= nextGold;

  return (
    <div className="pb-3">
      <button type="button" onClick={() => go('heroes')} className="mb-2 text-[12px] font-semibold text-ink-500">
        ← Назад
      </button>

      {/* Карточка */}
      <div
        className="panel relative mb-3 overflow-hidden rounded-2xl"
        style={{ background: `linear-gradient(180deg, ${f.color}1f, #ffffff 42%)` }}
      >
        <div className="absolute inset-0 bg-stars opacity-50" />
        <div className="relative h-[330px]">
          <HeroStage look={def.look} framing="full" className="absolute inset-0" />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
            style={{ background: 'linear-gradient(to top, #ffffff, rgba(255,255,255,0.75) 45%, transparent)' }}
          />
          <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1">
            <span className="chip bg-white/85 text-ink-500 shadow-soft">Крутите пальцем ↔</span>
          </div>
        </div>
        <div className="relative -mt-12 flex gap-3 px-3 pb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{f.icon}</span>
              <h1 className="truncate font-display text-lg font-bold text-ink-900">{def.name}</h1>
            </div>
            <div className="text-[11px] text-ink-500">«{def.title}»</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Pill tone="gold">{r.name}</Pill>
              <span className="chip border border-ink-900/[0.08] bg-ink-900/[0.055]" style={{ color: ROLES[def.role].color }}>
                {ROLES[def.role].icon} {ROLES[def.role].name}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <StarRow stars={save.stars} size={13} />
              <span className="text-[11px] text-ink-400">{save.stars}/{MAX_STARS}</span>
            </div>
            <div className="mt-2 flex items-end justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-ink-400">Мощь</div>
                <div className="font-display text-lg font-bold text-ink-900">{formatPower(derived.power)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-ink-400">Уровень</div>
                <div className="font-display text-lg font-bold text-ink-900">
                  {save.level}
                  <span className="text-[11px] text-ink-400"> / {cap}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative border-t border-ink-900/[0.08] p-3">
          <p className="mb-2 text-[11px] italic leading-snug text-ink-500">{def.lore}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => levelHero(id, 1)}
              disabled={!canLevel}
              className="btn-primary flex-1 py-2 text-[12px] disabled:opacity-40"
            >
              Уровень +1
              <span className="ml-1 text-[10px] opacity-75">📘{nextExp} 🪙{nextGold}</span>
            </button>
            <button
              type="button"
              onClick={() => levelHero(id, 10)}
              disabled={!canLevel}
              className="btn-ghost px-3 py-2 text-[12px] disabled:opacity-40"
            >
              ×10
            </button>
          </div>
          {asc && (
            <button
              type="button"
              onClick={() => ascend(id)}
              disabled={save.shards < asc.shards || res.dust < asc.dust}
              className="btn-gold mt-2 w-full py-2 text-[12px] disabled:opacity-40"
            >
              ⭐ Возвышение до {save.stars + 1}★ · {Math.min(save.shards, asc.shards)}/{asc.shards} осколков · ✨{asc.dust}
            </button>
          )}
          <div className="mt-2">
            <Bar value={save.shards} max={asc?.shards ?? (save.shards || 1)} color={r.color} height={4} />
          </div>
        </div>
      </div>

      {/* Вкладки */}
      <div className="panel mb-3 flex rounded-xl p-1">
        {(
          [
            ['stats', 'Статы'],
            ['skills', 'Навыки'],
            ['tree', 'Дерево'],
            ['gear', 'Экип'],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-1.5 font-display text-[12px] font-semibold uppercase tracking-wider ${
              tab === t ? 'bg-ink-900/[0.07] text-ink-900' : 'text-ink-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'stats' && <StatsTab derived={derived} />}
      {tab === 'skills' && <SkillsTab heroId={id} />}
      {tab === 'tree' && <TreeTab heroId={id} />}
      {tab === 'gear' && <GearTab heroId={id} onAuto={() => autoEquip(id)} />}
    </div>
  );
}

const STAT_ORDER: StatKey[] = ['hp', 'atk', 'def', 'spd', 'crit', 'critDmg', 'haste', 'lifesteal'];
const PCT_STATS: StatKey[] = ['crit', 'critDmg', 'haste', 'lifesteal'];

function StatsTab({ derived }: { derived: ReturnType<typeof deriveHero> }) {
  return (
    <div className="space-y-1.5">
      {STAT_ORDER.map((k) => (
        <div key={k} className="stat-row">
          <span className="text-ink-500">{STAT_LABEL[k]}</span>
          <span className="font-display font-bold text-ink-900">
            {PCT_STATS.includes(k) ? `${derived.stats[k]}%` : Math.round(derived.stats[k])}
          </span>
        </div>
      ))}
      {(['dmgDealt', 'dmgTaken', 'healPower'] as const).map((k) =>
        derived.mods[k] !== 0 ? (
          <div key={k} className="stat-row">
            <span className="text-ink-500">
              {k === 'dmgDealt' ? 'Наносимый урон' : k === 'dmgTaken' ? 'Получаемый урон' : 'Сила лечения'}
            </span>
            <span className="font-display font-bold text-neon-lime">
              {derived.mods[k] > 0 ? '+' : ''}
              {derived.mods[k]}%
            </span>
          </div>
        ) : null,
      )}
      {derived.sets.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {derived.sets.map((s) => {
            const set = SET_BY_ID[s.setId];
            if (!set) return null;
            return (
              <div key={s.setId} className="rounded-xl border border-ink-900/[0.08] p-2" style={{ background: `${set.color}12` }}>
                <div className="flex items-center justify-between">
                  <span className="font-display text-[12px] font-bold" style={{ color: set.color }}>
                    {set.name}
                  </span>
                  <span className="text-[11px] text-ink-500">{s.count}/6</span>
                </div>
                <div className={`text-[11px] ${s.count >= 2 ? 'text-ink-600' : 'text-ink-300'}`}>2: {set.bonus2.text}</div>
                <div className={`text-[11px] ${s.count >= 4 ? 'text-ink-600' : 'text-ink-300'}`}>4: {set.bonus4.text}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SkillsTab({ heroId }: { heroId: string }) {
  const heroes = useGame((s) => s.heroes);
  const gear = useGame((s) => s.gear);
  const def = heroDef(heroId);
  const save = heroes[heroId];
  const d = deriveHero(def, save, gear);
  return (
    <div className="space-y-2">
      {def.skills.map((sk, i) => (
        <div key={sk.id} className="panel rounded-xl p-3">
          <div className="flex items-start gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-neon-violet/35 to-neon-pink/15 text-lg">
              {sk.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-display text-[13px] font-bold text-ink-900">{sk.name}</span>
                <span className="chip border border-ink-900/[0.08] bg-ink-900/[0.055] text-ink-500">
                  {SKILL_KIND_LABEL[sk.kind]}
                </span>
                <span className="ml-auto font-display text-[11px] font-bold text-neon-gold">
                  ур. {d.skillLevels[i]}
                </span>
              </div>
              <p className="mt-1 text-[12px] leading-snug text-ink-600">{skillText(sk, d.skillLevels[i])}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TreeTab({ heroId }: { heroId: string }) {
  const heroes = useGame((s) => s.heroes);
  const learn = useGame((s) => s.learnNode);
  const reset = useGame((s) => s.resetTree);
  const save = heroes[heroId];
  const def = heroDef(heroId);
  const nodes = useMemo(() => buildTree(def.role), [def.role]);
  const spent = Object.values(save.tree).reduce((a, b) => a + b, 0);
  const total = treePoints(save.level, save.stars);
  const avail = total - spent;
  const tiers = Array.from(new Set(nodes.map((n) => n.tier))).sort((a, b) => a - b);

  return (
    <div>
      <div className="panel mb-3 flex items-center justify-between rounded-xl px-3 py-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-400">Очки навыков</div>
          <div className="font-display text-lg font-bold text-neon-cyan">
            {avail} <span className="text-[11px] text-ink-400">/ {total}</span>
          </div>
        </div>
        <button type="button" onClick={() => reset(heroId)} className="btn-ghost px-3 py-1.5 text-[11px]">
          ♻️ Сброс · ✨{spent * 30}
        </button>
      </div>

      <div className="space-y-2">
        {tiers.map((tier) => (
          <div key={tier} className="relative">
            <div className="mb-1 px-1 text-[10px] uppercase tracking-widest text-ink-300">Ярус {tier}</div>
            <div className="grid grid-cols-3 gap-2">
              {nodes
                .filter((n) => n.tier === tier)
                .map((n) => {
                  const rank = save.tree[n.id] ?? 0;
                  const locked = Boolean(n.requires && (save.tree[n.requires] ?? 0) === 0);
                  const maxed = rank >= n.maxRank;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => learn(heroId, n.id)}
                      disabled={locked || maxed || avail <= 0}
                      className="relative rounded-xl border p-2 text-left transition-transform active:scale-95 disabled:opacity-45"
                      style={{
                        background: rank > 0 ? 'linear-gradient(150deg, rgba(123,70,224,0.2), #ffffff 70%)' : 'rgba(27,21,51,0.045)',
                        borderColor: maxed ? '#ffc857' : rank > 0 ? 'rgba(160,107,255,0.6)' : 'rgba(255,255,255,0.1)',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base">{n.icon}</span>
                        <span className="font-display text-[10px] font-bold text-ink-600">
                          {rank}/{n.maxRank}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate font-display text-[11px] font-semibold text-ink-900">{n.name}</div>
                      <div className="text-[10px] leading-tight text-ink-500">{n.text(rank)}</div>
                      {locked && <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-ink-900/35 text-sm">🔒</div>}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GearTab({ heroId, onAuto }: { heroId: string; onAuto: () => void }) {
  const heroes = useGame((s) => s.heroes);
  const gear = useGame((s) => s.gear);
  const unequip = useGame((s) => s.unequip);
  const equip = useGame((s) => s.equip);
  const [slot, setSlot] = useState<GearSlot | null>(null);
  const save = heroes[heroId];

  const candidates = useMemo(
    () =>
      slot
        ? Object.values(gear)
            .filter((g) => g.slot === slot)
            .sort((a, b) => gearScore(b) - gearScore(a))
        : [],
    [gear, slot],
  );

  return (
    <div>
      <button type="button" onClick={onAuto} className="btn-primary mb-3 w-full py-2 text-[12px]">
        ⚙️ Авто-экипировка лучшим
      </button>
      <div className="grid grid-cols-2 gap-2">
        {GEAR_SLOTS.map((s) => {
          const uid = save.gear[s.id];
          const item: GearItem | null = uid ? gear[uid] ?? null : null;
          return (
            <div key={s.id}>
              {item ? (
                <GearCard item={item} compactMode onClick={() => setSlot(s.id)} />
              ) : (
                <button
                  type="button"
                  onClick={() => setSlot(s.id)}
                  className="flex h-[62px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink-900/10 text-ink-300"
                >
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-[11px]">{s.name}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      <Sheet open={slot !== null} onClose={() => setSlot(null)} title={slot ? `Выбор: ${slot}` : ''}>
        <div className="space-y-2 pb-3">
          {save.gear[slot as GearSlot] && (
            <button
              type="button"
              onClick={() => {
                unequip(heroId, slot as GearSlot);
                setSlot(null);
              }}
              className="btn-ghost w-full py-2 text-[12px]"
            >
              Снять текущий предмет
            </button>
          )}
          {candidates.length === 0 && <p className="py-6 text-center text-sm text-ink-400">Нет предметов в этот слот</p>}
          {candidates.map((g) => (
            <div key={g.uid} className="relative">
              <GearCard
                item={g}
                selected={g.equippedBy === heroId}
                onClick={() => {
                  equip(heroId, g.uid);
                  setSlot(null);
                }}
              />
              {g.equippedBy && g.equippedBy !== heroId && (
                <div className="absolute right-2 top-2 text-[9px] text-amber-200">
                  на {heroDef(g.equippedBy).name}
                </div>
              )}
            </div>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

export { formatStat };
