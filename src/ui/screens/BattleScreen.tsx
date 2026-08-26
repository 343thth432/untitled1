import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useGame } from '../../game/state/store';
import { Battle, BATTLE_TIMEOUT, TICK, ULT_COST, fmt } from '../../game/engine/battle';
import type { BattleResult, Combatant, FloatKind } from '../../game/types';
import { FACTIONS, RARITY } from '../../game/data/factions';
import { HERO_BY_ID } from '../../game/data/heroes';
import Portrait from '../../art/Portrait';

interface FloatItem {
  id: number;
  uid: string;
  text: string;
  kind: FloatKind;
}

let floatId = 1;

export default function BattleScreen() {
  const setup = useGame((s) => s.battle);
  const settings = useGame((s) => s.settings);
  const setSetting = useGame((s) => s.setSetting);
  const finishBattle = useGame((s) => s.finishBattle);
  const exitBattle = useGame((s) => s.exitBattle);
  const beginCampaign = useGame((s) => s.beginCampaign);
  const beginTowerFloor = useGame((s) => s.beginTowerFloor);
  const towerDraft = useGame((s) => s.tower.pendingDraft);

  const [, force] = useReducer((x: number) => x + 1, 0);
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const [hits, setHits] = useState<Record<string, number>>({});
  const [banner, setBanner] = useState<{ uid: string; name: string } | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<BattleResult | null>(null);

  const battleRef = useRef<Battle | null>(null);
  const rafRef = useRef<number>(0);
  const accRef = useRef(0);
  const lastRef = useRef(0);
  const doneRef = useRef(false);

  const speed = settings.speed;
  const manual = settings.manual;

  // создаём бой
  if (setup && !battleRef.current) {
    const b = new Battle(setup.allies, setup.foes, setup.seed, settings.manual);
    b.start();
    battleRef.current = b;
  }

  const pushEvents = useCallback((ev: ReturnType<Battle['step']>) => {
    if (ev.floats.length) {
      const items = ev.floats.map((f) => ({ id: floatId++, uid: f.uid, text: f.text, kind: f.kind }));
      setFloats((prev) => [...prev.slice(-40), ...items]);
      window.setTimeout(() => {
        const ids = new Set(items.map((i) => i.id));
        setFloats((prev) => prev.filter((p) => !ids.has(p.id)));
      }, 900);
    }
    if (ev.hits.length) {
      const now = Date.now();
      setHits((prev) => {
        const next = { ...prev };
        for (const uid of ev.hits) next[uid] = now;
        return next;
      });
    }
    if (ev.log.length) {
      const lines = ev.log.filter((l) => l.kind !== 'info').map((l) => l.text);
      if (lines.length) setLog((prev) => [...prev, ...lines].slice(-3));
    }
    if (ev.ults.length) {
      const u = ev.ults[ev.ults.length - 1];
      setBanner(u);
      window.setTimeout(() => setBanner((b) => (b === u ? null : b)), 900);
    }
  }, []);

  // игровой цикл
  useEffect(() => {
    if (!setup) return;
    const loop = (t: number) => {
      const b = battleRef.current;
      if (!b) return;
      if (!lastRef.current) lastRef.current = t;
      const dt = Math.min(0.25, (t - lastRef.current) / 1000);
      lastRef.current = t;
      accRef.current += dt * speed;
      let steps = 0;
      while (accRef.current >= TICK && !b.finished && steps < 40) {
        accRef.current -= TICK;
        pushEvents(b.step());
        steps++;
      }
      if (b.finished && !doneRef.current) {
        doneRef.current = true;
        const r = b.result;
        if (r) {
          setResult(r);
          finishBattle(r);
        }
      }
      force();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [setup, speed, pushEvents, finishBattle]);

  useEffect(() => {
    if (battleRef.current) battleRef.current.manual = manual;
  }, [manual]);

  const skip = () => {
    const b = battleRef.current;
    if (!b) return;
    let guard = 0;
    while (!b.finished && guard < 20000) {
      b.step();
      guard++;
    }
    force();
  };

  const castUlt = (uid: string) => {
    const b = battleRef.current;
    if (!b || b.finished) return;
    pushEvents(b.castUltimateManually(uid));
  };

  const restart = (fn: () => void) => {
    battleRef.current = null;
    doneRef.current = false;
    accRef.current = 0;
    lastRef.current = 0;
    setResult(null);
    setFloats([]);
    setBanner(null);
    exitBattle();
    window.setTimeout(fn, 20);
  };

  const b = battleRef.current;
  const allies = useMemo(() => (b ? b.units.filter((u) => u.side === 'ally') : []), [b, result, floats.length]);
  const foes = useMemo(() => (b ? b.units.filter((u) => u.side === 'foe') : []), [b, result, floats.length]);

  if (!setup || !b) return null;

  const timeLeft = Math.max(0, BATTLE_TIMEOUT - b.time);

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col overflow-hidden"
      style={{ background: `radial-gradient(130% 70% at 50% 0%, ${setup.bg[0]}, ${setup.bg[1]} 70%, #03020a)` }}
    >
      <div className="pointer-events-none absolute inset-0 bg-stars opacity-70" />

      {/* Верхняя панель */}
      <div className="relative z-10 flex items-center gap-2 px-3 pb-1" style={{ paddingTop: 'calc(var(--safe-top) + 8px)' }}>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[13px] font-bold text-white">{setup.title}</div>
          <div className="truncate text-[10px] text-white/45">{setup.subtitle}</div>
        </div>
        <div className="rounded-lg bg-black/40 px-2 py-1 font-display text-[12px] font-bold text-white/80">
          {timeLeft.toFixed(0)}с
        </div>
        <button
          type="button"
          onClick={() => setSetting('speed', (speed === 1 ? 2 : speed === 2 ? 4 : 1) as 1 | 2 | 4)}
          className="rounded-lg bg-white/10 px-2 py-1 font-display text-[12px] font-bold text-white"
        >
          ×{speed}
        </button>
        <button
          type="button"
          onClick={() => setSetting('manual', !manual)}
          className={`rounded-lg px-2 py-1 font-display text-[11px] font-bold ${
            manual ? 'bg-white/10 text-white/70' : 'bg-neon-violet/40 text-white'
          }`}
        >
          {manual ? 'РУЧН' : 'АВТО'}
        </button>
        <button type="button" onClick={skip} className="rounded-lg bg-white/10 px-2 py-1 font-display text-[11px] font-bold text-white/70">
          ⏭
        </button>
      </div>

      {/* Поле боя */}
      <div className="relative z-10 flex flex-1 flex-col justify-between px-2 pb-4 pt-1">
        <Side units={foes} floats={floats} hits={hits} foe />

        <div className="pointer-events-none relative flex-1">
          <div className="absolute inset-x-8 top-1/2 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="absolute inset-x-0 top-0 flex h-full flex-col items-center justify-center gap-0.5">
            {banner ? (
              <span className="animate-slideUp rounded-full bg-black/75 px-3.5 py-1.5 font-display text-[14px] font-bold tracking-wider text-neon-gold shadow-glow-sm">
                {banner.name}
              </span>
            ) : (
              <>
                <div className="relative mb-1 h-14 w-14 opacity-45">
                  <div
                    className="absolute inset-0 animate-spinSlow rounded-full border border-dashed"
                    style={{ borderColor: setup.accent }}
                  />
                  <div className="absolute inset-2 rounded-full" style={{ background: `radial-gradient(circle, ${setup.accent}33, transparent 70%)` }} />
                  <div
                    className="absolute inset-0 flex items-center justify-center font-display text-[12px] font-bold"
                    style={{ color: setup.accent }}
                  >
                    VS
                  </div>
                </div>
                {log.map((l, i) => (
                  <span
                    key={`${l}-${i}`}
                    className="font-display text-[11px] tracking-wide text-white/45"
                    style={{ opacity: 0.4 + i * 0.25 }}
                  >
                    {l}
                  </span>
                ))}
              </>
            )}
          </div>
        </div>

        <Side units={allies} floats={floats} hits={hits} />
      </div>

      {/* Панель ультимейтов */}
      <div className="relative z-10 px-3 pb-2" style={{ paddingBottom: 'calc(var(--safe-bottom) + 10px)' }}>
        {manual && allies.some((u) => u.holdingUlt) && (
          <div className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-neon-gold/80">
            Ультимейт готов — нажмите портрет
          </div>
        )}
        <div className="panel flex items-center justify-between gap-1.5 rounded-2xl p-2">
          {allies.map((u) => (
            <UltButton key={u.uid} unit={u} onCast={() => castUlt(u.uid)} manual={manual} />
          ))}
        </div>
      </div>

      {/* Итог */}
      {result && (
        <ResultOverlay
          result={result}
          mode={setup.mode}
          allies={allies}
          hasDraft={Boolean(towerDraft)}
          onExit={() => {
            battleRef.current = null;
            doneRef.current = false;
            exitBattle();
          }}
          onNext={() => restart(setup.mode === 'tower' ? beginTowerFloor : beginCampaign)}
          onRetry={() => restart(setup.mode === 'campaign' ? beginCampaign : () => undefined)}
        />
      )}
    </div>
  );
}

// ── Сторона поля ─────────────────────────────────────────────
function Side({
  units,
  floats,
  hits,
  foe,
}: {
  units: Combatant[];
  floats: FloatItem[];
  hits: Record<string, number>;
  foe?: boolean;
}) {
  const front = units.filter((u) => u.slot <= 1);
  const back = units.filter((u) => u.slot >= 2);
  const rows = foe ? [back, front] : [front, back];
  return (
    <div className="relative flex flex-col gap-2">
      <div
        className="pointer-events-none absolute inset-x-4 bottom-[-10px] h-12 rounded-[50%]"
        style={{
          background: foe
            ? 'radial-gradient(closest-side, rgba(255,94,120,0.22), transparent 75%)'
            : 'radial-gradient(closest-side, rgba(125,255,200,0.20), transparent 75%)',
          boxShadow: foe ? 'inset 0 0 24px rgba(255,94,120,0.18)' : 'inset 0 0 24px rgba(125,255,200,0.16)',
        }}
      />
      {rows.map((row, i) => (
        <div key={i} className={`relative flex justify-center gap-2 ${i === (foe ? 0 : 1) ? 'opacity-95' : ''}`}>
          {row.map((u) => (
            <UnitCard key={u.uid} unit={u} floats={floats.filter((f) => f.uid === u.uid)} hit={hits[u.uid]} foe={foe} />
          ))}
        </div>
      ))}
    </div>
  );
}

function UnitCard({
  unit,
  floats,
  hit,
  foe,
}: {
  unit: Combatant;
  floats: FloatItem[];
  hit?: number;
  foe?: boolean;
}) {
  const def = HERO_BY_ID[unit.defId];
  const f = FACTIONS[unit.faction];
  const r = RARITY[unit.rarity];
  const shaking = hit !== undefined && Date.now() - hit < 220;
  const hpPct = (unit.hp / unit.maxHp) * 100;
  const shield = unit.statuses.filter((s) => s.kind === 'shield').reduce((a, s) => a + (s.value ?? 0), 0);
  const casting = unit.castTimer > 0;
  const ready = unit.energy >= ULT_COST && unit.alive;

  return (
    <div
      className={`relative ${shaking ? 'animate-shake' : ''}`}
      style={{ width: 96, transform: casting ? 'scale(1.12)' : undefined, transition: 'transform 0.15s', zIndex: casting ? 20 : undefined }}
    >
      {ready && (
        <span
          className="pointer-events-none absolute inset-0 rounded-2xl border-2"
          style={{ borderColor: '#ffd166', animation: 'pulseRing 1.4s ease-out infinite' }}
        />
      )}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          border: `1.5px solid ${unit.alive ? `${r.color}bb` : 'rgba(255,255,255,0.12)'}`,
          background: `linear-gradient(160deg, ${f.color}22, #0a0715 70%)`,
          boxShadow: casting ? `0 0 22px -2px ${f.color}` : `0 4px 14px -8px ${f.glow}`,
        }}
      >
        <div className="aspect-[1/1.1] w-full">
          {def && <Portrait look={def.look} dim={!unit.alive} fierce={Boolean(foe)} flip={Boolean(foe)} className="h-full w-full" />}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-transparent px-0.5 pb-0.5 pt-3">
          <div className="truncate text-center text-[10px] font-semibold leading-tight text-white/90">{unit.name}</div>
          <div className="mt-0.5 h-[4px] w-full overflow-hidden rounded-full bg-black/60">
            <div
              className="hp-bar h-full rounded-full"
              style={{
                width: `${Math.max(0, hpPct)}%`,
                background: foe ? 'linear-gradient(90deg,#ff7b7b,#ff3d5f)' : 'linear-gradient(90deg,#7dff9c,#2fd07a)',
              }}
            />
          </div>
          <div className="mt-[2px] h-[3px] w-full overflow-hidden rounded-full bg-black/60">
            <div
              className="energy-bar h-full rounded-full"
              style={{ width: `${(unit.energy / ULT_COST) * 100}%`, background: '#4fe3ff' }}
            />
          </div>
        </div>
        {shield > 0 && (
          <div className="absolute left-0.5 top-0.5 rounded bg-cyan-400/25 px-1 text-[7px] font-bold text-cyan-100">
            🛡{fmt(shield)}
          </div>
        )}
        {!unit.alive && <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-lg">☠️</div>}
      </div>

      {/* Статусы */}
      <div className="absolute -bottom-3 left-0 right-0 flex flex-wrap justify-center gap-[1px]">
        {unit.statuses
          .filter((s) => s.kind !== 'shield')
          .slice(0, 4)
          .map((s, i) => (
            <span
              key={i}
              className="rounded px-[2px] text-[7px] font-bold"
              style={{
                background:
                  s.kind === 'buff' ? 'rgba(125,255,156,0.22)' : s.kind === 'stun' ? 'rgba(255,209,102,0.25)' : 'rgba(255,110,150,0.22)',
                color: s.kind === 'buff' ? '#b6ffcc' : s.kind === 'stun' ? '#ffe3a3' : '#ffc2d4',
              }}
            >
              {s.label.slice(0, 6)}
            </span>
          ))}
      </div>

      {/* Всплывающие числа */}
      <div className="pointer-events-none absolute inset-x-0 -top-7 z-30 flex flex-col items-center">
        {floats.map((fl) => (
          <span
            key={fl.id}
            className="animate-popup absolute font-display text-[13px] font-bold drop-shadow"
            style={{
              color:
                fl.kind === 'crit'
                  ? '#ffd166'
                  : fl.kind === 'heal'
                    ? '#7dff9c'
                    : fl.kind === 'shield'
                      ? '#7ef9ff'
                      : fl.kind === 'buff'
                        ? '#d0b3ff'
                        : '#ffffff',
              fontSize: fl.kind === 'crit' ? 17 : fl.kind === 'buff' ? 10 : 13,
              textShadow: '0 2px 6px rgba(0,0,0,0.9)',
            }}
          >
            {fl.kind === 'crit' ? `${fl.text}!` : fl.text}
          </span>
        ))}
      </div>
    </div>
  );
}

