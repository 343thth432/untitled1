import { useMemo, useState } from 'react';
import { useGame, formatPower, teamPowerOf } from '../../game/state/store';
import { heroDef, HEROES } from '../../game/data/heroes';
import { FACTIONS, RARITY, ROLES } from '../../game/data/factions';
import { GEAR_SLOTS, SET_BY_ID, formatStat, gearScore, gearUpgradeCost } from '../../game/data/gear';
import { deriveHero } from '../../game/engine/stats';
import type { Faction, GearItem, GearSlot } from '../../game/types';
import Avatar from '../components/Avatar';
import GearCard from '../components/GearCard';
import Sheet from '../components/Sheet';
import { Bar, Empty, Pill, Section, StarRow } from '../components/Bits';

type Tab = 'team' | 'roster' | 'gear';

export default function HeroesScreen() {
  const [tab, setTab] = useState<Tab>('team');
  return (
    <div className="pb-2">
      <div className="panel mb-3 flex rounded-xl p-1">
        {(
          [
            ['team', 'Отряд'],
            ['roster', 'Героини'],
            ['gear', 'Снаряжение'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-lg py-2 font-display text-[12px] font-semibold uppercase tracking-wider transition-colors ${
              tab === id ? 'bg-ink-900/[0.07] text-ink-900' : 'text-ink-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'team' && <TeamTab />}
      {tab === 'roster' && <RosterTab />}
      {tab === 'gear' && <GearTab />}
    </div>
  );
}

// ── Отряд ────────────────────────────────────────────────────
function TeamTab() {
  const team = useGame((s) => s.team);
  const heroes = useGame((s) => s.heroes);
  const gear = useGame((s) => s.gear);
  const setSlot = useGame((s) => s.setTeamSlot);
  const auto = useGame((s) => s.autoTeam);
  const power = useGame(teamPowerOf);
  const [slot, setSlotSel] = useState<number | null>(null);

  const bench = useMemo(
    () =>
      Object.values(heroes)
        .map((h) => ({ h, d: deriveHero(heroDef(h.id), h, gear) }))
        .sort((a, b) => b.d.power - a.d.power),
    [heroes, gear],
  );

  const place = (id: string) => {
    const at = team.indexOf(id);
    if (at >= 0) {
      setSlot(at, null);
      return;
    }
    const target = slot ?? team.indexOf(null);
    if (target === -1) {
      useGame.getState().toast('Отряд полон — выберите слот', 'info', '👥');
      return;
    }
    setSlot(target, id);
    setSlotSel(null);
  };

  return (
    <>
      <Section
        title="Построение"
        right={
          <button type="button" onClick={auto} className="text-[11px] font-semibold text-neon-cyan">
            Авто-отряд
          </button>
        }
      >
        <div className="panel rounded-2xl p-3">
          <div className="mb-2 flex items-center justify-between text-[11px] text-ink-500">
            <span>Слева — первая линия, справа — тыл</span>
            <span className="font-display font-bold text-ink-700">{formatPower(power)}</span>
          </div>
          <div className="flex gap-1.5">
            {team.map((id, i) => (
              <div key={i} className="flex-1">
                {id && heroes[id] ? (
                  <Avatar
                    heroId={id}
                    fluid
                    stars={heroes[id].stars}
                    level={heroes[id].level}
                    selected={slot === i}
                    onClick={() => setSlotSel(slot === i ? null : i)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setSlotSel(slot === i ? null : i)}
                    className={`flex aspect-[1/1.18] w-full items-center justify-center rounded-2xl border border-dashed text-2xl ${
                      slot === i ? 'border-neon-violet text-neon-violet' : 'border-ink-900/10 text-ink-300'
                    }`}
                  >
                    +
                  </button>
                )}
                <div className="mt-1 text-center text-[9px] uppercase tracking-wider text-ink-300">
                  {i === 0 ? 'фронт' : i === 4 ? 'тыл' : i + 1}
                </div>
              </div>
            ))}
          </div>
          {slot !== null && (
            <p className="mt-2 rounded-lg bg-neon-violet/15 px-2 py-1.5 text-center text-[11px] text-ink-600">
              Выбран слот {slot + 1}. Нажмите на героиню ниже, чтобы поставить её сюда.
            </p>
          )}
        </div>
      </Section>

      <Section title={`Доступно (${bench.length})`}>
        <div className="grid grid-cols-4 gap-2">
          {bench.map(({ h, d }) => (
            <div key={h.id} className="relative">
              <Avatar
                heroId={h.id}
                fluid
                stars={h.stars}
                level={h.level}
                selected={team.includes(h.id)}
                onClick={() => place(h.id)}
              />
              <div className="mt-0.5 text-center text-[9px] text-ink-400">{formatPower(d.power)}</div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

// ── Героини ──────────────────────────────────────────────────
function RosterTab() {
  const heroes = useGame((s) => s.heroes);
  const gear = useGame((s) => s.gear);
  const open = useGame((s) => s.openHero);
  const [faction, setFaction] = useState<Faction | 'all'>('all');

  const list = useMemo(() => {
    return Object.values(heroes)
      .map((h) => ({ h, def: heroDef(h.id), d: deriveHero(heroDef(h.id), h, gear) }))
      .filter((x) => faction === 'all' || x.def.faction === faction)
      .sort((a, b) => b.d.power - a.d.power);
  }, [heroes, gear, faction]);

  const missing = HEROES.filter((h) => !heroes[h.id]);

  return (
    <>
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        <FilterBtn active={faction === 'all'} onClick={() => setFaction('all')}>
          Все
        </FilterBtn>
        {(Object.keys(FACTIONS) as Faction[]).map((f) => (
          <FilterBtn key={f} active={faction === f} onClick={() => setFaction(f)} color={FACTIONS[f].color}>
            {FACTIONS[f].icon} {FACTIONS[f].name}
          </FilterBtn>
        ))}
      </div>

      {list.length === 0 ? (
        <Empty icon="🫥" text="Здесь пока пусто — призовите героинь" />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {list.map(({ h, def, d }) => (
            <div key={h.id} className="panel overflow-hidden rounded-2xl p-1.5">
              <Avatar heroId={h.id} fluid stars={h.stars} level={h.level} onClick={() => open(h.id)} />
              <div className="mt-1 px-0.5">
                <div className="truncate text-[10px] text-ink-500">{def.title}</div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: ROLES[def.role].color }}>
                    {ROLES[def.role].icon}
                  </span>
                  <span className="font-display text-[11px] font-bold text-ink-700">{formatPower(d.power)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {missing.length > 0 && (
        <Section title={`Не открыто (${missing.length})`}>
          <div className="grid grid-cols-5 gap-1.5">
            {missing.map((m) => (
              <div key={m.id} className="relative opacity-45">
                <Avatar heroId={m.id} fluid dim />
                <div className="absolute inset-0 flex items-center justify-center text-lg">🔒</div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

function FilterBtn({
  children,
  active,
  onClick,
  color,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
        active ? 'bg-ink-900/[0.09] text-ink-900' : 'bg-ink-900/[0.05] text-ink-500'
      }`}
      style={active && color ? { boxShadow: `inset 0 0 0 1px ${color}88` } : undefined}
    >
      {children}
    </button>
  );
}

// ── Снаряжение ───────────────────────────────────────────────
function GearTab() {
  const gear = useGame((s) => s.gear);
  const heroes = useGame((s) => s.heroes);
  const filter = useGame((s) => s.gearFilter);
  const setFilter = useGame((s) => s.setGearFilter);
  const dismantle = useGame((s) => s.dismantle);
  const [active, setActive] = useState<GearItem | null>(null);

  const list = useMemo(
    () =>
      Object.values(gear)
        .filter((g) => filter === 'all' || g.slot === filter)
        .sort((a, b) => gearScore(b) - gearScore(a)),
    [gear, filter],
  );

  const junk = Object.values(gear).filter((g) => !g.locked && !g.equippedBy && g.rarity === 'rare' && g.level === 0);

  return (
    <>
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>
          Всё ({Object.keys(gear).length})
        </FilterBtn>
        {GEAR_SLOTS.map((s) => (
          <FilterBtn key={s.id} active={filter === s.id} onClick={() => setFilter(s.id)}>
            {s.icon} {s.name}
          </FilterBtn>
        ))}
      </div>

      {junk.length > 0 && (
        <button
          type="button"
          onClick={() => dismantle(junk.map((j) => j.uid))}
          className="btn-ghost mb-3 w-full py-2 text-[12px]"
        >
          ♻️ Разобрать редкое без заточки ({junk.length})
        </button>
      )}

      {list.length === 0 ? (
        <Empty icon="🎒" text="Снаряжение падает в кампании и башне" />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {list.map((g) => (
            <GearCard key={g.uid} item={g} compactMode onClick={() => setActive(g)} />
          ))}
        </div>
      )}

      <GearSheet item={active} onClose={() => setActive(null)} heroesIds={Object.keys(heroes)} />
    </>
  );
}

export function GearSheet({
  item,
  onClose,
  heroesIds,
}: {
  item: GearItem | null;
  onClose: () => void;
  heroesIds: string[];
}) {
  const gear = useGame((s) => s.gear);
  const equip = useGame((s) => s.equip);
  const upgrade = useGame((s) => s.upgradeGearItem);
  const dismantle = useGame((s) => s.dismantle);
  const lock = useGame((s) => s.toggleLock);
  const live = item ? gear[item.uid] : null;
  if (!live) return null;
  const set = SET_BY_ID[live.setId];
  const cost = gearUpgradeCost(live);

  return (
    <Sheet open onClose={onClose} title={live.name}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Pill tone="gold">{RARITY[live.rarity].name}</Pill>
          <Pill>+{live.level} / 15</Pill>
          <Pill>{`Оценка ${gearScore(live)}`}</Pill>
        </div>

        <div className="stat-row">
          <span className="text-ink-500">Главный стат</span>
          <span className="font-display font-bold text-ink-900">
            {formatStat(live.mainStat, live.mainValue, live.mainPct)}
          </span>
        </div>
        {live.subs.map((s, i) => (
          <div key={i} className="stat-row">
            <span className="text-ink-500">Доп. стат</span>
            <span className="text-ink-700">{formatStat(s.stat, s.value, s.pct)}</span>
          </div>
        ))}

        {set && (
          <div className="rounded-xl border border-ink-900/[0.08] p-2.5" style={{ background: `${set.color}12` }}>
            <div className="font-display text-[12px] font-bold" style={{ color: set.color }}>
              Комплект «{set.name}»
            </div>
            <div className="mt-1 text-[11px] text-ink-500">2 части: {set.bonus2.text}</div>
            <div className="text-[11px] text-ink-500">4 части: {set.bonus4.text}</div>
          </div>
        )}

        <div>
          <div className="mb-1.5 font-display text-[11px] uppercase tracking-wider text-ink-500">Надеть на</div>
          <div className="grid grid-cols-5 gap-1.5">
            {heroesIds.map((id) => (
              <Avatar
                key={id}
                heroId={id}
                fluid
                selected={live.equippedBy === id}
                onClick={() => {
                  equip(id, live.uid);
                  onClose();
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 pb-2">
          <button
            type="button"
            onClick={() => upgrade(live.uid)}
            disabled={live.level >= 15}
            className="btn-gold flex-1 py-2 text-[12px] disabled:opacity-40"
          >
            Заточка · {cost} 🪙
          </button>
          <button type="button" onClick={() => lock(live.uid)} className="btn-ghost px-3 py-2 text-[12px]">
            {live.locked ? '🔓' : '🔒'}
          </button>
          <button
            type="button"
            onClick={() => {
              dismantle([live.uid]);
              onClose();
            }}
            disabled={live.locked}
            className="btn-ghost px-3 py-2 text-[12px] disabled:opacity-40"
          >
            ♻️
          </button>
        </div>
      </div>
    </Sheet>
  );
}

export function SlotStrip({ heroId }: { heroId: string }) {
  const heroes = useGame((s) => s.heroes);
  const gear = useGame((s) => s.gear);
  const h = heroes[heroId];
  if (!h) return null;
  return (
    <div className="grid grid-cols-6 gap-1">
      {GEAR_SLOTS.map((s) => {
        const uid = h.gear[s.id as GearSlot];
        const item = uid ? gear[uid] : null;
        const color = item ? RARITY[item.rarity].color : 'rgba(255,255,255,0.12)';
        return (
          <div
            key={s.id}
            className="flex aspect-square items-center justify-center rounded-lg text-sm"
            style={{ background: `${color}22`, border: `1px solid ${color}` }}
          >
            {item ? s.icon : <span className="opacity-25">{s.icon}</span>}
          </div>
        );
      })}
    </div>
  );
}

export function TeamPowerBar() {
  const power = useGame(teamPowerOf);
  return <Bar value={power} max={power || 1} color="#a06bff" />;
}

export { StarRow };
