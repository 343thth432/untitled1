import { useEffect, useState } from 'react';
import type { Appearance } from '../game/types';
import { drawPortrait, DW, DH } from './illustration/portrait';

const cache = new Map<string, string>();

/** Рисованная аватарка как data-URL. Один раз рисуется, дальше берётся из кэша. */
export function drawnAvatar(look: Appearance, id: string, width = 300): string {
  const key = `${id}|${width}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  let url = '';
  try {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = Math.round((width * DH) / DW);
    const ctx = c.getContext('2d');
    if (ctx) {
      drawPortrait(ctx, look, id, c.width, c.height);
      url = c.toDataURL('image/png');
    }
  } catch {
    url = '';
  }
  cache.set(key, url);
  return url;
}

export function peekDrawnAvatar(id: string, width = 300): string | undefined {
  return cache.get(`${id}|${width}`);
}

/**
 * Рисование откладывается на следующий тик, поэтому длинные списки героинь
 * появляются сразу, а картинки подтягиваются кадром позже.
 */
export function useDrawnAvatar(look: Appearance, id: string, width = 300): string {
  const [url, setUrl] = useState(() => peekDrawnAvatar(id, width) ?? '');

  useEffect(() => {
    const cached = peekDrawnAvatar(id, width);
    if (cached !== undefined) {
      setUrl(cached);
      return;
    }
    let alive = true;
    const t = window.setTimeout(() => {
      const rendered = drawnAvatar(look, id, width);
      if (alive) setUrl(rendered);
    }, 0);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [look, id, width]);

  return url;
}
