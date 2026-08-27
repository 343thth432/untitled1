import { useEffect } from 'react';
import { useGame } from './game/state/store';
import TitleScreen from './ui/screens/TitleScreen';
import CrawlScreen from './ui/screens/CrawlScreen';
import EndScreen from './ui/screens/EndScreen';

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
        <div className="grid h-full place-items-center text-[13px] text-ink-500">Затмение сгущается…</div>
      ) : scene.s === 'title' ? (
        <TitleScreen />
      ) : scene.s === 'crawl' ? (
        <CrawlScreen />
      ) : (
        <EndScreen win={scene.s === 'victory'} />
      )}
    </div>
  );
}
