import { useEffect, useState } from 'react';

/** Тикающий счётчик — для живых таймеров (AFK, билеты арены) */
export function useTicker(ms = 1000): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setT((x) => x + 1), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return t;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} ч ${m.toString().padStart(2, '0')} м`;
  if (m > 0) return `${m} м ${sec.toString().padStart(2, '0')} с`;
  return `${sec} с`;
}
