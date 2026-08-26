import { useState } from 'react';
import { useGame } from '../../game/state/store';
import { HEROES } from '../../game/data/heroes';
import { RARITY, RARITY_ORDER, FACTIONS } from '../../game/data/factions';
import { PITY_LEGEND, PITY_MYTHIC, SUMMON_GEM_COST, SUMMON_RATES } from '../../game/engine/progression';
import Portrait from '../../art/Portrait';
import { Bar, Pill, Section } from '../components/Bits';
import Avatar from '../components/Avatar';

export default function SummonScreen() {
  const res = useGame((s) => s.res);
  const pity = useGame((s) => s.pity);
  const heroes = useGame((s) => s.heroes);
  const summon = useGame((s) => s.summon);
  const [useScrolls, setUseScrolls] = useState(false);

  const featured = HEROES.filter((h) => h.rarity === 'mythic');
  const cost1 = useScrolls ? 1 : SUMMON_GEM_COST;
  const cost10 = useScrolls ? 10 : SUMMON_GEM_COST * 10;
  const have = useScrolls ? res.scrolls : res.gems;

  return (
    <div className="pb-2">
      {/* Баннер */}
      <div className="panel relative mb-3 overflow-hidden rounded-2xl">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, #46165c, #1a0b2e 55%, #08050f)' }}
        />
        <div className="absolute inset-0 bg-stars opacity-60" />
        <div className="absolute inset-x-0 top-0 h-40 sheen animate-sheen opacity-40" />
        <div className="relative p-3">
          <div className="font-display text-[11px] uppercase tracking-[0.28em] text-white/50">Врата затмения</div>
          <h1 className="font-display text-xl font-bold text-white">Призыв героинь</h1>
          <div className="mt-2 flex justify-center gap-1">
            {featured.map((h, i) => (
              <div
                key={h.id}
                className="relative h-28 w-20 overflow-hidden rounded-2xl"
                style={{
                  border: `1.5px solid ${RARITY.mythic.color}`,
                  boxShadow: `0 8px 24px -10px ${FACTIONS[h.faction].glow}`,
                  transform: `translateY(${i % 2 === 0 ? 0 : 6}px)`,
                }}
              >
                <Portrait look={h.look} className="h-full w-full" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1 pb-1 pt-4 text-center">
                  <div className="truncate font-display text-[10px] font-bold text-white">{h.name}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Гарантии */}
          <div className="mt-3 space-y-1.5">
            <PityBar label="Гарант легендарной" value={pity.legend} max={PITY_LEGEND} color="#ffc857" />
            <PityBar label="Гарант мифической" value={pity.mythic} max={PITY_MYTHIC} color="#ff5ea8" />
          </div>

          {/* Переключатель валюты */}
          <div className="mt-3 flex rounded-xl bg-black/30 p-1">
            <button
              type="button"
              onClick={() => setUseScrolls(false)}
              className={`flex-1 rounded-lg py-1.5 text-[12px] font-semibold ${!useScrolls ? 'bg-white/12 text-white' : 'text-white/45'}`}
            >
              💎 {res.gems}
            </button>
            <button
              type="button"
              onClick={() => setUseScrolls(true)}
              className={`flex-1 rounded-lg py-1.5 text-[12px] font-semibold ${useScrolls ? 'bg-white/12 text-white' : 'text-white/45'}`}
            >
              📜 {res.scrolls}
            </button>
          </div>

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => summon(1, useScrolls)}
              disabled={have < cost1}
              className="btn-ghost flex-1 py-2.5 text-[12px] disabled:opacity-40"
            >
              Призыв ×1
              <span className="ml-1 opacity-70">{useScrolls ? `📜${cost1}` : `💎${cost1}`}</span>
            </button>
            <button
              type="button"
              onClick={() => summon(10, useScrolls)}
              disabled={have < cost10}
              className="btn-primary flex-[1.4] py-2.5 text-[12px] disabled:opacity-40"
            >
              Призыв ×10
              <span className="ml-1 opacity-80">{useScrolls ? `📜${cost10}` : `💎${cost10}`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Шансы */}
      <Section title="Шансы">
        <div className="panel grid grid-cols-4 gap-1.5 rounded-2xl p-2.5">
          {SUMMON_RATES.map(([r, w]) => (
            <div key={r} className="rounded-lg bg-white/[0.05] p-1.5 text-center">
              <div className="font-display text-[11px] font-bold" style={{ color: RARITY[r].color }}>
                {RARITY[r].name}
              </div>
              <div className="text-[13px] font-bold text-white/85">{(w * 100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Пул */}
      {RARITY_ORDER.slice().reverse().map((rar) => {
        const list = HEROES.filter((h) => h.rarity === rar);
        return (
          <Section
            key={rar}
            title={RARITY[rar].name}
            right={<Pill>{`${list.filter((h) => heroes[h.id]).length}/${list.length}`}</Pill>}
          >
            <div className="grid grid-cols-5 gap-1.5">
              {list.map((h) => {
                const owned = Boolean(heroes[h.id]);
                return (
                  <div key={h.id} className="relative">
                    <Avatar heroId={h.id} fluid dim={!owned} stars={owned ? heroes[h.id].stars : undefined} />
                    {!owned && <div className="absolute inset-0 flex items-center justify-center text-base">🔒</div>}
                  </div>
                );
              })}
            </div>
          </Section>
        );
      })}
    </div>
  );
}

function PityBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[10px] text-white/45">
        <span>{label}</span>
        <span>
          {Math.min(value, max)} / {max}
        </span>
      </div>
      <Bar value={value} max={max} color={color} height={4} glow />
    </div>
  );
}
