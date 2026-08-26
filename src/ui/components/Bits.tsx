import type { ReactNode } from 'react';
import type { Faction, Rarity, Role } from '../../game/types';
import { FACTIONS, RARITY, ROLES } from '../../game/data/factions';

export function StarRow({ stars, size = 10 }: { stars: number; size?: number }) {
  return (
    <div className="flex items-center gap-[1px]">
      {Array.from({ length: stars }).map((_, i) => (
        <span key={i} style={{ fontSize: size, lineHeight: 1 }} className="text-amber-300 drop-shadow">
          ★
        </span>
      ))}
    </div>
  );
}

export function FactionDot({ faction, size = 18 }: { faction: Faction; size?: number }) {
  const f = FACTIONS[faction];
  return (
    <span
      className="inline-flex items-center justify-center rounded-full border border-ink-900/15"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.55,
        background: `radial-gradient(circle at 30% 25%, ${f.color}cc, ${f.color}33)`,
        boxShadow: `0 0 8px ${f.glow}`,
      }}
    >
      {f.icon}
    </span>
  );
}

export function RoleChip({ role }: { role: Role }) {
  const r = ROLES[role];
  return (
    <span className="chip bg-ink-900/[0.06] border border-ink-900/[0.08]" style={{ color: r.color }}>
      <span>{r.icon}</span>
      {r.name}
    </span>
  );
}

export function RarityChip({ rarity }: { rarity: Rarity }) {
  const r = RARITY[rarity];
  return (
    <span className="chip" style={{ color: r.color, background: `${r.color}1f`, border: `1px solid ${r.color}55` }}>
      {r.name}
    </span>
  );
}

export function Bar({
  value,
  max,
  color,
  bg = 'rgba(255,255,255,0.09)',
  height = 6,
  className = '',
  glow,
}: {
  value: number;
  max: number;
  color: string;
  bg?: string;
  height?: number;
  className?: string;
  glow?: boolean;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`w-full overflow-hidden rounded-full ${className}`} style={{ height, background: bg }}>
      <div
        className="hp-bar h-full rounded-full"
        style={{ width: `${pct}%`, background: color, boxShadow: glow ? `0 0 8px ${color}` : undefined }}
      />
    </div>
  );
}

export function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-4">
      <header className="mb-2 flex items-end justify-between px-1">
        <h2 className="font-display text-[13px] font-semibold uppercase tracking-[0.18em] text-ink-500">{title}</h2>
        {right}
      </header>
      {children}
    </section>
  );
}

export function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="panel flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="text-3xl opacity-70">{icon}</span>
      <p className="text-sm text-ink-500">{text}</p>
    </div>
  );
}

export function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'good' | 'bad' | 'gold' }) {
  const tones = {
    default: 'bg-ink-900/[0.06] text-ink-600 border-ink-900/[0.08]',
    good: 'bg-emerald-400/15 text-emerald-200 border-emerald-300/25',
    bad: 'bg-rose-500/15 text-rose-200 border-rose-400/25',
    gold: 'bg-amber-400/15 text-amber-200 border-amber-300/25',
  } as const;
  return <span className={`chip border ${tones[tone]}`}>{children}</span>;
}
