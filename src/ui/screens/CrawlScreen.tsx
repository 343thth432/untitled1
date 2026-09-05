import { useCallback, useMemo } from 'react';
import Crawl, { type CrawlState } from '../../dungeon/Crawl';
import { buildFloor, CELL, type Cell } from '../../dungeon/map';
import { currentLeg, foeScale, useGame } from '../../game/state/store';
import type { FloorId } from '../../game/types';

const STONE: Record<FloorId, Cell> = {
  crypt: CELL.brick,
  catacomb: CELL.rock,
  sanctum: CELL.moss,
};

/**
 * Экран вылазки — это только сама игра. Ни панелей, ни списков, ни
 * подписей вокруг кадра: жизни, патроны и ярус нарисованы внутри него
 * полупрозрачными, а ствол в руках виден и так — он теперь один.
 */
export default function CrawlScreen() {
  const run = useGame((s) => s.run);
  const sync = useGame((s) => s.sync);
  const goDown = useGame((s) => s.descend);
  const die = useGame((s) => s.die);
  const abandon = useGame((s) => s.abandon);

  const leg = run ? currentLeg(run) : null;
  const floor = useMemo(() => (leg ? buildFloor(leg.seed, STONE[leg.tier], leg.plan) : null), [leg]);
  const start = useMemo(
    () => (run ? { hp: run.hp, maxHp: run.maxHp, ammo: run.ammo, weapon: run.weapon } : null),
    [run],
  );

  const onState = useCallback((s: CrawlState) => sync(s), [sync]);
  const onDescend = useCallback((s: CrawlState) => goDown(s), [goDown]);
  const onDeath = useCallback(() => die(), [die]);

  if (!run || !leg || !floor || !start) return null;

  return (
    <Crawl
      floor={floor}
      palette={leg.tier}
      floorName={leg.name}
      scale={foeScale(run)}
      start={start}
      onState={onState}
      onDescend={onDescend}
      onDeath={onDeath}
      onQuit={abandon}
      className="h-full"
    />
  );
}
