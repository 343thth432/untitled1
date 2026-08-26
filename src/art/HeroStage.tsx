import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Appearance } from '../game/types';
import { Actor } from './model/actor';
import { makeRenderer, setupLights } from './model/stageKit';

interface Props {
  look: Appearance;
  className?: string;
  /** можно вращать пальцем */
  interactive?: boolean;
  /** кадрирование: по пояс или в полный рост */
  framing?: 'half' | 'full';
  /** проигрывать анимацию каста при монтировании */
  showcase?: boolean;
}

/** Живая 3D-модель одной героини с вращением пальцем */
export default function HeroStage({ look, className, interactive = true, framing = 'full', showcase }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    setupLights(scene, look.aura);

    const actor = new Actor(look, { outlines: true });
    const pivot = new THREE.Group();
    pivot.add(actor.root);
    pivot.rotation.y = -0.35;
    scene.add(pivot);

    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(0.85, 40),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(look.aura), transparent: true, opacity: 0.14 }),
    );
    halo.position.set(0, framing === 'full' ? 0.95 : 1.2, -0.9);
    scene.add(halo);

    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
    const target = framing === 'full' ? 0.9 : 1.16;
    const dist = framing === 'full' ? 3.4 : 2.0;
    cam.position.set(dist * 0.36, target + 0.28, dist);
    cam.lookAt(0, target, 0);

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

    // вращение пальцем
    let dragging = false;
    let lastX = 0;
    let spin = 0;
    const onDown = (e: PointerEvent) => {
      if (!interactive) return;
      dragging = true;
      lastX = e.clientX;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      spin += (e.clientX - lastX) * 0.012;
      lastX = e.clientX;
    };
    const onUp = () => {
      dragging = false;
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    if (showcase) window.setTimeout(() => actor.trigger('cast'), 260);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      actor.update(dt);
      pivot.rotation.y += ((-0.35 + spin) - pivot.rotation.y) * Math.min(1, dt * 9);
      if (!dragging && !interactive) pivot.rotation.y = -0.35 + Math.sin(now / 2600) * 0.28;
      renderer.render(scene, cam);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      actor.dispose();
      halo.geometry.dispose();
      renderer.dispose();
    };
  }, [look, interactive, framing, showcase]);

  return (
    <div ref={hostRef} className={className}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', touchAction: 'pan-y' }} />
    </div>
  );
}
