import * as THREE from 'three';
import type { Appearance } from '../game/types';
import { buildCharacter } from './model/character';
import { makeRenderer, setupLights } from './model/stageKit';

export type Framing = 'bust' | 'half' | 'full';

const FRAMES: Record<Framing, { target: number; dist: number; height: number; fov: number; y: number }> = {
  bust: { target: 1.5, dist: 0.92, height: 0.62, fov: 26, y: 0.12 },
  half: { target: 1.1, dist: 2.15, height: 1.25, fov: 30, y: 0.3 },
  full: { target: 0.9, dist: 3.5, height: 1.95, fov: 30, y: 0.3 },
};

const cache = new Map<string, string>();
let renderer: THREE.WebGLRenderer | null = null;
let canvas: HTMLCanvasElement | null = null;
let broken = false;

function ensureRenderer(w: number, h: number): THREE.WebGLRenderer | null {
  if (broken) return null;
  try {
    if (!renderer || !canvas) {
      canvas = document.createElement('canvas');
      renderer = makeRenderer(canvas, true);
    }
    renderer.setSize(w, h, false);
    return renderer;
  } catch {
    broken = true;
    return null;
  }
}

/**
 * Один скрытый рендерер отрисовывает статичные «фотографии» моделей,
 * которые потом переиспользуются во всех списках интерфейса как обычные картинки.
 */
export function renderPortrait(look: Appearance, key: string, framing: Framing = 'half', size = 320): string {
  const id = `${key}|${framing}|${size}`;
  const hit = cache.get(id);
  if (hit !== undefined) return hit;

  const h = Math.round(size * 1.18);
  const r = ensureRenderer(size, h);
  if (!r) {
    cache.set(id, '');
    return '';
  }

  const scene = new THREE.Scene();
  setupLights(scene, look.aura);

  const built = buildCharacter(look, 'idle', true);
  built.root.rotation.y = -0.3;
  scene.add(built.root);

  const f = FRAMES[framing];
  const cam = new THREE.PerspectiveCamera(f.fov, size / h, 0.1, 40);
  const dist = f.dist;
  cam.position.set(dist * 0.42, f.target + f.y * 0.32, dist);
  cam.lookAt(0, f.target, 0);

  // мягкое свечение ауры за спиной
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(0.75, 32),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(look.aura), transparent: true, opacity: 0.16 }),
  );
  halo.position.set(0, f.target, -0.7);
  scene.add(halo);

  r.render(scene, cam);
  const url = r.domElement.toDataURL('image/png');

  scene.clear();
  built.root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.geometry?.dispose();
  });
  halo.geometry.dispose();

  cache.set(id, url);
  return url;
}

/** Уже отрисованный портрет, если он есть в кэше */
export function peekPortrait(key: string, framing: Framing = 'half', size = 320): string | undefined {
  return cache.get(`${key}|${framing}|${size}`);
}

export function portraitAvailable(): boolean {
  return !broken;
}
