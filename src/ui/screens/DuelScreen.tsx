import { useEffect, useRef, useState } from 'react';
import { HERO_BY_ID } from '../../game/data/heroes';
import { CARDS } from '../../game/data/cards';
import { ELEMENTS, STATUSES } from '../../game/data/elements';
import { useGame, currentLeg } from '../../game/state/store';
import type { Intent, StatusId } from '../../game/types';
import DuelStage, { type DuelStageApi } from '../../art/DuelStage';
import CardView from '../CardView';

interface Float {
  id: number;
  who: 'hero' | 'foe';
  text: string;
  tone: 'dmg' | 'block' | 'heal' | 'miss';
}

const INTENT_ICON: Record<Intent['kind'], string> = {
  strike: '⚔',
  guard: '🛡',
  buff: '⬆',
  curse: '☠',
  rest: '💤',
  special: '✳',
};

function Pips({ status }: { status: Partial<Record<StatusId, number>> }) {
  const list = Object.entries(status).filter(([, v]) => (v ?? 0) > 0);
  if (!list.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {list.map(([id, v]) => {
        const d = STATUSES[id as StatusId];
        return (
          <span
            key={id}
            title={`${d.name}: ${d.text}`}
            className={`chip px-1.5 py-0.5 text-[10px] ${d.good ? 'bg-emerald-500/15 text-emerald-700' : 'bg-rose-500/15 text-rose-700'}`}
          >
            {d.icon} {v}
          </span>
        );
      })}
    </div>
  );
}

function Bar({ hp, max, block, color }: { hp: number; max: number; block: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-[9px] flex-1 overflow-hidden rounded-full bg-ink-900/12">
        <div className="hp-bar h-full rounded-full" style={{ width: `${(hp / max) * 100}%`, background: color }} />
      </div>
      <span className="font-display text-[12px] font-bold text-ink-900">
        {hp}
        <span className="text-ink-500">/{max}</span>
      </span>
      {block > 0 && (
        <span className="chip bg-sky-500/15 px-1.5 text-[10px] text-sky-700">🛡 {block}</span>
      )}
    </div>
  );
}

