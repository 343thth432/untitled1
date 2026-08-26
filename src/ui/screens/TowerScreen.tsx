import { useGame, towerMods, formatPower } from '../../game/state/store';
import { BUFF_BY_ID, TOWER_BUFFS, towerReward } from '../../game/data/tower';
import { specPower, towerTeam } from '../../game/engine/units';
import { heroDef } from '../../game/data/heroes';
import { Bar, Empty, Pill, Section } from '../components/Bits';
import Avatar from '../components/Avatar';
import { useMemo } from 'react';

const TIER_COLOR = { common: '#8aa0c0', rare: '#7ec8ff', epic: '#ff8fd0' } as const;

export default function TowerScreen() {
  const tower = useGame((s) => s.tower);
  const heroes = useGame((s) => s.heroes);
  const echo = useGame((s) => s.res.echo);
  const start = useGame((s) => s.startTowerRun);
  const cont = useGame((s) => s.beginTowerFloor);
  const abandon = useGame((s) => s.abandonTower);
  const pick = useGame((s) => s.pickTowerBuff);
  const grant = useGame((s) => s.grant);
  const spend = useGame((s) => s.spend);
  const toast = useGame((s) => s.toast);

  const mods = useMemo(() => towerMods(tower.buffs), [tower.buffs]);
  const foes = useMemo(() => towerTeam(tower.floor), [tower.floor]);
  const foePower = foes.reduce((a, f) => a + specPower(f), 0);
  const reward = towerReward(tower.floor);

  return (
    <div className="pb-2">
      <div className="panel relative mb-3 overflow-hidden rounded-2xl p-3">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #2a1b5e, #0b0720)' }} />
        <div className="absolute inset-0 bg-stars opacity-50" />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-display text-[11px] uppercase tracking-[0.26em] text-white/50">Бесконечный режим</div>
              <h1 className="font-display text-xl font-bold text-white">Башня Эха</h1>
              <p className="text-[12px] text-white/50">Каждый этаж — новый бой и новый бафф</p>
            </div>
            <div className="text-right">
              <Pill tone="gold">{`🔮 ${echo}`}</Pill>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-white/40">Рекорд</div>
              <div className="font-display text-lg font-bold text-neon-cyan">{tower.best}</div>
            </div>
          </div>

          {tower.active ? (
            <>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40">Текущий этаж</div>
                  <div className="font-display text-3xl font-bold text-white">{tower.floor}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-white/40">Сила стража</div>
                  <div className="font-display text-sm font-bold text-white/85">{formatPower(foePower)}</div>
                  <div className="mt-0.5 text-[10px] text-white/40">
                    награда: 🔮{reward.echo} · 🪙{reward.gold} · 📘{reward.exp}
                  </div>
                </div>
              </div>

              <div className="mt-2 flex -space-x-2">
                {foes.map((f, i) => (
                  <div key={i} className="rounded-xl ring-1 ring-black/40">
                    <Avatar heroId={f.def.id} size={36} hideFrame fierce />
                  </div>
                ))}
              </div>

              {!tower.pendingDraft && (
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={cont} className="btn-primary flex-1 py-2.5 text-[13px]">
                    Штурмовать этаж {tower.floor}
                  </button>
                  <button type="button" onClick={abandon} className="btn-ghost px-3 py-2.5 text-[12px]">
                    Сдаться
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="mt-3">
              <p className="mb-2 text-[12px] leading-snug text-white/55">
                Отряд идёт вверх без лечения между этажами. После каждой победы вы выбираете один бафф из трёх —
                и он действует до конца забега. Поражение завершает забег, но рекорд и добыча остаются.
              </p>
              <button type="button" onClick={start} className="btn-primary w-full py-2.5">
                Начать новый забег
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Драфт */}
      {tower.pendingDraft && (
        <Section title="Выберите усиление">
          <div className="space-y-2">
            {tower.pendingDraft.map((id) => {
              const b = BUFF_BY_ID[id];
              if (!b) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => pick(id)}
                  className="w-full rounded-2xl border p-3 text-left transition-transform active:scale-[0.98]"
                  style={{
                    borderColor: `${TIER_COLOR[b.tier]}88`,
                    background: `linear-gradient(150deg, ${TIER_COLOR[b.tier]}22, rgba(10,8,20,0.92))`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{b.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-[13px] font-bold text-white">{b.name}</div>
                      <div className="text-[12px] text-white/60">{b.text}</div>
                    </div>
                    <span className="chip" style={{ color: TIER_COLOR[b.tier], background: `${TIER_COLOR[b.tier]}22` }}>
                      {b.tier === 'epic' ? 'эпик' : b.tier === 'rare' ? 'редк' : 'обыч'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {/* Активные баффы */}
      {tower.active && (
        <Section title={`Баффы забега (${tower.buffs.length})`}>
          {tower.buffs.length === 0 ? (
            <Empty icon="✨" text="Пока ни одного усиления — победите на первом этаже" />
          ) : (
            <div className="panel rounded-2xl p-2.5">
              <div className="flex flex-wrap gap-1.5">
                {tower.buffs.map((id, i) => {
                  const b = BUFF_BY_ID[id];
                  if (!b) return null;
                  return (
                    <span
                      key={i}
                      className="chip border"
                      style={{ color: TIER_COLOR[b.tier], borderColor: `${TIER_COLOR[b.tier]}55`, background: `${TIER_COLOR[b.tier]}18` }}
                    >
                      {b.icon} {b.name}
                    </span>
                  );
                })}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {Object.entries(mods).map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-white/[0.05] px-1.5 py-1 text-center">
                    <div className="text-[9px] uppercase tracking-wider text-white/40">{k}</div>
                    <div className="font-display text-[12px] font-bold text-neon-lime">
                      {v > 0 ? '+' : ''}
                      {v}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Состояние отряда */}
      {tower.active && (
        <Section title="Состояние отряда">
          <div className="panel space-y-1.5 rounded-2xl p-2.5">
            {tower.team.map((id) => {
              const frac = tower.hp[`a_${id}`] ?? 1;
              if (!heroes[id]) return null;
              return (
                <div key={id} className="flex items-center gap-2">
                  <Avatar heroId={id} size={30} hideFrame dim={frac <= 0.001} />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-white/70">{heroDef(id).name}</span>
                      <span className="text-white/45">{Math.round(frac * 100)}%</span>
                    </div>
                    <Bar value={frac * 100} max={100} color={frac > 0.5 ? '#7dff9c' : frac > 0.2 ? '#ffc857' : '#ff6f8f'} height={4} />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Лавка эха */}
      <Section title="Лавка Эха" right={<Pill>{`🔮 ${echo}`}</Pill>}>
        <div className="grid grid-cols-3 gap-2">
          <ShopItem
            icon="🎁"
            title="Сундук"
            sub="3 предмета"
            price={220}
            can={echo >= 220}
            onBuy={() => {
              if (spend({ echo: 220 })) grant({ gear: 3 });
            }}
          />
          <ShopItem
            icon="📜"
            title="Свитки"
            sub="×3"
            price={180}
            can={echo >= 180}
            onBuy={() => {
              if (spend({ echo: 180 })) {
                grant({ scrolls: 3 });
                toast('+3 свитка', 'good', '📜');
              }
            }}
          />
          <ShopItem
            icon="✨"
            title="Пыль"
            sub="×600"
            price={120}
            can={echo >= 120}
            onBuy={() => {
              if (spend({ echo: 120 })) {
                grant({ dust: 600 });
                toast('+600 пыли', 'good', '✨');
              }
            }}
          />
        </div>
      </Section>

      <Section title="Все усиления">
        <div className="panel grid grid-cols-2 gap-1.5 rounded-2xl p-2.5">
          {TOWER_BUFFS.map((b) => (
            <div key={b.id} className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-1.5 py-1">
              <span>{b.icon}</span>
              <div className="min-w-0">
                <div className="truncate text-[11px] font-semibold text-white/80">{b.name}</div>
                <div className="truncate text-[10px] text-white/40">{b.text}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function ShopItem({
  icon,
  title,
  sub,
  price,
  can,
  onBuy,
  currency = '🔮',
}: {
  icon: string;
  title: string;
  sub: string;
  price: number;
  can: boolean;
  onBuy: () => void;
  currency?: string;
}) {
  return (
    <button
      type="button"
      onClick={onBuy}
      disabled={!can}
      className="panel flex flex-col items-center gap-0.5 rounded-xl p-2.5 transition-transform active:scale-95 disabled:opacity-40"
    >
      <span className="text-xl">{icon}</span>
      <span className="font-display text-[11px] font-bold text-white">{title}</span>
      <span className="text-[10px] text-white/45">{sub}</span>
      <span className="mt-1 rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-semibold text-white/80">
        {currency} {price}
      </span>
    </button>
  );
}
