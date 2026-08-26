import { useEffect, useState } from 'react';
import { useGame, type SummonResult } from '../../game/state/store';
import { heroDef } from '../../game/data/heroes';
import { RARITY, FACTIONS } from '../../game/data/factions';
import { usePortrait } from '../../art/usePortrait';
import HeroStage from '../../art/HeroStage';

export default function SummonResults() {
  const results = useGame((s) => s.summonResults);
  const clear = useGame((s) => s.clearSummon);
  const open = useGame((s) => s.openHero);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    setRevealed(0);
    if (!results) return;
    const id = window.setInterval(() => {
      setRevealed((r) => {
        if (!results || r >= results.length) {
          window.clearInterval(id);
          return r;
        }
        return r + 1;
      });
    }, 170);
    return () => window.clearInterval(id);
  }, [results]);

  if (!results) return null;

  const best = results.reduce((a, r) => (RARITY[r.rarity].power > RARITY[a.rarity].power ? r : a), results[0]);
  const bestDef = heroDef(best.heroId);
  const bestColor = RARITY[best.rarity].color;
  const single = results.length === 1;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-canvas/95 backdrop-blur-sm">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(80% 45% at 50% 22%, ${bestColor}33, transparent 70%)` }}
      />
      <div className="relative flex-1 overflow-y-auto px-4" style={{ paddingTop: 'calc(var(--safe-top) + 18px)' }}>
        <h2 className="text-center font-display text-lg font-extrabold tracking-widest text-ink-900">ПРИЗЫВ</h2>
        <p className="mb-3 text-center text-[11px] uppercase tracking-[0.25em] text-ink-400">
          {single ? 'Врата открылись' : `Получено героинь: ${results.length}`}
        </p>

        {/* героиня с лучшей редкостью — живой моделью */}
        <div
          className="relative mb-3 overflow-hidden rounded-3xl border"
          style={{
            borderColor: `${bestColor}66`,
            background: `linear-gradient(170deg, ${FACTIONS[bestDef.faction].color}1f, #ffffff 65%)`,
            height: single ? 380 : 250,
          }}
        >
          <div className="absolute inset-0 bg-stars opacity-70" />
          <HeroStage look={bestDef.look} framing="full" interactive className="absolute inset-0" showcase />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/80 to-transparent px-4 pb-3 pt-8">
            <div className="font-display text-xl font-extrabold text-ink-900">{bestDef.name}</div>
            <div className="text-[12px] text-ink-500">«{bestDef.title}»</div>
            <span className="chip mt-1" style={{ color: bestColor, background: `${bestColor}1f`, border: `1px solid ${bestColor}55` }}>
              {RARITY[best.rarity].name}
            </span>
          </div>
        </div>

        {!single && (
          <div className="grid grid-cols-5 gap-2 pb-3">
            {results.map((r, i) => (
              <SummonCard
                key={i}
                r={r}
                shown={i < revealed}
                onPick={() => {
                  clear();
                  open(r.heroId);
                }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="relative px-4 pt-3" style={{ paddingBottom: 'calc(var(--safe-bottom) + 20px)' }}>
        <button type="button" onClick={clear} className="btn-primary w-full">
          Продолжить
        </button>
      </div>
    </div>
  );
}

function SummonCard({ r, shown, onPick }: { r: SummonResult; shown: boolean; onPick: () => void }) {
  const def = heroDef(r.heroId);
  const rar = RARITY[r.rarity];
  const url = usePortrait(def.look, def.id, 'half', 260);
  return (
    <button
      type="button"
      onClick={onPick}
      className="relative overflow-hidden rounded-xl transition-all"
      style={{
        border: `1.5px solid ${shown ? rar.color : 'rgba(27,21,51,0.1)'}`,
        boxShadow: shown ? `0 6px 18px -10px ${rar.color}` : undefined,
        opacity: shown ? 1 : 0.3,
        transform: shown ? 'scale(1)' : 'scale(0.9)',
        background: `linear-gradient(165deg, ${FACTIONS[def.faction].color}22, #ffffff 70%)`,
      }}
    >
      <div className="aspect-[1/1.2] w-full">
        {shown && url && <img src={url} alt={def.name} className="h-full w-full object-cover" draggable={false} />}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/85 to-transparent px-0.5 pb-0.5 pt-4">
        <div className="truncate text-center font-display text-[9px] font-bold text-ink-900">{def.name}</div>
        <div className="truncate text-center text-[8px] font-semibold" style={{ color: rar.color }}>
          {r.isNew ? 'НОВАЯ' : `+${r.shards}`}
        </div>
      </div>
      {r.isNew && shown && (
        <div className="absolute left-0.5 top-0.5 rounded-full bg-neon-pink px-1 text-[8px] font-bold text-white">NEW</div>
      )}
    </button>
  );
}
