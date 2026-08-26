import { useEffect, useState } from 'react';
import { useGame } from '../../game/state/store';
import { heroDef } from '../../game/data/heroes';
import { RARITY, FACTIONS } from '../../game/data/factions';
import Portrait from '../../art/Portrait';

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
    }, 160);
    return () => window.clearInterval(id);
  }, [results]);

  if (!results) return null;
  const best = results.reduce(
    (a, r) => (RARITY[r.rarity].power > RARITY[a.rarity].power ? r : a),
    results[0],
  );
  const bestColor = RARITY[best.rarity].color;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-black/92 backdrop-blur-sm">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: `radial-gradient(80% 45% at 50% 25%, ${bestColor}44, transparent 70%)` }}
      />
      <div className="relative flex-1 overflow-y-auto px-4" style={{ paddingTop: 'calc(var(--safe-top) + 24px)' }}>
        <h2 className="mb-1 text-center font-display text-lg font-bold tracking-widest text-white">ПРИЗЫВ</h2>
        <p className="mb-4 text-center text-[11px] uppercase tracking-[0.25em] text-white/40">
          {results.length === 1 ? 'Врата открылись' : `Получено героинь: ${results.length}`}
        </p>

        <div className={`grid gap-2 ${results.length > 4 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {results.map((r, i) => {
            const def = heroDef(r.heroId);
            const rar = RARITY[r.rarity];
            const shown = i < revealed;
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  clear();
                  open(r.heroId);
                }}
                className="relative overflow-hidden rounded-2xl transition-all"
                style={{
                  border: `1.5px solid ${shown ? rar.color : 'rgba(255,255,255,0.1)'}`,
                  boxShadow: shown ? `0 0 22px -6px ${rar.color}` : undefined,
                  opacity: shown ? 1 : 0.25,
                  transform: shown ? 'scale(1)' : 'scale(0.92)',
                  background: `linear-gradient(160deg, ${FACTIONS[def.faction].color}22, #0a0714)`,
                }}
              >
                <div className="aspect-[1/1.25] w-full">
                  {shown && <Portrait look={def.look} className="h-full w-full" />}
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-transparent px-1.5 pb-1.5 pt-5">
                  <div className="truncate text-center font-display text-[11px] font-bold text-white">{def.name}</div>
                  <div className="text-center text-[9px] font-semibold" style={{ color: rar.color }}>
                    {r.isNew ? 'НОВАЯ' : `+${r.shards} осколков`}
                  </div>
                </div>
                {r.isNew && shown && (
                  <div className="absolute left-1 top-1 rounded-full bg-neon-pink px-1.5 text-[9px] font-bold text-white">
                    NEW
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="relative px-4 pb-6 pt-3" style={{ paddingBottom: 'calc(var(--safe-bottom) + 20px)' }}>
        <button type="button" onClick={clear} className="btn-primary w-full">
          Продолжить
        </button>
      </div>
    </div>
  );
}
