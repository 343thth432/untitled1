import { useMemo, useRef } from 'react';
import { HERO_BY_ID } from '../../game/data/heroes';
import { FOES } from '../../game/data/foes';
import { ELEMENTS } from '../../game/data/elements';
import { RELICS } from '../../game/data/relics';
import { useGame, currentLeg } from '../../game/state/store';
import type { FloorId, NodeKind } from '../../game/types';
import DungeonView from '../../dungeon/DungeonView';
import { buildFloor, CELL, type Cell, type Mark, type MarkKind } from '../../dungeon/map';

const STONE: Record<FloorId, Cell> = {
  crypt: CELL.brick,
  catacomb: CELL.rock,
  sanctum: CELL.moss,
};

const KIND: Record<NodeKind, MarkKind> = {
  foe: 'foe',
  elite: 'elite',
  boss: 'boss',
  rest: 'rest',
  find: 'find',
  trade: 'trade',
  omen: 'omen',
};

export default function DungeonScreen() {
  const run = useGame((s) => s.run);
  const enter = useGame((s) => s.enterNode);
  const enterRef = useRef(enter);
  enterRef.current = enter;

  const leg = run ? currentLeg(run) : null;
  const doneKey = run ? run.done.join(',') : '';

  // карта строится из зерна отрезка, поэтому одна и та же при возврате
  const floor = useMemo(() => {
    if (!run || !leg) return null;
    const f = buildFloor(
      leg.seed,
      STONE[leg.tier],
      leg.nodes.map((n) => KIND[n.kind]),
    );
    f.marks.forEach((m, i) => {
      const node = leg.nodes[i];
      if (!node) return;
      m.count = node.foe ? (FOES[node.foe]?.count ?? 1) : 1;
      m.taken = run.done.includes(node.id);
    });
    return f;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leg?.seed, doneKey]);

  if (!run || !leg || !floor) return null;

  const hero = HERO_BY_ID[run.heroId];
  const el = ELEMENTS[hero.element];
  const hpPct = Math.round((run.hp / run.maxHp) * 100);
  const left = leg.nodes.filter((n) => !run.done.includes(n.id)).length;

  const onEnter = (m: Mark): void => {
    const i = floor.marks.indexOf(m);
    const node = leg.nodes[i];
    if (node) enterRef.current(node.id);
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-canvas">
      <DungeonView
        floor={floor}
        palette={leg.tier}
        onEnter={onEnter}
        className="min-h-0 flex-1"
      />

      <div className="relative z-10 shrink-0 px-3 pb-2 pt-2" style={{ paddingBottom: 'calc(var(--safe-bottom) + 8px)' }}>
        <div className="panel flex items-center gap-3 px-3 py-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="truncate font-display text-[14px] font-bold text-ink-900">{hero.name}</span>
              <span className="text-[11px] text-ink-500">{leg.name}</span>
            </div>
            <div className="mt-1 h-[7px] overflow-hidden rounded-full bg-white/10">
              <div
                className="hp-bar h-full rounded-full"
                style={{ width: `${hpPct}%`, background: 'linear-gradient(90deg,#5ad19a,#2f9b6a)' }}
              />
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-[13px] font-bold text-ink-900">
              {run.hp}<span className="text-ink-500">/{run.maxHp}</span>
            </div>
            <div className="text-[11px] font-semibold" style={{ color: el.color }}>{run.sparks} ✦</div>
          </div>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 px-1">
          {run.relics.map((id) => (
            <span key={id} title={RELICS[id]?.text} className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-[14px] shadow-soft">
              {RELICS[id]?.icon ?? '•'}
            </span>
          ))}
          <span className="ml-auto text-[11px] text-ink-500">осталось залов: {left}</span>
        </div>
      </div>
    </div>
  );
}
