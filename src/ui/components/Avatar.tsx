import { HERO_BY_ID } from '../../game/data/heroes';
import { FACTIONS, RARITY } from '../../game/data/factions';
import { usePortrait } from '../../art/usePortrait';
import type { Framing } from '../../art/portraitCache';
import { StarRow } from './Bits';

interface Props {
  heroId: string;
  size?: number;
  stars?: number;
  level?: number;
  dim?: boolean;
  onClick?: () => void;
  selected?: boolean;
  badge?: string;
  className?: string;
  hideFrame?: boolean;
  nameOverride?: string;
  fluid?: boolean;
  framing?: Framing;
}

export function Avatar({
  heroId,
  size = 76,
  stars,
  level,
  dim,
  onClick,
  selected,
  badge,
  className = '',
  hideFrame,
  nameOverride,
  fluid,
  framing = 'half',
}: Props) {
  const def = HERO_BY_ID[heroId];
  const url = usePortrait(def?.look ?? HERO_BY_ID.momo.look, heroId, framing, framing === 'bust' ? 200 : 300);
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
          background: `linear-gradient(165deg, ${f.color}26, ${f.color}0d 55%, #ffffff)`,
          border: `1.5px solid ${selected ? r.color : `${r.color}77`}`,
          boxShadow: selected ? `0 0 0 2px ${r.color}, 0 10px 24px -12px ${f.glow}` : `0 6px 16px -12px ${f.glow}`,
        }}
      >
        {url ? (
          <img
            src={url}
            alt={def.name}
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: dim ? 0.42 : 1, filter: dim ? 'grayscale(0.85)' : undefined }}
          />
        ) : (
          <div className="absolute inset-0 animate-pulse" style={{ background: `${f.color}18` }} />
        )}
        {!hideFrame && (
          <>
            <div
              className="absolute inset-x-0 bottom-0 h-1/3"
              style={{ background: 'linear-gradient(to top, rgba(255,255,255,0.96), rgba(255,255,255,0))' }}
            />
            <div className="absolute inset-x-0 bottom-0 px-1 pb-[3px]">
              <div className="truncate text-center font-display text-[10px] font-bold leading-tight text-ink-900">
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
          style={{ background: `${f.color}2e`, border: `1px solid ${f.color}88` }}
        >
          {f.icon}
        </div>
        {level !== undefined && (
          <div className="absolute right-1 top-1 rounded-md bg-ink-900/75 px-1 text-[9px] font-bold text-ink-900">
            {level}
          </div>
        )}
        {badge && (
          <div className="absolute -right-1 -top-1 rounded-full bg-neon-pink px-1.5 py-[1px] text-[9px] font-bold text-ink-900 shadow-glow-sm">
            {badge}
          </div>
        )}
      </div>
    </button>
  );
}

export default Avatar;
