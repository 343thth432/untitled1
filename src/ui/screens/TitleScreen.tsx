import { useState } from 'react';
import { HEROES, HERO_BY_ID } from '../../game/data/heroes';
import { ELEMENTS } from '../../game/data/elements';
import { RELICS } from '../../game/data/relics';
import { CARDS } from '../../game/data/cards';
import { useGame } from '../../game/state/store';
import HeroStage from '../../art/HeroStage';
import CardView from '../CardView';

export default function TitleScreen() {
  const meta = useGame((s) => s.meta);
  const start = useGame((s) => s.start);
  const [pick, setPick] = useState(meta.unlocked[0] ?? HEROES[0].id);
  const hero = HERO_BY_ID[pick];
  const el = ELEMENTS[hero.element];
  const relic = RELICS[hero.relic];
  const deck = [...new Set(hero.deck)].map((id) => CARDS[id]);

  return (
    <div className="relative flex h-full flex-col bg-canvas">
      <HeroStage look={hero.look} framing="full" className="absolute inset-x-0 top-[11%] h-[45%]" />
      <div
        className="pointer-events-none absolute inset-x-0 top-[11%] h-[45%]"
        style={{ background: `linear-gradient(180deg, ${el.soft}00 55%, var(--canvas, #faf8f5) 100%)` }}
      />
      <div className="relative z-10 px-5 pt-6" style={{ paddingTop: 'calc(var(--safe-top) + 18px)' }}>
        <h1 className="font-display text-[26px] font-black tracking-tight text-ink-900">Дорога Затмения</h1>
        <p className="mt-0.5 text-[13px] text-ink-600">
          Три перегона до конца пути. Колода растёт, здоровье — нет.
        </p>
      </div>

      <div className="relative z-10 mt-auto flex flex-col gap-3 px-4 pb-4">
        <div className="panel px-4 py-3">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="font-display text-lg font-bold text-ink-900">{hero.name}</div>
              <div className="text-[12px] text-ink-600">«{hero.title}»</div>
            </div>
            <span className="chip" style={{ background: `${el.color}1a`, color: el.color }}>
              {el.icon} {el.name}
            </span>
          </div>
          <p className="mt-2 text-[12px] leading-snug text-ink-700">{hero.lore}</p>
          <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-ink-900/[0.04] px-3 py-2">
            <span className="text-lg">{relic.icon}</span>
            <div>
              <div className="text-[12px] font-bold text-ink-900">{relic.name}</div>
              <div className="text-[11px] text-ink-600">{relic.text}</div>
            </div>
          </div>
          <div className="scroll-y mt-2.5 flex gap-2 pb-1">
            {deck.map((c) => (
              <CardView key={c.id} card={c} compact />
            ))}
          </div>
        </div>

        <div className="scroll-y flex gap-2 pb-1">
          {HEROES.map((h) => {
            const open = meta.unlocked.includes(h.id);
            const he = ELEMENTS[h.element];
            return (
              <button
                key={h.id}
                type="button"
                disabled={!open}
                onClick={() => setPick(h.id)}
                className={`flex h-[54px] w-[54px] shrink-0 flex-col items-center justify-center rounded-2xl border text-[10px] font-semibold transition-transform active:scale-95
                  ${pick === h.id ? 'ring-2' : ''} ${open ? '' : 'opacity-35'}`}
                style={{
                  borderColor: `${he.color}44`,
                  background: `linear-gradient(150deg, ${he.soft}, #fff)`,
                  color: he.color,
                }}
              >
                <span className="text-[15px]">{open ? he.icon : '🔒'}</span>
                <span className="mt-0.5 text-ink-800">{open ? h.name : '???'}</span>
              </button>
            );
          })}
        </div>

        <button type="button" className="btn-primary w-full py-3 text-[15px]" onClick={() => start(pick)}>
          Выйти на дорогу
        </button>
        {meta.runs > 0 && (
          <div className="text-center text-[11px] text-ink-500">
            Пройдено дорог: {meta.wins} из {meta.runs} · память {meta.memory} ✦
          </div>
        )}
      </div>
    </div>
  );
}
