import { useMemo } from 'react';
import { useGame, afkSeconds, formatPower, teamPowerOf } from '../../game/state/store';
import { stageInfo, STAGES_PER_CHAPTER, TOTAL_STAGES, CHAPTERS } from '../../game/data/campaign';
import { afkAccrued, AFK_CAP_HOURS, commanderLevel, heroLevelCap } from '../../game/engine/progression';
import { campaignTeam, specPower } from '../../game/engine/units';
import Avatar from '../components/Avatar';
import { Bar, Section, Pill } from '../components/Bits';
import { useTicker, formatDuration } from '../hooks';
import { compact } from '../components/TopBar';

export default function CampaignScreen() {
  useTicker(1000);
  const stage = useGame((s) => s.stage);
  const team = useGame((s) => s.team);
  const heroes = useGame((s) => s.heroes);
  const tower = useGame((s) => s.tower);
  const power = useGame(teamPowerOf);
  const begin = useGame((s) => s.beginCampaign);
  const collect = useGame((s) => s.collectAfk);
  const quick = useGame((s) => s.quickAfk);
  const quickState = useGame((s) => s.quick);
  const go = useGame((s) => s.go);

  const info = stageInfo(stage);
  const done = stage >= TOTAL_STAGES;
  const seconds = useGame(afkSeconds);
  const accrued = afkAccrued(stage, seconds);
  const foes = useMemo(() => campaignTeam(Math.min(stage, TOTAL_STAGES - 1)), [stage]);
  const foePower = useMemo(() => foes.reduce((a, f) => a + specPower(f), 0), [foes]);
  const cmd = commanderLevel(stage, tower.best);
  const cap = heroLevelCap(cmd);
  const chapterProgress = (info.stage - 1) / STAGES_PER_CHAPTER;
  const advantage = power / Math.max(1, foePower);

  return (
    <div className="pb-2">
      {/* Баннер главы */}
      <div
        className="panel relative mb-3 overflow-hidden rounded-2xl p-3"
        style={{ background: `linear-gradient(150deg, ${info.chapter.bg[0]}, ${info.chapter.bg[1]})` }}
      >
        <div className="absolute inset-0 bg-stars opacity-50" />
        <div
          className="absolute -right-10 -top-12 h-40 w-40 rounded-full blur-2xl"
          style={{ background: `radial-gradient(circle, ${info.chapter.accent}55, transparent 70%)` }}
        />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-display text-[11px] uppercase tracking-[0.24em] text-white/50">
                Глава {info.chapter.id} · {info.label}
              </div>
              <h1 className="mt-0.5 font-display text-xl font-bold text-white">{info.chapter.name}</h1>
              <p className="text-[12px] text-white/50">{done ? 'Кампания пройдена' : info.chapter.subtitle}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {info.boss && <Pill tone="bad">Босс</Pill>}
              {info.elite && <Pill tone="gold">Элита</Pill>}
              <Pill>{`Ранг ${cmd}`}</Pill>
            </div>
          </div>

          <div className="mt-3">
            <Bar value={chapterProgress * 100} max={100} color={info.chapter.accent} height={5} glow />
            <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-white/40">
              <span>Этап {info.stage} / {STAGES_PER_CHAPTER}</span>
              <span>Предел уровня: {cap}</span>
            </div>
          </div>

          {/* Враги */}
          <div className="mt-3 flex items-end justify-between gap-2">
            <div className="flex -space-x-2">
              {foes.slice(0, 5).map((f, i) => (
                <div key={i} className="rounded-xl ring-1 ring-black/40">
                  <Avatar heroId={f.def.id} size={38} hideFrame fierce dim={done} />
                </div>
              ))}
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-white/40">Сила врага</div>
              <div
                className="font-display text-sm font-bold"
                style={{ color: advantage >= 1.15 ? '#7dff9c' : advantage >= 0.85 ? '#ffc857' : '#ff6f8f' }}
              >
                {formatPower(foePower)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={begin}
            disabled={done}
            className="btn-primary mt-3 w-full disabled:opacity-40"
          >
            {done ? 'Все главы пройдены' : `В бой · ${info.label}`}
          </button>
          <div className="mt-1.5 text-center text-[10px] text-white/35">
            {advantage >= 1.15
              ? 'Перевес на вашей стороне'
              : advantage >= 0.85
                ? 'Силы примерно равны'
                : 'Врагов лучше сначала перерасти'}
          </div>
        </div>
      </div>

      {/* AFK-сундук */}
      <Section title="Награды простоя" right={<Pill>{`Лимит ${AFK_CAP_HOURS} ч`}</Pill>}>
        <div className="panel rounded-2xl p-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/25 to-amber-900/10 text-2xl">
              <span className={accrued.capped ? 'animate-floaty' : ''}>📦</span>
              {accrued.capped && (
                <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1 text-[9px] font-bold">MAX</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm font-semibold text-white">
                Накоплено за {formatDuration(seconds)}
              </div>
              <div className="mt-1 grid grid-cols-4 gap-1 text-[11px]">
                <Res icon="🪙" v={accrued.gold} />
                <Res icon="📘" v={accrued.exp} />
                <Res icon="✨" v={accrued.dust} />
                <Res icon="💎" v={accrued.gems} />
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={collect} className="btn-gold flex-1 py-2 text-sm">
              Забрать
            </button>
            <button type="button" onClick={quick} className="btn-ghost px-3 py-2 text-sm">
              ⚡ Быстро{quickState.used < 3 ? ` (${3 - quickState.used})` : ' 120💎'}
            </button>
          </div>
        </div>
      </Section>

      {/* Отряд */}
      <Section
        title="Отряд"
        right={
          <button type="button" onClick={() => go('heroes')} className="text-[11px] font-semibold text-neon-cyan">
            Изменить →
          </button>
        }
      >
        <div className="panel flex items-center justify-between gap-1.5 rounded-2xl p-2.5">
          {team.map((id, i) => (
            <div key={i} className="flex-1">
              {id && heroes[id] ? (
                <Avatar
                  heroId={id}
                  fluid
                  stars={heroes[id].stars}
                  level={heroes[id].level}
                  onClick={() => useGame.getState().openHero(id)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => go('heroes')}
                  className="flex aspect-[1/1.18] w-full items-center justify-center rounded-2xl border border-dashed border-white/15 text-white/25"
                >
                  +
                </button>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Главы */}
      <Section title="Главы">
        <div className="grid grid-cols-2 gap-2">
          {CHAPTERS.map((c) => {
            const clearedInCh = Math.max(0, Math.min(STAGES_PER_CHAPTER, stage - (c.id - 1) * STAGES_PER_CHAPTER));
            const locked = stage < (c.id - 1) * STAGES_PER_CHAPTER;
            return (
              <div
                key={c.id}
                className="panel relative overflow-hidden rounded-xl p-2.5"
                style={{ opacity: locked ? 0.45 : 1 }}
              >
                <div
                  className="absolute inset-0"
                  style={{ background: `linear-gradient(150deg, ${c.bg[0]}, ${c.bg[1]})`, opacity: 0.85 }}
                />
                <div className="relative">
                  <div className="font-display text-[10px] uppercase tracking-widest text-white/40">Глава {c.id}</div>
                  <div className="truncate font-display text-[13px] font-semibold text-white">{c.name}</div>
                  <div className="mt-1.5">
                    <Bar value={clearedInCh} max={STAGES_PER_CHAPTER} color={c.accent} height={4} />
                  </div>
                  <div className="mt-1 text-[10px] text-white/40">
                    {locked ? 'Закрыто' : `${clearedInCh}/${STAGES_PER_CHAPTER}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function Res({ icon, v }: { icon: string; v: number }) {
  return (
    <div className="flex items-center gap-1 rounded-md bg-white/[0.05] px-1 py-0.5">
      <span>{icon}</span>
      <span className="font-display font-semibold text-white/80">{compact(v)}</span>
    </div>
  );
}
