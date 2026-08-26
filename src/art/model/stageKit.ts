import * as THREE from 'three';

/** Свет для «глянцевой» аниме-сцены: мягкий заполняющий + ключевой + контровой */
export function setupLights(scene: THREE.Scene, accent = '#a06bff', warm = '#fff3e0'): void {
  scene.add(new THREE.HemisphereLight(0xf6f4ff, 0x9b93b8, 0.62));

  const key = new THREE.DirectionalLight(new THREE.Color(warm), 1.05);
  key.position.set(2.4, 4.2, 3.2);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xdfe6ff, 0.32);
  fill.position.set(-3, 1.6, 2.2);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(new THREE.Color(accent), 0.85);
  rim.position.set(-1.6, 2.6, -3.4);
  scene.add(rim);
}

export function makeRenderer(canvas: HTMLCanvasElement, alpha = true): THREE.WebGLRenderer {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 0.95;
  return r;
}

/** Мягкая «сцена» под ногами */
export function makeFloor(color: string, radius = 6): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 48);
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.5 });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = -0.002;
  return m;
}
