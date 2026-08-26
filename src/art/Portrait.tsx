import { useId, memo } from 'react';
import type { Appearance } from '../game/types';

interface Props {
  look: Appearance;
  className?: string;
  /** приглушить (повержена) */
  dim?: boolean;
  /** боевой режим — чуть более резкое выражение */
  fierce?: boolean;
  flip?: boolean;
}

function shade(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const n = parseInt(c.length === 3 ? c.split('').map((x) => x + x).join('') : c, 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (n & 255) + amount));
  return `rgb(${r},${g},${b})`;
}

/**
 * Процедурный аниме-портрет. Все черты собираются из параметров Appearance,
 * так что каждая героиня узнаваема, а слоты готовы под замену на растровый арт.
 */
function PortraitBase({ look, className, dim, fierce, flip }: Props) {
  const uid = useId().replace(/[:]/g, '');
  const hairDark = shade(look.hairColor, -38);
  const hairLight = look.hairColor2;
  const skinShade = shade(look.skin, -26);
  const mood = fierce ? Math.min(look.mood, 0.35) : look.mood;

  const browY = 47.5 - mood * 1.4;
  const browTilt = (0.5 - mood) * 3.4;
  const mouthCurve = 2 + mood * 3.2;
  const eyeSquash = 1 - (1 - mood) * 0.12;

  return (
    <svg
      viewBox="0 0 100 120"
      className={className}
      style={{
        opacity: dim ? 0.42 : 1,
        filter: dim ? 'grayscale(0.85)' : undefined,
        transform: flip ? 'scaleX(-1)' : undefined,
      }}
    >
      <defs>
        <linearGradient id={`hair${uid}`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor={hairLight} />
          <stop offset="45%" stopColor={look.hairColor} />
          <stop offset="100%" stopColor={hairDark} />
        </linearGradient>
        <linearGradient id={`skin${uid}`} x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor={shade(look.skin, 12)} />
          <stop offset="100%" stopColor={skinShade} />
        </linearGradient>
        <linearGradient id={`eye${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={shade(look.eyeColor, -55)} />
          <stop offset="55%" stopColor={look.eyeColor} />
          <stop offset="100%" stopColor={shade(look.eyeColor, 55)} />
        </linearGradient>
        <linearGradient id={`fit${uid}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={shade(look.outfit, 28)} />
          <stop offset="100%" stopColor={look.outfit} />
        </linearGradient>
        <radialGradient id={`aura${uid}`} cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor={look.aura} stopOpacity="0.42" />
          <stop offset="100%" stopColor={look.aura} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`face${uid}`}>
          <path d="M50 24C64.5 24 73 34.5 73 49c0 12.5-6.5 23-15 29.2-2.9 2.1-5.7 3.3-8 3.3s-5.1-1.2-8-3.3C33.5 72 27 61.5 27 49 27 34.5 35.5 24 50 24Z" />
        </clipPath>
      </defs>

      <rect x="0" y="0" width="100" height="120" fill={`url(#aura${uid})`} />

      {/* задние волосы */}
      <BackHair look={look} uid={uid} />

      {/* тело */}
      <path
        d="M18 120c1.5-15 10-23.5 22.5-27l9.5 5 9.5-5C72 96.5 80.5 105 82 120Z"
        fill={`url(#fit${uid})`}
      />
      <path d="M40.5 93 50 105l9.5-12-4-2.2L50 97l-5.5-6.2Z" fill={look.outfitTrim} opacity="0.95" />
      <path d="M18 120c1-9.5 4.5-16.6 10.5-21l2.4 21Z" fill={look.outfitTrim} opacity="0.35" />
      <path d="M82 120c-1-9.5-4.5-16.6-10.5-21l-2.4 21Z" fill={look.outfitTrim} opacity="0.35" />

      {/* шея */}
      <path d="M43 74h14v13c0 3.5-3.2 5.5-7 5.5s-7-2-7-5.5Z" fill={skinShade} />

      {/* голова */}
      <path
        d="M50 24C64.5 24 73 34.5 73 49c0 12.5-6.5 23-15 29.2-2.9 2.1-5.7 3.3-8 3.3s-5.1-1.2-8-3.3C33.5 72 27 61.5 27 49 27 34.5 35.5 24 50 24Z"
        fill={`url(#skin${uid})`}
      />
      <ellipse cx="27.6" cy="53.5" rx="3" ry="4.4" fill={skinShade} />
      <ellipse cx="72.4" cy="53.5" rx="3" ry="4.4" fill={skinShade} />

      {/* румянец */}
      <ellipse cx="36.5" cy="63.5" rx="5.2" ry="2.6" fill="#ff8fa3" opacity="0.28" />
      <ellipse cx="63.5" cy="63.5" rx="5.2" ry="2.6" fill="#ff8fa3" opacity="0.28" />

      {/* глаза */}
      {[
        { cx: 40.2, sign: 1 },
        { cx: 59.8, sign: -1 },
      ].map((e, i) => (
        <g key={i}>
          <ellipse cx={e.cx} cy={56.5} rx={6.4} ry={6 * eyeSquash} fill="#fff" opacity="0.94" />
          <ellipse cx={e.cx} cy={56.8} rx={4.7} ry={5.4 * eyeSquash} fill={`url(#eye${uid})`} />
          <ellipse cx={e.cx} cy={57.4} rx={2.1} ry={3 * eyeSquash} fill="#1a1024" />
          <circle cx={e.cx - 1.7 * e.sign} cy={54.2} r={1.7} fill="#fff" />
          <circle cx={e.cx + 1.9 * e.sign} cy={59.3} r={0.9} fill="#fff" opacity="0.75" />
          <path
            d={`M${e.cx - 7} ${52.6} q ${7 * 1} ${-3.6} ${13.4} ${1.4}`}
            transform={e.sign === 1 ? undefined : `translate(${-0.4})`}
            stroke={hairDark}
            strokeWidth="2.6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={`M${e.cx - 6.4} ${browY} q 6.4 ${-2.6 - browTilt} 12.8 ${e.sign === 1 ? -0.4 : -0.4}`}
            stroke={hairDark}
            strokeWidth="1.7"
            strokeLinecap="round"
            fill="none"
            opacity="0.9"
            transform={`rotate(${e.sign * browTilt} ${e.cx} ${browY})`}
          />
        </g>
      ))}

      {/* нос и рот */}
      <path d="M50 64.5c.9.6 1.6.9 1.6 1.4" stroke={shade(look.skin, -60)} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6" />
      <path
        d={`M46.6 70.5 Q50 ${70.5 + mouthCurve} 53.4 70.5`}
        stroke="#c2506a"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* передние волосы */}
      <FrontHair look={look} uid={uid} />

      {/* аксессуар */}
      <Accessory look={look} uid={uid} />
    </svg>
  );
}

