import { useCallback, useMemo, useRef } from 'react';
import Crawl, { type CrawlApi, type CrawlState } from '../../dungeon/Crawl';
import { buildFloor, CELL, type Cell } from '../../dungeon/map';
import { ORDER, WEAPONS } from '../../dungeon/weapon';
import { HERO_BY_ID } from '../../game/data/heroes';
import { ELEMENTS } from '../../game/data/elements';
import { currentLeg, foeScale, useGame } from '../../game/state/store';
import type { FloorId } from '../../game/types';

const STONE: Record<FloorId, Cell> = {
  crypt: CELL.brick,
  catacomb: CELL.rock,
  sanctum: CELL.moss,
};

export default function CrawlScreen() {
  const run = useGame((s) => s.run);
  const live = useGame((s) => s.live);
  const sync = useGame((s) => s.sync);
  const goDown = useGame((s) => s.descend);
  const die = useGame((s) => s.die);
  const abandon = useGame((s) => s.abandon);

  const leg = run ? currentLeg(run) : null;
  const floor = useMemo(() => (leg ? buildFloor(leg.seed, STONE[leg.tier], leg.plan) : null), [leg]);
  const start = useMemo(
    () =>
      run
        ? { hp: run.hp, maxHp: run.maxHp, ammo: run.ammo, weapon: run.weapon, guns: run.guns }
        : null,
    [run],
  );

  const apiRef = useRef<CrawlApi | null>(null);
  const onState = useCallback((s: CrawlState) => sync(s), [sync]);
  const onDescend = useCallback((s: CrawlState) => goDown(s), [goDown]);
  const onDeath = useCallback(() => die(), [die]);

  if (!run || !leg || !floor || !start) return null;

  const hero = HERO_BY_ID[run.heroId];
  const el = ELEMENTS[hero.element];
  const hp = live?.hp ?? run.hp;
  const maxHp = live?.maxHp ?? run.maxHp;
  const ammo = live?.ammo ?? run.ammo;
  const cur = live?.weapon ?? run.weapon;
  const gun = WEAPONS[cur];
  const guns = live?.guns ?? run.guns;
  const shots = gun.ammo ? ammo[gun.ammo] : null;
  const left = live?.left ?? 0;
  const pct = Math.round((hp / maxHp) * 100);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-canvas">
      <Crawl
        floor={floor}
        palette={leg.tier}
        floorName={leg.name}
        scale={foeScale(run)}
        start={start}
        apiRef={apiRef}
        onState={onState}
        onDescend={onDescend}
        onDeath={onDeath}
        className="min-h-0 flex-1"
      />

      <div
        className="relative z-10 shrink-0 px-3 pb-2 pt-2"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 8px)' }}
      >
        <div className="panel flex items-center gap-3 px-3 py-2">
          <button type="button" onClick={abandon} className="text-[11px] text-ink-500 underline-offset-2 hover:underline">
            выйти
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="truncate font-display text-[13px] font-bold text-ink-900">{leg.name}</span>
              <span className="text-[11px] text-ink-500">тварей: {left}</span>
            </div>
            <div className="mt-1 h-[7px] overflow-hidden rounded-full bg-white/10">
              <div
                className="hp-bar h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: pct > 35 ? 'linear-gradient(90deg,#5ad19a,#2f9b6a)' : 'linear-gradient(90deg,#ff7a6a,#c9304a)',
                }}
              />
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-[13px] font-bold text-ink-900">
              {hp}<span className="text-ink-500">/{maxHp}</span>
            </div>
            <div className="text-[11px] font-semibold" style={{ color: el.color }}>
              {shots === null ? '∞' : shots} · {gun.short}
            </div>
          </div>
        </div>

        {/* выбор оружия: подобранное становится доступным */}
        <div className="mt-1.5 flex gap-1.5">
          {ORDER.filter((id) => guns.includes(id)).map((id) => {
            const d = WEAPONS[id];
            const n = d.ammo ? ammo[d.ammo] : null;
            const empty = n !== null && n < d.cost;
            return (
              <button
                key={id}
                type="button"
                onClick={() => apiRef.current?.pick(id)}
                className={`flex-1 rounded-lg border px-1.5 py-1 text-[10px] font-semibold transition-transform active:scale-95
                  ${id === cur ? 'border-white/30 bg-white/[0.09] text-ink-900' : 'border-white/10 bg-white/[0.04] text-ink-500'}
                  ${empty ? 'opacity-40' : ''}`}
              >
                <div className="truncate">{d.short}</div>
                <div className="text-[9px] opacity-70">{n === null ? '∞' : n}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
