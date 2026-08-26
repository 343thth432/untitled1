import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useGame } from '../../game/state/store';
import { Battle, BATTLE_TIMEOUT, TICK, ULT_COST, fmt } from '../../game/engine/battle';
import type { BattleResult, Combatant, FloatKind } from '../../game/types';
import { HERO_BY_ID } from '../../game/data/heroes';
import BattleStage, { type StageApi, type StageUnit } from '../../art/BattleStage';
import { useDrawnAvatar } from '../../art/useDrawnAvatar';

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
  const [banner, setBanner] = useState<{ uid: string; name: string } | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<BattleResult | null>(null);

  const battleRef = useRef<Battle | null>(null);
  const stageRef = useRef<StageApi | null>(null);
  const rafRef = useRef<number>(0);
  const accRef = useRef(0);
  const lastRef = useRef(0);
  const doneRef = useRef(false);

  const speed = settings.speed;
  const manual = settings.manual;

  if (setup && !battleRef.current) {
    const b = new Battle(setup.allies, setup.foes, setup.seed, settings.manual);
    b.start();
    battleRef.current = b;
  }

  const stageUnits = useMemo<StageUnit[]>(() => {
    const b = battleRef.current;
    if (!b) return [];
    return b.units.map((u) => ({
      uid: u.uid,
      look: HERO_BY_ID[u.defId]?.look ?? HERO_BY_ID.momo.look,
      side: u.side,
      slot: u.slot,
    }));
  }, [setup?.seed]);

  const pushEvents = useCallback((ev: ReturnType<Battle['step']>) => {
    const api = stageRef.current;
    if (api) {
      for (const uid of ev.attacks) api.trigger(uid, 'attack');
      for (const u of ev.ults) api.trigger(u.uid, 'cast');
      for (const uid of ev.hits) api.trigger(uid, 'hurt');
      for (const uid of ev.deaths) api.setDead(uid, true);
    }
    if (ev.floats.length) {
      const items = ev.floats.map((f) => ({ id: floatId++, uid: f.uid, text: f.text, kind: f.kind }));
      setFloats((prev) => [...prev.slice(-30), ...items]);
      window.setTimeout(() => {
        const ids = new Set(items.map((i) => i.id));
        setFloats((prev) => prev.filter((p) => !ids.has(p.id)));
      }, 900);
    }
    if (ev.log.length) {
      const lines = ev.log.filter((l) => l.kind !== 'info').map((l) => l.text);
      if (lines.length) setLog((prev) => [...prev, ...lines].slice(-2));
    }
    if (ev.ults.length) {
      const u = ev.ults[ev.ults.length - 1];
      setBanner(u);
      window.setTimeout(() => setBanner((b) => (b === u ? null : b)), 950);
    }
  }, []);

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

  // мёртвые с прошлого этажа башни
  useEffect(() => {
    const b = battleRef.current;
    if (!b) return;
    const id = window.setTimeout(() => {
      for (const u of b.units) if (!u.alive) stageRef.current?.setDead(u.uid, true);
    }, 60);
    return () => window.clearTimeout(id);
  }, [setup?.seed]);

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
    setLog([]);
    exitBattle();
    window.setTimeout(fn, 20);
  };

  const b = battleRef.current;
  if (!setup || !b) return null;

  const allies = b.units.filter((u) => u.side === 'ally');
  const timeLeft = Math.max(0, BATTLE_TIMEOUT - b.time);
  const positions = stageRef.current?.positions ?? {};

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col overflow-hidden"
      style={{ background: `linear-gradient(180deg, ${setup.bg[0]} 0%, ${setup.bg[1]} 58%, #ffffff 100%)` }}
    >
      {/* Верхняя панель */}
      <div
        className="relative z-20 flex items-center gap-2 px-3 pb-1"
        style={{ paddingTop: 'calc(var(--safe-top) + 8px)' }}
      >
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[13px] font-bold text-ink-900">{setup.title}</div>
          <div className="truncate text-[10px] text-ink-500">{setup.subtitle}</div>
        </div>
        <div className="rounded-lg bg-ink-900/[0.06] px-2 py-1 font-display text-[12px] font-bold text-ink-800">
          {timeLeft.toFixed(0)}с
        </div>
        <button
          type="button"
          onClick={() => setSetting('speed', (speed === 1 ? 2 : speed === 2 ? 4 : 1) as 1 | 2 | 4)}
          className="rounded-lg bg-ink-900/[0.06] px-2 py-1 font-display text-[12px] font-bold text-ink-800"
        >
          ×{speed}
        </button>
        <button
          type="button"
          onClick={() => setSetting('manual', !manual)}
          className={`rounded-lg px-2 py-1 font-display text-[11px] font-bold ${
            manual ? 'bg-ink-900/[0.06] text-ink-700' : 'bg-neon-violet text-white'
          }`}
        >
          {manual ? 'РУЧН' : 'АВТО'}
        </button>
        <button
          type="button"
          onClick={skip}
          className="rounded-lg bg-ink-900/[0.06] px-2 py-1 font-display text-[11px] font-bold text-ink-700"
        >
          ⏭
        </button>
      </div>

      {/* Сцена */}
      <div className="relative z-10 flex-1">
        <BattleStage
          units={stageUnits}
          accent={setup.accent}
          floor={setup.bg[0]}
          apiRef={stageRef}
          className="absolute inset-0"
        />

        {/* Полоски и числа поверх 3D */}
        <div className="pointer-events-none absolute inset-0">
          {b.units.map((u) => {
            const p = positions[u.uid];
            if (!p) return null;
            return (
              <UnitHud
                key={u.uid}
                unit={u}
                x={p.x}
                y={p.y}
                k={p.k}
                floats={floats.filter((f) => f.uid === u.uid)}
              />
            );
          })}
        </div>

        {/* Баннер ульты / лог */}
        <div className="pointer-events-none absolute inset-x-0 top-2 flex flex-col items-center gap-1">
          {banner ? (
            <span className="animate-slideUp rounded-full bg-ink-900/[0.06]5 px-3.5 py-1.5 font-display text-[13px] font-bold tracking-wider text-neon-gold shadow-card">
              {banner.name}
            </span>
          ) : (
            log.map((l, i) => (
              <span key={`${l}-${i}`} className="font-display text-[11px] text-ink-500" style={{ opacity: 0.5 + i * 0.4 }}>
                {l}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Ультимейты */}
      <div className="relative z-20 px-3 pb-2" style={{ paddingBottom: 'calc(var(--safe-bottom) + 10px)' }}>
        {manual && allies.some((u) => u.holdingUlt) && (
          <div className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-neon-gold">
            Ультимейт готов — нажмите портрет
          </div>
        )}
        <div className="panel flex items-center justify-between gap-1.5 rounded-2xl p-2">
          {allies.map((u) => (
            <UltButton key={u.uid} unit={u} onCast={() => castUlt(u.uid)} manual={manual} />
          ))}
        </div>
      </div>

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

// ── Полоски над головой ──────────────────────────────────────
function UnitHud({
  unit,
  x,
  y,
  k,
  floats,
}: {
  unit: Combatant;
  x: number;
  y: number;
  k: number;
  floats: FloatItem[];
}) {
  const hpPct = (unit.hp / unit.maxHp) * 100;
  const shield = unit.statuses.filter((s) => s.kind === 'shield').reduce((a, s) => a + (s.value ?? 0), 0);
  const w = 62 * k;
  const foe = unit.side === 'foe';

  return (
    <div className="absolute" style={{ left: x, top: y, transform: 'translate(-50%, -100%)', width: w }}>
      <div className="relative flex flex-col items-center">
        {/* всплывающие числа */}
        <div className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2">
          {floats.map((fl) => (
            <span
              key={fl.id}
              className="animate-popup absolute -translate-x-1/2 whitespace-nowrap font-display font-extrabold"
              style={{
                color:
                  fl.kind === 'crit'
                    ? '#f59e0b'
                    : fl.kind === 'heal'
                      ? '#16a34a'
                      : fl.kind === 'shield'
                        ? '#0891b2'
                        : fl.kind === 'buff'
                          ? '#7c3aed'
                          : foe
                            ? '#e11d48'
                            : '#1f2937',
                fontSize: fl.kind === 'crit' ? 17 * k : fl.kind === 'buff' ? 10 * k : 13 * k,
                textShadow: '0 1px 3px rgba(255,255,255,0.95), 0 0 8px rgba(255,255,255,0.9)',
              }}
            >
              {fl.kind === 'crit' ? `${fl.text}!` : fl.text}
            </span>
          ))}
        </div>

        {unit.alive && (
          <>
            <div
              className="truncate text-center font-display font-bold text-ink-900"
              style={{ fontSize: 9 * k, textShadow: '0 1px 2px rgba(255,255,255,0.9)', maxWidth: w }}
            >
              {unit.name}
            </div>
            <div
              className="w-full overflow-hidden rounded-full border border-white/70 bg-ink-900/25"
              style={{ height: 5 * k }}
            >
              <div
                className="hp-bar h-full rounded-full"
                style={{
                  width: `${Math.max(0, hpPct)}%`,
                  background: foe ? 'linear-gradient(90deg,#fb7185,#e11d48)' : 'linear-gradient(90deg,#4ade80,#16a34a)',
                }}
              />
            </div>
            <div
              className="mt-[1px] w-3/4 overflow-hidden rounded-full bg-ink-900/15"
              style={{ height: 3 * k }}
            >
              <div
                className="energy-bar h-full rounded-full"
                style={{ width: `${(unit.energy / ULT_COST) * 100}%`, background: '#0ea5e9' }}
              />
            </div>
            <div className="mt-[2px] flex flex-wrap justify-center gap-[2px]">
              {shield > 0 && (
                <span className="rounded bg-cyan-500/85 px-1 font-bold text-ink-900" style={{ fontSize: 7 * k }}>
                  🛡{fmt(shield)}
                </span>
              )}
              {unit.statuses
                .filter((s) => s.kind !== 'shield')
                .slice(0, 3)
                .map((s, i) => (
                  <span
                    key={i}
                    className="rounded px-1 font-bold text-ink-900"
                    style={{
                      fontSize: 7 * k,
                      background:
                        s.kind === 'buff' ? 'rgba(22,163,74,0.9)' : s.kind === 'stun' ? 'rgba(217,119,6,0.9)' : 'rgba(225,29,72,0.9)',
                    }}
                  >
                    {s.label}
                  </span>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function UltButton({ unit, onCast, manual }: { unit: Combatant; onCast: () => void; manual: boolean }) {
  const def = HERO_BY_ID[unit.defId];
  const url = useDrawnAvatar(def?.look ?? HERO_BY_ID.momo.look, unit.defId, 200);
  const ready = unit.energy >= ULT_COST && unit.alive;
  const pct = (unit.energy / ULT_COST) * 100;
  const skill = unit.skills[1];
  return (
    <button
      type="button"
      onClick={onCast}
      disabled={!ready || !manual}
      className="relative flex-1 transition-transform active:scale-95"
    >
      <div
        className="relative aspect-square w-full overflow-hidden rounded-xl bg-ink-100"
        style={{
          border: `1.5px solid ${ready ? '#f59e0b' : 'rgba(36,28,58,0.14)'}`,
          boxShadow: ready ? '0 0 16px -2px rgba(245,158,11,0.75)' : undefined,
          filter: unit.alive ? undefined : 'grayscale(1) opacity(0.5)',
        }}
      >
        {url && <img src={url} alt={unit.name} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '50% 6%' }} draggable={false} />}
        <div
          className="absolute inset-x-0 bottom-0 bg-ink-900/40"
          style={{ height: `${100 - pct}%`, transition: 'height 0.12s linear' }}
        />
        {ready && (
          <div className="absolute inset-0 flex items-center justify-center text-lg drop-shadow">{skill?.icon ?? '✨'}</div>
        )}
      </div>
      <div className="mt-0.5 truncate text-center text-[8px] text-ink-500">{unit.name}</div>
    </button>
  );
}

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
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-ink-900/40 backdrop-blur-[3px]">
      <div
        className="animate-slideUp relative rounded-t-3xl border-t border-ink-900/10 bg-paper p-4 shadow-card"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 16px)' }}
      >
        <h2
          className="text-center font-display text-2xl font-extrabold tracking-[0.2em]"
          style={{ color: result.win ? '#16a34a' : '#e11d48' }}
        >
          {result.win ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}
        </h2>
        <p className="mb-3 text-center text-[11px] text-ink-400">Бой длился {(result.ticks * TICK).toFixed(1)} с</p>

        <div className="mb-3 space-y-1">
          {sorted.map((u) => (
            <div key={u.uid} className="flex items-center gap-2">
              <span className="w-16 shrink-0 truncate text-[11px] text-ink-600">{u.name}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-900/[0.06]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(u.dmgDone / maxDmg) * 100}%`,
                    background:
                      result.mvp === u.uid
                        ? 'linear-gradient(90deg,#fbbf24,#f97316)'
                        : 'linear-gradient(90deg,#a78bfa,#6d5cff)',
                  }}
                />
              </div>
              <span className="w-12 shrink-0 text-right font-display text-[11px] font-bold text-ink-700">
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