function BackHair({ look, uid }: { look: Appearance; uid: string }) {
  const fill = `url(#hair${uid})`;
  const style = look.hair;
  const dark = shade(look.hairColor, -45);

  switch (style) {
    case 'short':
      return <path d="M28 50c0-16 9-26 22-26s22 10 22 26c0 9-2 16-4 21l-3-24H35l-3 24c-2-5-4-12-4-21Z" fill={dark} />;
    case 'bob':
      return <path d="M25 52c0-18 10-29 25-29s25 11 25 29c0 12-2 22-4 30l-6-3 1-30H34l1 30-6 3c-2-8-4-18-4-30Z" fill={fill} />;
    case 'buns':
      return (
        <g>
          <path d="M26 52c0-18 10-29 24-29s24 11 24 29c0 10-2 18-4 25l-5-3 1-28H34l1 28-5 3c-2-7-4-15-4-25Z" fill={fill} />
          <circle cx="24" cy="30" r="10" fill={fill} />
          <circle cx="76" cy="30" r="10" fill={fill} />
          <circle cx="24" cy="30" r="5" fill={dark} opacity="0.35" />
          <circle cx="76" cy="30" r="5" fill={dark} opacity="0.35" />
        </g>
      );
    case 'twin':
      return (
        <g>
          <path d="M26 52c0-18 10-29 24-29s24 11 24 29c0 12-2 22-4 30l-6-3 1-30H35l1 30-6 3c-2-8-4-18-4-30Z" fill={fill} />
          <path d="M22 38c-8 3-12 14-11 30 1 14 4 24 8 30l11-4c-5-9-8-21-7-33 .6-9 2.4-16 5-21Z" fill={fill} />
          <path d="M78 38c8 3 12 14 11 30-1 14-4 24-8 30l-11-4c5-9 8-21 7-33-.6-9-2.4-16-5-21Z" fill={fill} />
        </g>
      );
    case 'ponytail':
      return (
        <g>
          <path d="M27 52c0-18 10-29 23-29s23 11 23 29c0 11-2 20-4 27l-5-3 1-27H35l1 27-5 3c-2-7-5-16-5-27Z" fill={fill} />
          <path d="M70 34c11 2 18 12 20 27 2 16-2 32-9 45l-13-6c7-11 10-24 8-36-1.6-9.6-4-16.4-6-22Z" fill={fill} />
        </g>
      );
    case 'braid':
      return (
        <g>
          <path d="M26 52c0-18 10-29 24-29s24 11 24 29c0 11-2 20-4 27l-5-3 1-27H35l1 27-5 3c-2-7-6-16-6-27Z" fill={fill} />
          <path d="M69 66c6 6 9 16 8 28l-9 22-9-3 8-21c1-9 .3-17-3-23Z" fill={fill} />
          <path d="M65 72c3 3 5 7 5 12m-5 4c3 3 4 7 4 11" stroke={dark} strokeWidth="1.6" fill="none" opacity="0.55" />
        </g>
      );
    case 'wavy':
      return (
        <path
          d="M24 52c0-19 11-30 26-30s26 11 26 30c0 16-3 30-7 42-3 9-8 14-14 16l-4-8c5-2 8-6 9-13 1-9 1-20 0-31H40c-1 11-1 22 0 31 1 7 4 11 9 13l-4 8c-6-2-11-7-14-16-4-12-7-26-7-42Z"
          fill={fill}
        />
      );
    case 'long':
    default:
      return (
        <path
          d="M24 52c0-19 11-30 26-30s26 11 26 30c0 18-3 34-6 48l-11-3 2-46H37l2 46-11 3c-3-14-4-30-4-48Z"
          fill={fill}
        />
      );
  }
}

