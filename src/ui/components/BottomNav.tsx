import { useGame } from '../../game/state/store';
import type { Screen } from '../../game/types';

const TABS: { id: Screen; label: string; icon: string }[] = [
  { id: 'campaign', label: 'Поход', icon: '⚔️' },
  { id: 'heroes', label: 'Отряд', icon: '👥' },
  { id: 'summon', label: 'Призыв', icon: '🔮' },
  { id: 'tower', label: 'Башня', icon: '🗼' },
  { id: 'arena', label: 'Арена', icon: '🏆' },
];

export function BottomNav() {
  const screen = useGame((s) => s.screen);
  const go = useGame((s) => s.go);
  const draft = useGame((s) => s.tower.pendingDraft);
  const tickets = useGame((s) => s.arena.tickets);

  return (
    <nav
      className="relative z-20 shrink-0 px-2"
      style={{ paddingBottom: 'calc(var(--safe-bottom) + 6px)' }}
    >
      <div className="panel flex items-stretch justify-between gap-0.5 rounded-2xl p-1">
        {TABS.map((t) => {
          const active = screen === t.id || (t.id === 'heroes' && screen === 'hero');
          const badge = t.id === 'tower' && draft ? '!' : t.id === 'arena' && tickets > 0 ? String(tickets) : null;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => go(t.id)}
              className="relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors active:scale-95"
              style={
                active
                  ? {
                      background: 'linear-gradient(160deg, rgba(160,107,255,0.28), rgba(255,94,168,0.14))',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14)',
                    }
                  : undefined
              }
            >
              <span className={`text-[17px] leading-none ${active ? '' : 'opacity-60'}`}>{t.icon}</span>
              <span
                className={`font-display text-[10px] font-semibold uppercase tracking-wide ${
                  active ? 'text-white' : 'text-white/45'
                }`}
              >
                {t.label}
              </span>
              {badge && (
                <span className="absolute right-1.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-neon-pink px-1 text-[9px] font-bold text-white">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;
