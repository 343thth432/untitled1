import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { HEROES } from '../game/data/heroes';
import { drawPortrait, DW, DH } from '../art/illustration/portrait';
import type { HeroDef } from '../game/types';

declare global {
  interface Window {
    exportPortraits?: (size: number) => Record<string, string>;
    exportPortraitsJpeg?: (size: number) => Record<string, string>;
  }
}

window.exportPortraitsJpeg = (size = 360) => {
  const out: Record<string, string> = {};
  for (const h of HEROES) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = Math.round((size * DH) / DW);
    const ctx = c.getContext('2d');
    if (!ctx) continue;
    drawPortrait(ctx, h.look, h.id, c.width, c.height);
    out[h.id] = c.toDataURL('image/jpeg', 0.84);
  }
  return out;
};

window.exportPortraits = (size = 420) => {
  const out: Record<string, string> = {};
  for (const h of HEROES) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = Math.round((size * DH) / DW);
    const ctx = c.getContext('2d');
    if (!ctx) continue;
    drawPortrait(ctx, h.look, h.id, c.width, c.height);
    out[h.id] = c.toDataURL('image/png');
  }
  return out;
};

function Card({ h, w = 300 }: { h: HeroDef; w?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    c.width = w * 2;
    c.height = Math.round((w * DH) / DW) * 2;
    drawPortrait(ctx, h.look, h.id, c.width, c.height);
  }, [h, w]);
  return (
    <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 6px 18px -10px #000' }}>
      <canvas ref={ref} style={{ width: '100%', display: 'block' }} />
      <div style={{ padding: '6px 8px', font: '600 12px/1.3 sans-serif', color: '#241c3a' }}>
        {h.name} · {h.look.hair} · {h.look.outfitStyle}
      </div>
    </div>
  );
}

function Sheet() {
  return (
    <div style={{ background: '#eee9f6', minHeight: '100vh', padding: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {HEROES.map((h) => (
          <Card key={h.id} h={h} />
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sheet />
  </React.StrictMode>,
);