function FrontHair({ look, uid }: { look: Appearance; uid: string }) {
  const fill = `url(#hair${uid})`;
  const light = look.hairColor2;
  const bangs: Record<Appearance['hair'], string> = {
    long: 'M27 48c0-15 10-25 23-25s23 10 23 25c0 3-.4 6-1 8-1.6-8-4-13-7-16-4 5-10 8-18 8-6 0-10-1-13-3-3 2.4-5 6-6 11-.6-2.4-1-5-1-8Z',
    wavy: 'M26 48c0-16 11-26 24-26s24 10 24 26c0 3-.4 6-1 8-2-9-5-14-9-17-3 6-9 9-17 9-6 0-11-1.5-14-4-3 2.6-5 6.6-6 12-.6-2.4-1-5.4-1-8Z',
    twin: 'M27 48c0-15 10-25 23-25s23 10 23 25c0 3-.4 6-1 8-2-8-4.6-13-8-16-4 5-9 8-17 8-6 0-10-1-13-3-3 2.4-5 6-6 11-.6-2.4-1-5-1-8Z',
    bob: 'M26 48c0-16 10-26 24-26s24 10 24 26c0 3-.4 6-1 8-2-9-5-14-9-17-4 5-10 8-18 8-5 0-9-1-12-3-3 2.4-6 6.6-7 12-.6-2.4-1-5.4-1-8Z',
    ponytail: 'M28 48c0-15 10-25 22-25s22 10 22 25c0 3-.4 6-1 8-2-8-4-13-7-16-4 5-10 8-18 8-5 0-9-1-12-3-3 2.4-5 6-6 11-.6-2.4-1-5-1-8Z',
    braid: 'M27 48c0-15 10-25 23-25s23 10 23 25c0 3-.4 6-1 8-1.6-8-4-13-7-16-4 5-10 8-18 8-6 0-10-1-13-3-3 2.4-5 6-6 11-.6-2.4-1-5-1-8Z',
    short: 'M28 48c0-15 9-25 22-25s22 10 22 25c0 3-.4 6-1 8-2-8-4-13-7-16-4 5-10 8-18 8-5 0-9-1-12-3-3 2.4-5 6-6 11-.6-2.4-1-5-1-8Z',
    buns: 'M28 48c0-15 10-25 22-25s22 10 22 25c0 3-.4 6-1 8-2-8-4-13-7-16-4 5-10 8-18 8-5 0-9-1-12-3-3 2.4-5 6-6 11-.6-2.4-1-5-1-8Z',
  };
  return (
    <g>
      <path d={bangs[look.hair]} fill={fill} />
      {/* боковые пряди */}
      <path d="M28.5 44c-2 5-3 12-3 20 0 6 .6 11 1.6 15l4.4-1.6c-1.2-4-1.8-9-1.8-15 0-7 .6-13 1.8-17Z" fill={fill} />
      <path d="M71.5 44c2 5 3 12 3 20 0 6-.6 11-1.6 15l-4.4-1.6c1.2-4 1.8-9 1.8-15 0-7-.6-13-1.8-17Z" fill={fill} />
      {/* блик */}
      <path d="M35 33c4-4 9-6 15-6" stroke={light} strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.75" />
      <path d="M58 29c4 1.4 7 3.6 9 6.6" stroke={light} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
    </g>
  );
}

