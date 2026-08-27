import { useEffect } from 'react';
import { useGame } from './game/state/store';
import TitleScreen from './ui/screens/TitleScreen';
import DungeonScreen from './ui/screens/DungeonScreen';
import DuelScreen from './ui/screens/DuelScreen';
import {
  EndScreen,
  FindScreen,
  OmenScreen,
  RestScreen,
  RewardScreen,
  TradeScreen,
} from './ui/screens/NodeScreens';

export default function App() {
  const ready = useGame((s) => s.ready);
  const boot = useGame((s) => s.boot);
  const scene = useGame((s) => s.scene);

  useEffect(() => {
    void boot();
  }, [boot]);

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-[520px] flex-col overflow-hidden bg-canvas">
      {!ready ? (
        <div className="grid h-full place-items-center text-[13px] text-ink-500">Дорога просыпается…</div>
      ) : scene.s === 'title' ? (
        <TitleScreen />
      ) : scene.s === 'dungeon' ? (
        <DungeonScreen />
      ) : scene.s === 'duel' ? (
        <DuelScreen />
      ) : scene.s === 'reward' ? (
        <RewardScreen />
      ) : scene.s === 'rest' ? (
        <RestScreen />
      ) : scene.s === 'find' ? (
        <FindScreen />
      ) : scene.s === 'trade' ? (
        <TradeScreen />
      ) : scene.s === 'omen' ? (
        <OmenScreen />
      ) : scene.s === 'victory' ? (
        <EndScreen win />
      ) : (
        <EndScreen win={false} />
      )}
    </div>
  );
}
