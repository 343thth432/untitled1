import { useState } from 'react';
import { CARDS } from '../../game/data/cards';
import { RELICS } from '../../game/data/relics';
import { HERO_BY_ID } from '../../game/data/heroes';
import { ELEMENTS } from '../../game/data/elements';
import { useGame } from '../../game/state/store';
import CardView from '../CardView';

function Frame({ title, sub, children, foot }: { title: string; sub?: string; children?: React.ReactNode; foot?: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col bg-canvas px-4" style={{ paddingTop: 'calc(var(--safe-top) + 22px)', paddingBottom: 'calc(var(--safe-bottom) + 14px)' }}>
      <h2 className="font-display text-[22px] font-black tracking-tight text-ink-900">{title}</h2>
      {sub && <p className="mt-1 text-[13px] leading-snug text-ink-600">{sub}</p>}
      <div className="scroll-y mt-4 flex-1">{children}</div>
      {foot && <div className="mt-3">{foot}</div>}
    </div>
  );
}

export function RewardScreen() {
  const scene = useGame((s) => s.scene);
  const take = useGame((s) => s.takeCard);
  const [pick, setPick] = useState<string | null>(null);
  if (scene.s !== 'reward') return null;
  const relic = scene.relic ? RELICS[scene.relic] : null;

  return (
    <Frame
      title="Тень рассеялась"
      sub={`Дорога отдаёт своё: ${scene.sparks} искр${relic ? ' и находка' : ''}.`}
      foot={
        <div className="flex gap-2">
          <button type="button" className="btn-ghost flex-1 py-3" onClick={() => take(null)}>
            Пропустить
          </button>
          <button type="button" className="btn-primary flex-[2] py-3" disabled={!pick} onClick={() => take(pick)}>
            Взять карту
          </button>
        </div>
      }
    >
      {relic && (
        <div className="panel mb-3 flex items-center gap-3 px-3 py-2.5">
          <span className="text-[22px]">{relic.icon}</span>
          <div>
            <div className="font-display text-[13px] font-bold text-ink-900">{relic.name}</div>
            <div className="text-[11.5px] text-ink-600">{relic.text}</div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        {scene.cards.map((id) => (
          <CardView key={id} card={CARDS[id]} selected={pick === id} onClick={() => setPick(id)} />
        ))}
      </div>
    </Frame>
  );
}

export function RestScreen() {
  const run = useGame((s) => s.run);
  const heal = useGame((s) => s.restHeal);
  const upgrade = useGame((s) => s.restUpgrade);
  const [mode, setMode] = useState<'none' | 'up'>('none');
  if (!run) return null;
  const up = [...new Set(run.deck)].filter((id) => CARDS[id].up);
  const healAmount = Math.round(run.maxHp * 0.3) + (run.relics.includes('kettle') ? 8 : 0);

  if (mode === 'up') {
    return (
      <Frame
        title="Что отточить"
        sub="Карта станет сильнее до конца дороги."
        foot={
          <button type="button" className="btn-ghost w-full py-3" onClick={() => setMode('none')}>
            Назад
          </button>
        }
      >
        <div className="flex flex-wrap justify-center gap-3">
          {up.map((id) => (
            <CardView key={id} card={CARDS[id]} onClick={() => upgrade(id)} />
          ))}
        </div>
      </Frame>
    );
  }

  return (
    <Frame
      title="Привал"
      sub="Огонь горит ровно. До хранителя ещё далеко — или уже нет."
      foot={
        <div className="flex gap-2">
          <button type="button" className="btn-gold flex-1 py-3" onClick={() => heal()}>
            Отдохнуть · +{healAmount}
          </button>
          <button type="button" className="btn-primary flex-1 py-3" disabled={!up.length} onClick={() => setMode('up')}>
            Отточить карту
          </button>
        </div>
      }
    >
      <div className="panel px-4 py-3 text-[13px] leading-relaxed text-ink-700">
        Ты снимаешь обувь и подставляешь ступни теплу. Здоровье: <b>{run.hp}</b> из {run.maxHp}.
        <br />
        Отдых вернёт {healAmount}. Или можно не спать и переточить одну карту.
      </div>
    </Frame>
  );
}

export function FindScreen() {
  const scene = useGame((s) => s.scene);
  const take = useGame((s) => s.takeRelic);
  if (scene.s !== 'find') return null;
  const r = RELICS[scene.relic];
  return (
    <Frame
      title="Находка"
      sub="Лежит так, будто положили для тебя."
      foot={
        <button type="button" className="btn-primary w-full py-3" onClick={() => take(scene.relic)}>
          Забрать
        </button>
      }
    >
      <div className="panel flex items-center gap-4 px-4 py-4">
        <span className="text-[34px]">{r.icon}</span>
        <div>
          <div className="font-display text-[16px] font-bold text-ink-900">{r.name}</div>
          <div className="mt-0.5 text-[12.5px] text-ink-600">{r.text}</div>
        </div>
      </div>
    </Frame>
  );
}

export function TradeScreen() {
  const scene = useGame((s) => s.scene);
  const run = useGame((s) => s.run);
  const buy = useGame((s) => s.buy);
  const leave = useGame((s) => s.leaveTrade);
  if (scene.s !== 'trade' || !run || !scene.node.wares) return null;
  const w = scene.node.wares;
  return (
    <Frame
      title="Торговец"
      sub={`У тебя ${run.sparks} ✦. Он не торгуется, но и не обманывает.`}
      foot={
        <button type="button" className="btn-ghost w-full py-3" onClick={leave}>
          Идти дальше
        </button>
      }
    >
      <div className="flex flex-wrap justify-center gap-3">
        {w.cards.map((id, i) => (
          <CardView
            key={id + i}
            card={CARDS[id]}
            price={w.prices[i]}
            disabled={w.prices[i] === 0 || run.sparks < w.prices[i]}
            onClick={() => buy('card', i)}
          />
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {w.relics.map((id, i) => {
          const r = RELICS[id];
          const price = w.prices[w.cards.length + i];
          const can = price > 0 && run.sparks >= price;
          return (
            <button
              key={id}
              type="button"
              disabled={!can}
              onClick={() => buy('relic', i)}
              className={`panel flex w-full items-center gap-3 px-3 py-2.5 text-left ${can ? 'active:scale-[0.98]' : 'opacity-45'}`}
            >
              <span className="text-[22px]">{r.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-[13px] font-bold text-ink-900">{r.name}</div>
                <div className="truncate text-[11.5px] text-ink-600">{r.text}</div>
              </div>
              <span className="chip bg-ink-900/[0.06] px-2 text-[11px] text-ink-900">
                {price > 0 ? `${price} ✦` : 'куплено'}
              </span>
            </button>
          );
        })}
      </div>
    </Frame>
  );
}

export function OmenScreen() {
  const scene = useGame((s) => s.scene);
  const answer = useGame((s) => s.answerOmen);
  const close = useGame((s) => s.closeOmen);
  if (scene.s !== 'omen') return null;
  const o = scene.omen;
  return (
    <Frame
      title={o.name}
      sub={o.text}
      foot={
        scene.result ? (
          <button type="button" className="btn-primary w-full py-3" onClick={close}>
            Дальше
          </button>
        ) : undefined
      }
    >
      {scene.result ? (
        <div className="panel px-4 py-4 text-[14px] leading-relaxed text-ink-800">{scene.result}</div>
      ) : (
        <div className="space-y-2">
          {o.choices.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => answer(i)}
              className="panel w-full px-4 py-3 text-left text-[14px] font-semibold text-ink-900 active:scale-[0.98]"
            >
              {c.text}
            </button>
          ))}
        </div>
      )}
    </Frame>
  );
}

export function EndScreen({ win }: { win: boolean }) {
  const meta = useGame((s) => s.meta);
  const run = useGame((s) => s.run);
  const abandon = useGame((s) => s.abandon);
  const hero = run ? HERO_BY_ID[run.heroId] : null;
  const el = hero ? ELEMENTS[hero.element] : null;
  return (
    <Frame
      title={win ? 'Дорога пройдена' : 'Дорога оборвалась'}
      sub={
        win
          ? 'Соль скрипит под ногами, и впереди больше нет тумана.'
          : 'Ты садишься на обочину. Дальше идти нечем.'
      }
      foot={
        <button type="button" className="btn-primary w-full py-3" onClick={abandon}>
          В начало
        </button>
      }
    >
      <div className="panel px-4 py-4">
        {hero && el && (
          <div className="flex items-center gap-3">
            <span className="text-[26px]">{el.icon}</span>
            <div>
              <div className="font-display text-[15px] font-bold text-ink-900">{hero.name}</div>
              <div className="text-[12px] text-ink-600">«{hero.title}»</div>
            </div>
          </div>
        )}
        <div className="mt-3 space-y-1.5 text-[13px] text-ink-700">
          <div className="stat-row"><span>Пройдено дорог</span><b>{meta.wins}</b></div>
          <div className="stat-row"><span>Всего попыток</span><b>{meta.runs}</b></div>
          <div className="stat-row"><span>Память дороги</span><b>{meta.memory} ✦</b></div>
        </div>
        {win && <p className="mt-3 text-[12.5px] text-ink-600">Открыта новая спутница.</p>}
      </div>
    </Frame>
  );
}