function Accessory({ look, uid }: { look: Appearance; uid: string }) {
  const trim = look.outfitTrim;
  const fill = `url(#hair${uid})`;
  switch (look.accessory) {
    case 'horns':
      return (
        <g fill={trim}>
          <path d="M31 28c-4-5-9-8-13-8 2 6 5 11 10 14Z" />
          <path d="M69 28c4-5 9-8 13-8-2 6-5 11-10 14Z" />
        </g>
      );
    case 'halo':
      return (
        <g>
          <ellipse cx="50" cy="15" rx="16" ry="4.4" fill="none" stroke={trim} strokeWidth="2.6" opacity="0.9" />
          <ellipse cx="50" cy="15" rx="16" ry="4.4" fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.55" />
        </g>
      );
    case 'ears':
      return (
        <g fill={fill}>
          <path d="M32 26c-2-8-1-14 1-16 3 2 7 6 9 12Z" />
          <path d="M68 26c2-8 1-14-1-16-3 2-7 6-9 12Z" />
          <path d="M34 24c-1-5-.6-9 .4-10.4 1.8 1.4 3.8 3.8 5 7.4Z" fill="#ff9ecd" opacity="0.8" />
          <path d="M66 24c1-5 .6-9-.4-10.4-1.8 1.4-3.8 3.8-5 7.4Z" fill="#ff9ecd" opacity="0.8" />
        </g>
      );
    case 'crown':
      return (
        <g fill={trim}>
          <path d="M34 22 38 12l6 7 6-9 6 9 6-7 4 10Z" />
          <circle cx="50" cy="12" r="2" fill="#fff" opacity="0.85" />
        </g>
      );
    case 'visor':
      return (
        <g>
          <path d="M26 46h48v3.6H26Z" fill={trim} opacity="0.9" />
          <path d="M26 46c0-2.5 10-5 24-5s24 2.5 24 5Z" fill={trim} opacity="0.5" />
        </g>
      );
    case 'hairpin':
      return (
        <g>
          <path d="M66 34l9-3-1.6 5.4L78 40l-9 1-2 5-2-5.6Z" fill={trim} />
          <circle cx="70" cy="38" r="1.6" fill="#fff" opacity="0.8" />
        </g>
      );
    case 'veil':
      return (
        <g>
          <path d="M25 44c6-9 14-13 25-13s19 4 25 13l-3 2c-6-7-13-10-22-10s-16 3-22 10Z" fill={trim} opacity="0.75" />
          <path d="M24 46h52v2.4H24Z" fill={trim} opacity="0.35" />
        </g>
      );
    default:
      return null;
  }
}

export const Portrait = memo(PortraitBase);
export default Portrait;