function UltButton({ unit, onCast, manual }: { unit: Combatant; onCast: () => void; manual: boolean }) {
  const def = HERO_BY_ID[unit.defId];
  const ready = unit.energy >= ULT_COST && unit.alive;
  const pct = (unit.energy / ULT_COST) * 100;
  const skill = unit.skills[1];
  return (
    <button
      type="button"
      onClick={onCast}
      disabled={!ready || !manual}
      className="relative flex-1 transition-transform active:scale-95 disabled:opacity-100"
    >
      <div
        className="relative aspect-square w-full overflow-hidden rounded-xl"
        style={{
          border: `1.5px solid ${ready ? '#ffd166' : 'rgba(255,255,255,0.14)'}`,
          boxShadow: ready ? '0 0 16px -2px rgba(255,209,102,0.75)' : undefined,
          filter: unit.alive ? undefined : 'grayscale(1)',
        }}
      >
        {def && <Portrait look={def.look} dim={!unit.alive} className="h-full w-full" />}
        <div
          className="absolute inset-x-0 bottom-0 bg-black/55"
          style={{ height: `${100 - pct}%`, transition: 'height 0.12s linear' }}
        />
        {ready && <div className="absolute inset-0 flex items-center justify-center text-lg">{skill?.icon ?? '✨'}</div>}
      </div>
      <div className="mt-0.5 truncate text-center text-[8px] text-white/50">{unit.name}</div>
    </button>
  );
}

