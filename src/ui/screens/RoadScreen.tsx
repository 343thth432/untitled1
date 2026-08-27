import { useState } from 'react';
import { HERO_BY_ID } from '../../game/data/heroes';
import { FOES } from '../../game/data/foes';
import { ELEMENTS } from '../../game/data/elements';
import { RELICS } from '../../game/data/relics';
import { useGame, currentLeg, currentOptions } from '../../game/state/store';
import type { NodeKind } from '../../game/types';
import RoadStage from '../../art/RoadStage';

const NODE: Record<NodeKind, { name: string; icon: string; hint: string }> = {
  foe: { name: 'Тень', icon: '👤', hint: 'Дуэль. Награда — карта и искры.' },
  elite: { name: 'Сильная тень', icon: '👑', hint: 'Тяжелее, но даёт реликвию.' },
  boss: { name: 'Хранитель', icon: '🜏', hint: 'Порог отрезка. Обратно дороги нет.' },
  rest: { name: 'Привал', icon: '🔥', hint: 'Лечение или улучшение карты.' },
  find: { name: 'Находка', icon: '🎁', hint: 'Реликвия на дороге.' },
  trade: { name: 'Торговец', icon: '⛺', hint: 'Карты и реликвии за искры.' },
  omen: { name: 'Знамение', icon: '🗿', hint: 'Выбор с последствиями.' },
};

export default function RoadScreen() {
  const run = useGame((s) => s.run);
  const choose = useGame((s) => s.choose);
  const enter = useGame((s) => s.enterNode);
  const [walking, setWalking] = useState(false);
  if (!run) return null;

  const hero = HERO_BY_ID[run.heroId];
  const leg = currentLeg(run);
  const opts = currentOptions(run);
  const kinds = opts.map((o) => o.kind);
  const counts = opts.map((o) => (o.foe ? (FOES[o.foe]?.count ?? 1) : 1));
  const el = ELEMENTS[hero.element];
  const hpPct = Math.round((run.hp / run.maxHp) * 100);

  return (
    <div className="relative h-full overflow-hidden bg-canvas">
      <RoadStage
        biome={leg.biome}
        look={hero.look}
        companion={HERO_BY_ID[run.companion]?.look}
        markers={kinds}
        counts={counts}
        picked={run.picked}
        walking={walking}
        onArrive={enter}
        className="absolute inset-0"
      />

      {/* верх: состояние путницы */}
      <div className="absolute inset-x-0 top-0 z-10 px-3" style={{ paddingTop: 'calc(var(--safe-top) + 10px)' }}>
        <div className="panel flex items-center gap-3 px-3 py-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="truncate font-display text-[14px] font-bold text-ink-900">{hero.name}</span>
              <span className="text-[11px] text-ink-500">{leg.name}</span>
            </div>
            <div className="mt-1 h-[7px] overflow-hidden rounded-full bg-ink-900/10">
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
            <span key={id} title={RELICS[id]?.text} className="grid h-7 w-7 place-items-center rounded-full bg-white/80 text-[14px] shadow-soft">
              {RELICS[id]?.icon ?? '•'}
            </span>
          ))}
          <span className="ml-auto text-[11px] text-ink-500">
            шаг {run.step + 1} / {leg.steps.length}
          </span>
        </div>
      </div>

      {/* низ: что впереди */}
      {!walking && (
        <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-3" style={{ paddingBottom: 'calc(var(--safe-bottom) + 12px)' }}>
          <div className="flex gap-2">
            {opts.map((o, i) => {
              const n = NODE[o.kind];
              const foe = o.foe ? FOES[o.foe] : null;
              const on = run.picked === i;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => choose(i)}
                  className={`panel flex-1 px-3 py-2.5 text-left transition-transform active:scale-[0.98] ${on ? 'ring-2 ring-violet-400' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[18px]">{n.icon}</span>
                    <span className="font-display text-[13px] font-bold text-ink-900">
                      {foe ? foe.name : n.name}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] leading-snug text-ink-600">
                    {foe ? foe.title : n.hint}
                  </div>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="btn-primary mt-2 w-full py-3 text-[15px]"
            onClick={() => setWalking(true)}
          >
            Идти дальше
          </button>
        </div>
      )}
    </div>
  );
}
