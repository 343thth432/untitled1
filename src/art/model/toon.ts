import * as THREE from 'three';

/** Трёхступенчатая рампа для cel-шейдинга */
let gradient: THREE.DataTexture | null = null;

export function toonGradient(): THREE.DataTexture {
  if (gradient) return gradient;
  const steps = new Uint8Array([96, 168, 218, 255]);
  const tex = new THREE.DataTexture(steps, steps.length, 1, THREE.RedFormat);
  tex.needsUpdate = true;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  gradient = tex;
  return tex;
}

export interface SkinOpts {
  color: string;
  /** насколько блестит (кожа/латекс/металл) */
  gloss?: number;
  transparent?: boolean;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
}

const cache = new Map<string, THREE.Material>();

export function toon(o: SkinOpts): THREE.Material {
  const key = JSON.stringify(o);
  const hit = cache.get(key);
  if (hit) return hit;
  const m = new THREE.MeshToonMaterial({
    color: new THREE.Color(o.color),
    gradientMap: toonGradient(),
    transparent: o.transparent ?? false,
    opacity: o.opacity ?? 1,
    emissive: new THREE.Color(o.emissive ?? '#000000'),
    emissiveIntensity: o.emissiveIntensity ?? 0,
    side: o.transparent ? THREE.DoubleSide : THREE.FrontSide,
  });
  cache.set(key, m);
  return m;
}

/** Металл — отдельный физический материал, чтобы клинки бликовали */
export function metal(color: string, rough = 0.22): THREE.Material {
  const key = `metal:${color}:${rough}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    metalness: 0.85,
    roughness: rough,
  });
  cache.set(key, m);
  return m;
}

export function glow(color: string, opacity = 0.85): THREE.Material {
  const key = `glow:${color}:${opacity}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const m = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  cache.set(key, m);
  return m;
}

const OUTLINE_COLOR = '#2a2140';

export function outlineMaterial(): THREE.Material {
  const key = 'outline';
  const hit = cache.get(key);
  if (hit) return hit;
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(OUTLINE_COLOR), side: THREE.BackSide });
  cache.set(key, m);
  return m;
}

/** Помечает меш как силуэтный — для него будет построен контур */
export function silhouette<T extends THREE.Object3D>(o: T): T {
  o.userData.outline = true;
  return o;
}

/** Строит контурные копии помеченных мешей */
export function buildOutlines(root: THREE.Object3D, thickness = 1.05): void {
  const targets: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o.userData.outline) targets.push(o as THREE.Mesh);
  });
  for (const mesh of targets) {
    const shell = new THREE.Mesh(mesh.geometry, outlineMaterial());
    shell.scale.setScalar(thickness);
    shell.renderOrder = -1;
    mesh.add(shell);
  }
}

export function shade(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amount)));
  return `#${c.getHexString()}`;
}
