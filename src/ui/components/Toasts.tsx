import { useGame } from '../../game/state/store';

export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-50 flex flex-col items-center gap-2" style={{ top: 'calc(var(--safe-top) + 60px)' }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-slideUp panel flex items-center gap-2 rounded-xl px-3 py-2 text-sm shadow-card"
          style={{
            borderColor:
              t.tone === 'good' ? 'rgba(125,255,156,0.35)' : t.tone === 'bad' ? 'rgba(255,110,150,0.35)' : undefined,
          }}
        >
          {t.icon && <span>{t.icon}</span>}
          <span className="text-ink-800">{t.text}</span>
        </div>
      ))}
    </div>
  );
}

export default Toasts;
