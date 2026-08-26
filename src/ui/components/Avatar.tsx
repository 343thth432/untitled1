import Portrait from '../../art/Portrait';
import { HERO_BY_ID } from '../../game/data/heroes';
import { FACTIONS, RARITY } from '../../game/data/factions';
import { StarRow } from './Bits';

interface Props {
  heroId: string;
  size?: number;
  stars?: number;
  level?: number;
  dim?: boolean;
  fierce?: boolean;
  flip?: boolean;
  onClick?: () => void;
  selected?: boolean;
  badge?: string;
  className?: string;
  hideFrame?: boolean;
  nameOverride?: string;
  /** растянуть по ширине контейнера */
  fluid?: boolean;
}

export function Avatar({
  heroId,
  size = 76,
  stars,
  level,
  dim,
  fierce,
  flip,
  onClick,
  selected,
  badge,
  className = '',
  hideFrame,
  nameOverride,
  fluid,
}: Props) {
  const def = HERO_BY_ID[heroId];
  if (!def) return null;
  const r = RARITY[def.rarity];
  const f = FACTIONS[def.faction];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`relative shrink-0 ${onClick ? 'active:scale-95 transition-transform' : ''} ${className}`}
      style={{ width: fluid ? '100%' : size }}
    >
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          height: fluid ? undefined : size * 1.18,
          aspectRatio: fluid ? '1 / 1.18' : undefined,
          background: `linear-gradient(160deg, ${f.color}22, #0b0817 65%)`,
          border: `1.5px solid ${selected ? '#fff' : r.color}${selected ? '' : '99'}`,
          boxShadow: selected ? `0 0 0 2px ${r.color}, 0 8px 22px -8px ${f.glow}` : `0 6px 18px -10px ${f.glow}`,
        }}
      >
        <div className="absolute inset-0 bg-stars opacity-40" />
        <Portrait look={def.look} dim={dim} fierce={fierce} flip={flip} className="absolute inset-0 h-full w-full" />
        {!hideFrame && (
          <>
            <div
              className="absolute inset-x-0 bottom-0 h-1/3"
              style={{ background: 'linear-gradient(to top, rgba(6,4,14,0.92), transparent)' }}
            />
            <div className="absolute inset-x-0 bottom-0 px-1 pb-[3px]">
              <div className="truncate text-center font-display text-[10px] font-semibold leading-tight text-white/90">
                {nameOverride ?? def.name}
              </div>
              {stars !== undefined && (
                <div className="flex justify-center">
                  <StarRow stars={stars} size={7} />
                </div>
              )}
            </div>
          </>
        )}
        <div
          className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px]"
          style={{ background: `${f.color}33`, border: `1px solid ${f.color}88` }}
        >
          {f.icon}
        </div>
        {level !== undefined && (
          <div className="absolute right-1 top-1 rounded-md bg-black/60 px-1 text-[9px] font-bold text-white/90">
            {level}
          </div>
        )}
        {badge && (
          <div className="absolute -right-1 -top-1 rounded-full bg-neon-pink px-1.5 py-[1px] text-[9px] font-bold text-white shadow-glow-sm">
            {badge}
          </div>
        )}
      </div>
    </button>
  );
}

export default Avatar;
