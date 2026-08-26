import type { GearItem } from '../../game/types';
import { RARITY } from '../../game/data/factions';
import { SET_BY_ID, SLOT_ICON, formatStat, gearScore } from '../../game/data/gear';

export function GearCard({
  item,
  onClick,
  selected,
  compactMode,
}: {
  item: GearItem;
  onClick?: () => void;
  selected?: boolean;
  compactMode?: boolean;
}) {
  const r = RARITY[item.rarity];
  const set = SET_BY_ID[item.setId];
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-full overflow-hidden rounded-xl p-2 text-left transition-transform active:scale-[0.97]"
      style={{
        background: `linear-gradient(150deg, ${r.color}1f, #ffffff 65%)`,
        border: `1px solid ${selected ? '#fff' : `${r.color}66`}`,
      }}
    >
      <div className="flex items-start gap-2">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
          style={{ background: `${r.color}22`, border: `1px solid ${r.color}55` }}
        >
          {SLOT_ICON[item.slot]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="font-display text-[12px] font-bold" style={{ color: r.color }}>
              +{item.level}
            </span>
            <span className="truncate text-[11px] font-semibold text-ink-800">{set?.name}</span>
            {item.locked && <span className="text-[10px]">🔒</span>}
          </div>
          <div className="text-[11px] text-ink-600">{formatStat(item.mainStat, item.mainValue, item.mainPct)}</div>
          {!compactMode && (
            <div className="mt-0.5 flex flex-wrap gap-x-2 text-[10px] text-ink-400">
              {item.subs.map((s, i) => (
                <span key={i}>{formatStat(s.stat, s.value, s.pct)}</span>
              ))}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[9px] uppercase tracking-wider text-ink-400">оценка</div>
          <div className="font-display text-[12px] font-bold text-ink-700">{gearScore(item)}</div>
        </div>
      </div>
      {item.equippedBy && (
        <div className="absolute right-1 top-1 rounded-full bg-emerald-400/20 px-1.5 text-[9px] font-semibold text-emerald-200">
          надето
        </div>
      )}
    </button>
  );
}

export default GearCard;