export default function DuelScreen() {
  const duel = useGame((s) => s.duel);
  const run = useGame((s) => s.run);
  const tick = useGame((s) => s.tick);
  const playCard = useGame((s) => s.playCard);
  const endTurn = useGame((s) => s.endTurn);
  const finish = useGame((s) => s.finishDuel);
  const apiRef = useRef<DuelStageApi | null>(null);
  const seen = useRef(0);
  const fid = useRef(0);
  const [floats, setFloats] = useState<Float[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = duel;
    if (!d) return;
    const fresh = d.events.slice(seen.current);
    seen.current = d.events.length;
    const add: Float[] = [];
    for (const e of fresh) {
      if (e.t === 'card' && e.anim) apiRef.current?.play('hero', e.anim);
      if (e.t === 'foeTurn') apiRef.current?.play('foe', 'attack');
      if (e.t === 'hit') {
        if (e.v > 0) {
          add.push({ id: fid.current++, who: e.who, text: `−${e.v}`, tone: 'dmg' });
          if (e.kind === 'attack') apiRef.current?.play(e.who, 'hurt');
        } else if (e.blocked > 0) {
          add.push({ id: fid.current++, who: e.who, text: 'блок', tone: 'miss' });
        }
      }
      if (e.t === 'block' && e.v > 0) add.push({ id: fid.current++, who: e.who, text: `+${e.v} 🛡`, tone: 'block' });
      if (e.t === 'heal' && e.v > 0) add.push({ id: fid.current++, who: e.who, text: `+${e.v}`, tone: 'heal' });
      if (e.t === 'over') {
        apiRef.current?.setDown(e.win ? 'foe' : 'hero', true);
        if (e.win) apiRef.current?.play('hero', 'win');
      }
    }
    if (add.length) {
      setFloats((f) => [...f, ...add].slice(-14));
      window.setTimeout(() => setFloats((f) => f.slice(add.length)), 1100);
    }
    if (d.over) {
      setBusy(true);
      const to = window.setTimeout(() => finish(), 1500);
      return () => window.clearTimeout(to);
    }
    return undefined;
    // события копятся в движке, читаем их по тику
  }, [tick, duel, finish]);

  if (!duel || !run) return null;
  const hero = HERO_BY_ID[run.heroId];
  const leg = currentLeg(run);
  const el = ELEMENTS[hero.element];
  const foeEl = ELEMENTS[duel.foeDef.element];

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-canvas">
      <div className="relative min-h-0 flex-1">
      <DuelStage
        biome={leg.biome}
        hero={hero.look}
        foe={duel.foeDef.look}
        apiRef={apiRef}
        className="absolute inset-0"
      />

      {/* противник */}
      <div className="relative z-10 px-3" style={{ paddingTop: 'calc(var(--safe-top) + 10px)' }}>
        <div className="panel px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="truncate font-display text-[14px] font-bold text-ink-900">{duel.foeDef.name}</div>
              <div className="text-[11px] text-ink-500">{duel.foeDef.title}</div>
            </div>
            <div className="flex items-center gap-1.5">
              {duel.intents.map((it, i) => (
                <span
                  key={i}
                  className="chip gap-1 px-2 py-1 text-[11px]"
                  style={{ background: `${foeEl.color}1a`, color: foeEl.color }}
                >
                  {INTENT_ICON[it.kind]} {it.label}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-1.5">
            <Bar hp={duel.foe.hp} max={duel.foe.maxHp} block={duel.foe.block} color="linear-gradient(90deg,#f0709a,#d33d68)" />
            <Pips status={duel.foe.status} />
          </div>
        </div>
      </div>

      {/* всплывающие числа */}
      <div className="pointer-events-none absolute inset-0 z-20">
        {floats.map((f, i) => (
          <div
            key={f.id}
            className="absolute animate-popup font-display text-[18px] font-black"
            style={{
              left: f.who === 'hero' ? '26%' : '74%',
              top: f.who === 'hero' ? '62%' : '42%',
              transform: `translate(-50%,${-i * 16}px)`,
              color:
                f.tone === 'dmg' ? '#e0405f' : f.tone === 'block' ? '#2f86c4' : f.tone === 'heal' ? '#2f9b6a' : '#6b6480',
              textShadow: '0 2px 8px rgba(255,255,255,0.9)',
            }}
          >
            {f.text}
          </div>
        ))}
      </div>

      </div>

      {/* героиня и рука */}
      <div className="relative z-10 shrink-0 border-t border-ink-900/[0.07] bg-white/85 px-3 pb-2 pt-2 backdrop-blur-md"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 8px)' }}>
        <div className="px-1">
          <div className="flex items-center gap-2">
            <span className="font-display text-[13px] font-bold text-ink-900">{hero.name}</span>
            <span className="chip px-1.5 text-[10px]" style={{ background: `${el.color}1a`, color: el.color }}>
              {el.icon}
            </span>
            <span
              className="ml-auto grid h-[30px] min-w-[30px] place-items-center rounded-full px-2 font-display text-[14px] font-black text-white"
              style={{ background: `linear-gradient(140deg, ${el.color}, ${el.color}aa)` }}
              title="Энергия"
            >
              {duel.energy}
            </span>
            <span className="text-[11px] text-ink-500">ход {duel.turn}</span>
          </div>
          <div className="mt-1">
            <Bar hp={duel.hero.hp} max={duel.hero.maxHp} block={duel.hero.block} color="linear-gradient(90deg,#5ad19a,#2f9b6a)" />
            <Pips status={duel.hero.status} />
          </div>
        </div>

        <div className="mt-2">
          <div className="scroll-y flex gap-2 overflow-x-auto pb-1">
            {duel.hand.map((id, i) => (
              <CardView
                key={`${id}-${i}`}
                card={CARDS[id]}
                disabled={busy || !duel.canPlay(i)}
                onClick={() => playCard(i)}
                compact
              />
            ))}
            {!duel.hand.length && (
              <div className="grid h-[132px] flex-1 place-items-center text-[12px] text-ink-500">рука пуста</div>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <div className="flex gap-2 text-[11px] text-ink-500">
            <span>колода {duel.drawPile.length}</span>
            <span>сброс {duel.discard.length}</span>
          </div>
          <button
            type="button"
            disabled={busy}
            className="btn-primary ml-auto px-5 py-2.5 text-[14px]"
            onClick={() => endTurn()}
          >
            Конец хода
          </button>
        </div>
      </div>
    </div>
  );
}
