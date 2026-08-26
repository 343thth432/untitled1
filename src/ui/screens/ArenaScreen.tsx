import { useMemo } from 'react';
import { useGame, arenaTickets, formatPower, teamPowerOf, type ArenaOpponent } from '../../game/state/store';
import { arenaTeam } from '../../game/engine/units';
import { Pill, Section } from '../components/Bits';
import Avatar from '../components/Avatar';
import { ShopItem } from './TowerScreen';
import { useTicker, formatDuration } from '../hooks';

const TIERS: { min: number; name: string; color: string }[] = [
  { min: 2200, name: 'Затмение', color: '#ff5ea8' },
  { min: 1800, name: 'Алмаз', color: '#7ef9ff' },
  { min: 1500, name: 'Платина', color: '#c8d6ff' },
  { min: 1250, name: 'Золото', color: '#ffc857' },
  { min: 1050, name: 'Серебро', color: '#c0c8d8' },
  { min: 0, name: 'Бронза', color: '#c58a5a' },
];

export default function ArenaScreen() {
  useTicker(1000);
  const arena = useGame((s) => s.arena);
  const ops = useGame((s) => s.arenaOpponents);
  const glory = useGame((s) => s.res.glory);
  const refresh = useGame((s) => s.refreshArena);
  const fight = useGame((s) => s.beginArena);
  const grant = useGame((s) => s.grant);
  const spend = useGame((s) => s.spend);
  const toast = useGame((s) => s.toast);
  const power = useGame(teamPowerOf);
  const tickets = useGame(arenaTickets);

  const tier = TIERS.find((t) => arena.points >= t.min) ?? TIERS[TIERS.length - 1];
  const total = arena.wins + arena.losses;
  const winrate = total ? Math.round((arena.wins / total) * 100) : 0;

  return (
    <div className="pb-2">
      <div className="panel relative mb-3 overflow-hidden rounded-2xl p-3">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #ffe0ea, #f8f1fb 68%)' }} />
        <div className="absolute inset-0 bg-stars opacity-50" />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-display text-[11px] uppercase tracking-[0.26em] text-ink-500">Сезон {arena.season}</div>
              <h1 className="font-display text-xl font-bold text-ink-900">Арена Затмения</h1>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="chip border" style={{ color: tier.color, borderColor: `${tier.color}66`, background: `${tier.color}1a` }}>
                  🏆 {tier.name}
                </span>
                <Pill>{`${arena.points} очков`}</Pill>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-ink-400">Билеты</div>
              <div className="font-display text-xl font-bold text-neon-cyan">{tickets.count}/5</div>
              {tickets.nextIn > 0 && (
                <div className="text-[10px] text-ink-400">+1 через {formatDuration(tickets.nextIn / 1000)}</div>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
            <Stat label="Победы" value={String(arena.wins)} color="#7dff9c" />
            <Stat label="Поражения" value={String(arena.losses)} color="#ff6f8f" />
            <Stat label="Винрейт" value={`${winrate}%`} color="#ffc857" />
          </div>

          <div className="mt-2 flex items-center justify-between rounded-xl bg-ink-900/[0.05] px-2.5 py-1.5">
            <span className="text-[11px] text-ink-500">Сила вашего отряда</span>
            <span className="font-display text-sm font-bold text-ink-900">{formatPower(power)}</span>
          </div>
        </div>
      </div>

      <Section
        title="Соперники"
        right={
          <button type="button" onClick={() => refresh(true)} className="text-[11px] font-semibold text-neon-cyan">
            ↻ Обновить
          </button>
        }
      >
        <div className="space-y-2">
          {ops.map((op) => (
            <OpponentRow key={op.seed} op={op} myPower={power} tickets={tickets.count} onFight={() => fight(op)} />
          ))}
        </div>
      </Section>

      <Section title="Лавка Славы" right={<Pill>{`🏵️ ${glory}`}</Pill>}>
        <div className="grid grid-cols-3 gap-2">
          <ShopItem
            icon="📜"
            title="Свитки"
            sub="×4"
            price={240}
            currency="🏵️"
            can={glory >= 240}
            onBuy={() => {
              if (spend({ glory: 240 })) {
                grant({ scrolls: 4 });
                toast('+4 свитка', 'good', '📜');
              }
            }}
          />
          <ShopItem
            icon="💎"
            title="Кристаллы"
            sub="×400"
            price={400}
            currency="🏵️"
            can={glory >= 400}
            onBuy={() => {
              if (spend({ glory: 400 })) {
                grant({ gems: 400 });
                toast('+400 кристаллов', 'good', '💎');
              }
            }}
          />
          <ShopItem
            icon="🎁"
            title="Сундук"
            sub="2 предмета"
            price={300}
            currency="🏵️"
            can={glory >= 300}
            onBuy={() => {
              if (spend({ glory: 300 })) grant({ gear: 2 });
            }}
          />
        </div>
      </Section>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-ink-900/[0.05] py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-ink-400">{label}</div>
      <div className="font-display text-[15px] font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function OpponentRow({
  op,
  myPower,
  tickets,
  onFight,
}: {
  op: ArenaOpponent;
  myPower: number;
  tickets: number;
  onFight: () => void;
}) {
  const team = useMemo(() => arenaTeam(op.seed, op.mult, op.level), [op.seed, op.mult, op.level]);
  const diff = op.power / Math.max(1, myPower);
  const tone = diff <= 0.92 ? '#7dff9c' : diff <= 1.1 ? '#ffc857' : '#ff6f8f';

  return (
    <div className="panel flex items-center gap-2.5 rounded-2xl p-2.5">
      <div className="flex -space-x-2">
        {team.slice(0, 3).map((t, i) => (
          <div key={i} className="rounded-xl ring-1 ring-ink-900/10">
            <Avatar heroId={t.def.id} size={34} hideFrame framing="bust" />
          </div>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-[13px] font-semibold text-ink-900">{op.name}</div>
        <div className="flex items-center gap-2 text-[11px]">
          <span style={{ color: tone }}>{formatPower(op.power)}</span>
          <span className="text-ink-400">+{op.points} очков</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onFight}
        disabled={tickets <= 0}
        className="btn-primary px-3 py-1.5 text-[12px] disabled:opacity-40"
      >
        Бой
      </button>
    </div>
  );
}
