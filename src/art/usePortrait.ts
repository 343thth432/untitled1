import { useEffect, useState } from 'react';
import type { Appearance } from '../game/types';
import { peekPortrait, renderPortrait, type Framing } from './portraitCache';

/**
 * Портрет модели как обычная картинка. Первый кадр рисуется после отрисовки списка,
 * поэтому длинные списки героинь не блокируют интерфейс.
 */
export function usePortrait(look: Appearance, key: string, framing: Framing = 'half', size = 288): string {
  const [url, setUrl] = useState(() => peekPortrait(key, framing, size) ?? '');

  useEffect(() => {
    const cached = peekPortrait(key, framing, size);
    if (cached !== undefined) {
      setUrl(cached);
      return;
    }
    let alive = true;
    const id = window.setTimeout(() => {
      const rendered = renderPortrait(look, key, framing, size);
      if (alive) setUrl(rendered);
    }, 0);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [look, key, framing, size]);

  return url;
}
