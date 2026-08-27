import { useGame } from '../../game/state/store';

/** Итог вылазки: спуск пройден или героиня осталась внизу. */
export default function EndScreen({ win }: { win: boolean }) {
  const meta = useGame((s) => s.meta);
  const abandon = useGame((s) => s.abandon);

  return (
    <div
      className="bg-stars flex h-full flex-col items-center justify-center gap-5 px-6 text-center"
      style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'calc(var(--safe-bottom) + 16px)' }}
    >
      <div className="text-[52px]">{win ? '🜲' : '🜏'}</div>
      <div>
        <h2 className="font-display text-[26px] font-black text-ink-900">
          {win ? 'Затмение разомкнуто' : 'Спуск оборвался'}
        </h2>
        <p className="mt-2 text-[13px] leading-snug text-ink-600">
          {win
            ? 'Ты прошла все три яруса и погасила источник. Открыта новая героиня.'
            : 'Тьма забрала тебя между ярусами. Следующая спустится глубже.'}
        </p>
      </div>
      <div className="panel flex gap-6 px-5 py-3 text-[12px] text-ink-600">
        <div>
          <div className="font-display text-[17px] font-bold text-ink-900">{meta.wins}</div>
          побед
        </div>
        <div>
          <div className="font-display text-[17px] font-bold text-ink-900">{meta.runs}</div>
          вылазок
        </div>
        <div>
          <div className="font-display text-[17px] font-bold text-ink-900">{meta.best + 1}</div>
          лучший ярус
        </div>
      </div>
      <button type="button" className="btn-primary w-full max-w-[320px] py-3 text-[15px]" onClick={abandon}>
        К выбору героини
      </button>
    </div>
  );
}
