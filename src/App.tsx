import { useEffect } from 'react';
import { useGame } from './game/state/store';
import TopBar from './ui/components/TopBar';
import BottomNav from './ui/components/BottomNav';
import Toasts from './ui/components/Toasts';
import CampaignScreen from './ui/screens/CampaignScreen';
import HeroesScreen from './ui/screens/HeroesScreen';
import SummonScreen from './ui/screens/SummonScreen';
import TowerScreen from './ui/screens/TowerScreen';
import ArenaScreen from './ui/screens/ArenaScreen';
import HeroScreen from './ui/screens/HeroScreen';
import BattleScreen from './ui/screens/BattleScreen';
import SummonResults from './ui/components/SummonResults';

const BG: Record<string, [string, string]> = {
  campaign: ['#fbe9ff', '#f1edfa'],
  heroes: ['#e8f2ff', '#f1edfa'],
  summon: ['#ffe9f6', '#f1edfa'],
  tower: ['#ece7ff', '#f1edfa'],
  arena: ['#ffe9ec', '#f1edfa'],
  hero: ['#efeaff', '#f1edfa'],
};

export default function App() {
  const ready = useGame((s) => s.ready);
  const init = useGame((s) => s.init);
  const screen = useGame((s) => s.screen);
  const battle = useGame((s) => s.battle);
  const summonResults = useGame((s) => s.summonResults);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    const save = () => useGame.getState().persist();
    window.addEventListener('visibilitychange', save);
    window.addEventListener('pagehide', save);
    return () => {
      window.removeEventListener('visibilitychange', save);
      window.removeEventListener('pagehide', save);
    };
  }, []);

  const bg = BG[screen] ?? BG.campaign;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#e6e1f3]">
      <div
        className="relative flex h-full w-full max-w-[480px] flex-col overflow-hidden sm:h-[100dvh] sm:rounded-none"
        style={{
          background: `radial-gradient(120% 70% at 50% 0%, ${bg[0]} 0%, ${bg[1]} 58%, #f7f5fc 100%)`,
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-stars opacity-80" />
        <div
          className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(123,70,224,0.28), transparent 70%)' }}
        />

        {!ready ? (
          <Splash />
        ) : (
          <>
            <TopBar />
            <main className="scroll-y relative z-10 flex-1 px-3 pb-2">
              {screen === 'campaign' && <CampaignScreen />}
              {screen === 'heroes' && <HeroesScreen />}
              {screen === 'summon' && <SummonScreen />}
              {screen === 'tower' && <TowerScreen />}
              {screen === 'arena' && <ArenaScreen />}
              {screen === 'hero' && <HeroScreen />}
            </main>
            <BottomNav />
          </>
        )}

        {battle && <BattleScreen />}
        {summonResults && <SummonResults />}
        <Toasts />
      </div>
    </div>
  );
}

function Splash() {
  return (
    <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4">
      <div className="relative h-24 w-24">
        <div className="absolute inset-0 animate-spinSlow rounded-full border-2 border-dashed border-neon-violet/50" />
        <div className="absolute inset-3 rounded-full bg-gradient-to-br from-neon-pink via-neon-violet to-neon-cyan opacity-70 blur-[2px]" />
        <div className="absolute inset-5 rounded-full bg-paper" />
      </div>
      <div className="text-center">
        <h1 className="font-display text-xl font-extrabold tracking-[0.22em] text-ink-900">ЭКЛИПС</h1>
        <p className="mt-1 text-xs uppercase tracking-[0.3em] text-ink-400">Дочери Затмения</p>
      </div>
    </div>
  );
}
