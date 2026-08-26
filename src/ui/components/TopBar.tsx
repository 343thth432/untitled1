import { useState } from 'react';
import { useGame, teamPowerOf, formatPower } from '../../game/state/store';
import { commanderLevel, heroLevelCap } from '../../game/engine/progression';
import Sheet from './Sheet';

const RES = [
  { key: 'gold', icon: '🪙', color: '#c2760a' },
  { key: 'gems', icon: '💎', color: '#0e7490' },
  { key: 'scrolls', icon: '📜', color: '#be185d' },
] as const;

export function TopBar() {
  const res = useGame((s) => s.res);
  const stage = useGame((s) => s.stage);
  const towerBest = useGame((s) => s.tower.best);
  const power = useGame(teamPowerOf);
  const cmd = commanderLevel(stage, towerBest);
  const [menu, setMenu] = useState(false);

  return (
    <header
      className="relative z-20 shrink-0 px-3 pb-2"
      style={{ paddingTop: 'calc(var(--safe-top) + 8px)' }}
    >
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setMenu(true)} className="panel flex items-center gap-2 rounded-xl px-2.5 py-1.5 active:scale-95">
          <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-neon-violet to-neon-pink text-[13px] font-bold text-ink-900 shadow-glow-sm">
            {cmd}
          </div>
          <div className="leading-none">
            <div className="font-display text-[11px] font-semibold uppercase tracking-wider text-ink-500">Мощь</div>
            <div className="font-display text-sm font-bold text-ink-900">{formatPower(power)}</div>
          </div>
        </button>

        <div className="panel ml-auto flex items-center gap-2.5 rounded-xl px-2.5 py-1.5">
          {RES.map((r) => (
            <div key={r.key} className="flex items-center gap-1">
              <span className="text-[13px]">{r.icon}</span>
              <span className="font-display text-[12px] font-semibold" style={{ color: r.color }}>
                {compact(res[r.key])}
              </span>
            </div>
          ))}
        </div>
      </div>
      <SettingsSheet open={menu} onClose={() => setMenu(false)} commander={cmd} />
    </header>
  );
}

function SettingsSheet({ open, onClose, commander }: { open: boolean; onClose: () => void; commander: number }) {
  const settings = useGame((s) => s.settings);
  const setSetting = useGame((s) => s.setSetting);
  const reset = useGame((s) => s.hardReset);
  const stage = useGame((s) => s.stage);
  const towerBest = useGame((s) => s.tower.best);
  const heroesCount = useGame((s) => Object.keys(s.heroes).length);
  const [confirm, setConfirm] = useState(false);

  if (!open) return null;

  return (
    <Sheet open onClose={onClose} title="Профиль командира">
      <div className="space-y-3 pb-3">
        <div className="grid grid-cols-2 gap-2">
          <Info label="Ранг" value={String(commander)} />
          <Info label="Предел уровня" value={String(heroLevelCap(commander))} />
          <Info label="Этапов пройдено" value={String(stage)} />
          <Info label="Рекорд башни" value={String(towerBest)} />
          <Info label="Героинь открыто" value={String(heroesCount)} />
          <Info label="Версия" value="0.1.0" />
        </div>

        <div className="panel rounded-xl p-3">
          <div className="mb-2 font-display text-[12px] uppercase tracking-wider text-ink-500">Бой</div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[13px] text-ink-700">Ручные ультимейты</span>
            <button
              type="button"
              onClick={() => setSetting('manual', !settings.manual)}
              className="relative h-6 w-11 rounded-full transition-colors"
              style={{ background: settings.manual ? 'rgba(160,107,255,0.75)' : 'rgba(255,255,255,0.14)' }}
            >
              <span
                className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
                style={{ left: settings.manual ? 22 : 2 }}
              />
            </button>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[13px] text-ink-700">Скорость по умолчанию</span>
            <div className="flex gap-1">
              {([1, 2, 4] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSetting('speed', v)}
                  className={`rounded-lg px-2.5 py-1 font-display text-[12px] font-bold ${
                    settings.speed === v ? 'bg-neon-violet/40 text-ink-900' : 'bg-ink-900/[0.06] text-ink-500'
                  }`}
                >
                  ×{v}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="px-1 text-[11px] leading-snug text-ink-400">
          Прогресс хранится только на этом устройстве (IndexedDB). Очистка данных сайта удалит сохранение.
        </p>

        {confirm ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirm(false)} className="btn-ghost flex-1 py-2 text-[12px]">
              Отмена
            </button>
            <button
              type="button"
              onClick={() => {
                void reset();
                setConfirm(false);
                onClose();
              }}
              className="btn flex-1 bg-rose-600/80 py-2 text-[12px] text-ink-900"
            >
              Да, стереть всё
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="btn-ghost w-full py-2 text-[12px] text-rose-200">
            Сбросить прогресс
          </button>
        )}
      </div>
    </Sheet>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink-900/[0.05] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-ink-400">{label}</div>
      <div className="font-display text-[15px] font-bold text-ink-900">{value}</div>
    </div>
  );
}

export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

export default TopBar;
