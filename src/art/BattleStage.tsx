import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Appearance } from '../game/types';
import { Actor } from './model/actor';
import { makeRenderer, setupLights } from './model/stageKit';

export interface StageUnit {
  uid: string;
  look: Appearance;
  side: 'ally' | 'foe';
  slot: number;
}

export interface ScreenPos {
  x: number;
  y: number;
  /** масштаб относительно ближнего плана — для размера полосок */
  k: number;
}

export interface StageApi {
  trigger(uid: string, kind: 'attack' | 'cast' | 'hurt'): void;
  setDead(uid: string, dead: boolean): void;
  positions: Record<string, ScreenPos>;
}

interface Props {
  units: StageUnit[];
  accent: string;
  floor: string;
  apiRef: React.MutableRefObject<StageApi | null>;
  className?: string;
}

/** Позиция героини на поле: фронт ближе к центру, тыл — дальше */
function place(side: 'ally' | 'foe', slot: number): [number, number] {
  const front = slot <= 1;
  const z = (front ? 1.9 : 3.4) * (side === 'ally' ? 1 : -1);
  const x = front ? (slot === 0 ? -0.72 : 0.72) : [-1.28, 0, 1.28][slot - 2] ?? 0;
  return [side === 'ally' ? x : -x, z];
}

export default function BattleStage({ units, accent, floor, apiRef, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const unitsRef = useRef(units);
  unitsRef.current = units;

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = makeRenderer(canvas, true);
    } catch {
      return;
    }

    const scene = new THREE.Scene();
    setupLights(scene, accent);

    // задник: мягкое небо главы + парящие искры, чтобы верх кадра не пустовал
    const sky = document.createElement('canvas');
    sky.width = 8;
    sky.height = 128;
    const sctx = sky.getContext('2d');
    if (sctx) {
      const grad = sctx.createLinearGradient(0, 0, 0, 128);
      grad.addColorStop(0, floor);
      grad.addColorStop(0.45, '#ffffff');
      grad.addColorStop(1, '#ffffff');
      sctx.fillStyle = grad;
      sctx.fillRect(0, 0, 8, 128);
    }
    const skyTex = new THREE.CanvasTexture(sky);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    const backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(46, 22),
      new THREE.MeshBasicMaterial({ map: skyTex, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false }),
    );
    backdrop.position.set(0, 6.5, -14);
    scene.add(backdrop);

    const motes = new THREE.Group();
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.03 + Math.random() * 0.035, 6, 5),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(accent), transparent: true, opacity: 0.2, toneMapped: false }),
      );
      m.position.set((Math.random() - 0.5) * 13, 1.2 + Math.random() * 5.2, -5 - Math.random() * 7);
      m.userData.sp = 0.15 + Math.random() * 0.3;
      motes.add(m);
    }
    scene.add(motes);

    // арена
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(13, 64),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(floor), transparent: true, opacity: 0.7 }),
    );
    disc.rotation.x = -Math.PI / 2;
    scene.add(disc);
    const inner = new THREE.Mesh(
      new THREE.CircleGeometry(5.6, 56),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff'), transparent: true, opacity: 0.5 }),
    );
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.002;
    scene.add(inner);
    for (const s of [1, -1]) {
      const glowRing = new THREE.Mesh(
        new THREE.RingGeometry(2.2, 3.0, 48),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(s > 0 ? '#5ad1a0' : '#ff6f8f'),
          transparent: true,
          opacity: 0.16,
        }),
      );
      glowRing.rotation.x = -Math.PI / 2;
      glowRing.position.set(0, 0.004, s * 2.6);
      glowRing.scale.set(1.35, 1, 1);
      scene.add(glowRing);
    }

    const actors = new Map<string, Actor>();
    for (const u of unitsRef.current) {
      const actor = new Actor(u.look, { outlines: false, expression: u.side === 'foe' ? 'fierce' : 'idle' });
      const [x, z] = place(u.side, u.slot);
      actor.root.position.set(x, 0, z);
      actor.root.rotation.y = u.side === 'ally' ? Math.PI - 0.6 : 0.32;
      scene.add(actor.root);
      actors.set(u.uid, actor);
    }

    const cam = new THREE.PerspectiveCamera(34, 1, 0.1, 90);
    cam.position.set(0.2, 8.0, 12.4);
    cam.lookAt(0, 0.55, -1.1);

    const positions: Record<string, ScreenPos> = {};
    apiRef.current = {
      trigger: (uid, kind) => actors.get(uid)?.trigger(kind),
      setDead: (uid, dead) => actors.get(uid)?.setDead(dead),
      positions,
    };

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const v = new THREE.Vector3();
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const w = host.clientWidth;
      const h = host.clientHeight;
      for (const [uid, actor] of actors) {
        actor.update(dt);
        v.set(actor.root.position.x, actor.dead ? 0.5 : 1.86, actor.root.position.z);
        v.project(cam);
        positions[uid] = {
          x: ((v.x + 1) / 2) * w,
          y: ((1 - v.y) / 2) * h,
          k: actor.root.position.z > 0 ? 0.95 : 0.78,
        };
      }
      for (const m of motes.children) {
        m.position.y += (m.userData.sp as number) * dt;
        if (m.position.y > 7) m.position.y = 1.1;
      }
      renderer.render(scene, cam);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      for (const a of actors.values()) a.dispose();
      disc.geometry.dispose();
      inner.geometry.dispose();
      backdrop.geometry.dispose();
      skyTex.dispose();
      renderer.dispose();
      apiRef.current = null;
    };
    // сцена пересобирается только при смене состава
  }, [units, accent, floor, apiRef]);

  return (
    <div ref={hostRef} className={className}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}
