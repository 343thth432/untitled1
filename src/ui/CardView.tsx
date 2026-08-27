import type { CardDef } from '../game/types';
import { cardText } from '../game/data/cards';
import { ELEMENTS } from '../game/data/elements';

const TYPE_NAME: Record<CardDef['type'], string> = {
  attack: 'Удар',
  guard: 'Защита',
  art: 'Приём',
  burden: 'Тягота',
};

export function CardView({
  card,
  onClick,
  disabled,
  selected,
  compact,
  price,
}: {
  card: CardDef;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  compact?: boolean;
  price?: number;
}) {
  const el = card.element ? ELEMENTS[card.element] : null;
  const accent = el?.color ?? '#6b6480';
  const soft = el?.soft ?? '#2a2740';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`relative flex shrink-0 flex-col overflow-hidden rounded-2xl border text-left transition-transform
        ${compact ? 'w-[104px] p-2' : 'w-[116px] p-2.5'}
        ${selected ? '-translate-y-2 ring-2' : ''}
        ${disabled ? 'opacity-45 saturate-50' : 'active:scale-[0.97]'}`}
      style={{
        height: compact ? 132 : 158,
        borderColor: `${accent}55`,
        background: `linear-gradient(158deg, ${accent}26, #141a2e 44%, #0c1020)`,
        boxShadow: selected
          ? `0 16px 30px -14px ${accent}, 0 0 0 2px ${accent}88, inset 0 1px 0 ${accent}44`
          : `0 12px 24px -16px #000, inset 0 1px 0 ${soft}18`,
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[12px] font-bold text-white"
          style={{ background: accent }}
        >
          {card.cost}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
          {el?.icon} {TYPE_NAME[card.type]}
        </span>
      </div>
      <div className={`mt-1 font-display font-bold leading-tight text-ink-900 ${compact ? 'text-[11px]' : 'text-[12.5px]'}`}>
        {card.name}
      </div>
      <div className={`mt-1 leading-snug text-ink-700 ${compact ? 'text-[10px]' : 'text-[10.5px]'}`}>
        {cardText(card)}
      </div>
      {card.exhaust && <div className="mt-auto text-[9px] font-semibold uppercase tracking-wide text-ink-500">уходит</div>}
      {price !== undefined && (
        <div className="mt-auto self-end rounded-full bg-ink-900/[0.06] px-2 py-0.5 text-[10px] font-bold text-ink-900">
          {price > 0 ? `${price} ✦` : 'куплено'}
        </div>
      )}
    </button>
  );
}

export default CardView;