// ── Итоговый экран ───────────────────────────────────────────
function ResultOverlay({
  result,
  mode,
  allies,
  hasDraft,
  onExit,
  onNext,
  onRetry,
}: {
  result: BattleResult;
  mode: 'campaign' | 'tower' | 'arena';
  allies: Combatant[];
  hasDraft: boolean;
  onExit: () => void;
  onNext: () => void;
  onRetry: () => void;
}) {
  const sorted = allies.slice().sort((a, b) => b.dmgDone - a.dmgDone);
  const maxDmg = Math.max(1, ...sorted.map((s) => s.dmgDone));

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: result.win
            ? 'radial-gradient(70% 40% at 50% 20%, rgba(125,255,156,0.22), transparent 70%)'
            : 'radial-gradient(70% 40% at 50% 20%, rgba(255,94,120,0.22), transparent 70%)',
        }}
      />
      <div className="animate-slideUp relative rounded-t-3xl border-t border-white/10 bg-ink-800/95 p-4" style={{ paddingBottom: 'calc(var(--safe-bottom) + 16px)' }}>
        <h2
          className="text-center font-display text-2xl font-bold tracking-[0.2em]"
          style={{ color: result.win ? '#7dff9c' : '#ff6f8f' }}
        >
          {result.win ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}
        </h2>
        <p className="mb-3 text-center text-[11px] text-white/40">
          Бой длился {(result.ticks * TICK).toFixed(1)} с
        </p>

        <div className="mb-3 space-y-1">
          {sorted.map((u) => (
            <div key={u.uid} className="flex items-center gap-2">
              <span className="w-16 shrink-0 truncate text-[11px] text-white/70">{u.name}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(u.dmgDone / maxDmg) * 100}%`,
                    background: result.mvp === u.uid ? 'linear-gradient(90deg,#ffd166,#ff8f3d)' : 'linear-gradient(90deg,#a06bff,#6a4bff)',
                  }}
                />
              </div>
              <span className="w-12 shrink-0 text-right font-display text-[11px] font-bold text-white/80">
                {fmt(u.dmgDone)}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={onExit} className="btn-ghost flex-1 py-2.5 text-[13px]">
            {mode === 'tower' && hasDraft ? 'Выбрать усиление' : 'Выйти'}
          </button>
          {result.win && mode !== 'arena' && !(mode === 'tower' && hasDraft) && (
            <button type="button" onClick={onNext} className="btn-primary flex-[1.3] py-2.5 text-[13px]">
              Дальше
            </button>
          )}
          {!result.win && mode === 'campaign' && (
            <button type="button" onClick={onRetry} className="btn-primary flex-[1.3] py-2.5 text-[13px]">
              Повторить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
