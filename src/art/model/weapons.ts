import * as THREE from 'three';
import type { WeaponId } from '../../game/types';
import { glow, metal, shade, silhouette, toon } from './toon';

export interface WeaponBuild {
  /** основное оружие — крепится к правой кисти (или парит) */
  main: THREE.Group;
  /** второе оружие в левой руке */
  off?: THREE.Group;
  /** парящее оружие не держат в руке */
  floating?: boolean;
  /** двуручное — вторая рука тоже идёт к рукояти */
  twoHanded?: boolean;
}

const WOOD = '#4a3324';
const STEEL = '#dfe6f2';
const DARK_STEEL = '#8f9bb3';

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, pos?: [number, number, number]): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(...pos);
  return m;
}

/** Рукоять: оплётка + навершие. Возвращает длину рукояти */
function grip(g: THREE.Group, accent: string, len: number, r = 0.016): void {
  g.add(mesh(new THREE.CylinderGeometry(r, r * 0.92, len, 8), toon({ color: '#2b2130' }), [0, -len / 2, 0]));
  g.add(mesh(new THREE.SphereGeometry(r * 1.5, 10, 8), toon({ color: accent }), [0, -len - r * 0.6, 0]));
}

export function buildWeapon(id: WeaponId, accent: string, aura: string): WeaponBuild {
  switch (id) {
    case 'katana': {
      const g = new THREE.Group();
      const blade = mesh(new THREE.BoxGeometry(0.022, 0.78, 0.008), metal(STEEL, 0.14), [0, 0.42, 0]);
      blade.rotation.z = -0.03;
      silhouette(blade);
      g.add(blade);
      g.add(mesh(new THREE.BoxGeometry(0.01, 0.78, 0.004), glow(aura, 0.5), [0.006, 0.42, 0.005]));
      g.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 4), metal(accent, 0.3), [0, 0.03, 0]));
      grip(g, accent, 0.17);
      return { main: g };
    }
    case 'greatsword': {
      const g = new THREE.Group();
      const blade = mesh(new THREE.BoxGeometry(0.11, 0.95, 0.02), metal(STEEL, 0.18), [0, 0.55, 0]);
      silhouette(blade);
      g.add(blade);
      g.add(mesh(new THREE.ConeGeometry(0.055, 0.16, 4), metal(STEEL, 0.18), [0, 1.09, 0]));
      g.add(mesh(new THREE.BoxGeometry(0.045, 0.9, 0.026), glow(aura, 0.4), [0, 0.55, 0]));
      g.add(mesh(new THREE.BoxGeometry(0.3, 0.035, 0.045), metal(accent, 0.3), [0, 0.05, 0]));
      g.add(mesh(new THREE.OctahedronGeometry(0.045), glow(aura, 0.95), [0, 0.05, 0.035]));
      grip(g, accent, 0.26, 0.021);
      return { main: g, twoHanded: true };
    }
    case 'bow': {
      const g = new THREE.Group();
      const limb = new THREE.TorusGeometry(0.42, 0.017, 8, 26, Math.PI * 1.05);
      const arc = mesh(limb, toon({ color: shade(accent, -0.12) }), [0, 0, 0]);
      arc.rotation.z = -Math.PI / 2 - 0.52;
      silhouette(arc);
      g.add(arc);
      const inner = mesh(new THREE.TorusGeometry(0.42, 0.007, 6, 24, Math.PI * 1.05), glow(aura, 0.7));
      inner.rotation.z = -Math.PI / 2 - 0.52;
      g.add(inner);
      const string = mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.73, 4), toon({ color: '#e8e4f2' }), [-0.1, 0, 0]);
      g.add(string);
      g.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 8), toon({ color: '#2b2130' })));
      return { main: g };
    }
    case 'crossbow': {
      const g = new THREE.Group();
      const stock = mesh(new THREE.BoxGeometry(0.05, 0.34, 0.05), toon({ color: WOOD }), [0, 0.1, 0]);
      silhouette(stock);
      g.add(stock);
      g.add(mesh(new THREE.BoxGeometry(0.52, 0.024, 0.03), metal(DARK_STEEL, 0.3), [0, 0.24, 0.02]));
      g.add(mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.5, 4), toon({ color: '#efeaf8' }), [0, 0.2, -0.02]).rotateZ(Math.PI / 2));
      g.add(mesh(new THREE.ConeGeometry(0.02, 0.22, 4), glow(aura, 0.9), [0, 0.34, 0.02]));
      grip(g, accent, 0.12);
      return { main: g };
    }
    case 'staff': {
      const g = new THREE.Group();
      const rod = mesh(new THREE.CylinderGeometry(0.017, 0.021, 1.35, 8), toon({ color: shade(accent, -0.2) }), [0, 0.45, 0]);
      silhouette(rod);
      g.add(rod);
      const orb = mesh(new THREE.IcosahedronGeometry(0.075, 1), glow(aura, 0.95), [0, 1.18, 0]);
      g.add(orb);
      g.add(mesh(new THREE.TorusGeometry(0.11, 0.011, 8, 22), metal(accent, 0.25), [0, 1.18, 0]));
      const ring2 = mesh(new THREE.TorusGeometry(0.14, 0.008, 8, 24), glow(aura, 0.6), [0, 1.18, 0]);
      ring2.rotation.x = Math.PI / 2.4;
      ring2.name = 'spin';
      g.add(ring2);
      return { main: g, twoHanded: true };
    }
    case 'wand': {
      const g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.4, 8), toon({ color: '#f4eef8' }), [0, 0.2, 0]));
      const star = mesh(new THREE.OctahedronGeometry(0.06, 0), glow(aura, 0.95), [0, 0.45, 0]);
      star.name = 'spin';
      g.add(star);
      g.add(mesh(new THREE.TorusGeometry(0.085, 0.007, 6, 20), glow(accent, 0.7), [0, 0.45, 0]));
      return { main: g };
    }
    case 'scythe': {
      const g = new THREE.Group();
      const shaft = mesh(new THREE.CylinderGeometry(0.018, 0.022, 1.5, 8), toon({ color: '#2a2233' }), [0, 0.52, 0]);
      silhouette(shaft);
      g.add(shaft);
      const blade = mesh(new THREE.TorusGeometry(0.34, 0.026, 6, 20, Math.PI * 0.65), metal(STEEL, 0.16), [0.3, 1.2, 0]);
      blade.rotation.z = 0.7;
      blade.scale.set(1, 0.55, 0.35);
      silhouette(blade);
      g.add(blade);
      g.add(mesh(new THREE.TorusGeometry(0.34, 0.01, 6, 20, Math.PI * 0.65), glow(aura, 0.7), [0.3, 1.2, 0.012]).rotateZ(0.7));
      g.add(mesh(new THREE.OctahedronGeometry(0.05), glow(aura, 0.9), [0, 1.24, 0]));
      return { main: g, twoHanded: true };
    }
    case 'glaive': {
      const g = new THREE.Group();
      const shaft = mesh(new THREE.CylinderGeometry(0.019, 0.023, 1.25, 8), toon({ color: shade(accent, -0.25) }), [0, 0.4, 0]);
      silhouette(shaft);
      g.add(shaft);
      const blade = mesh(new THREE.BoxGeometry(0.07, 0.46, 0.014), metal(STEEL, 0.15), [0.02, 1.22, 0]);
      blade.rotation.z = -0.06;
      silhouette(blade);
      g.add(blade);
      g.add(mesh(new THREE.ConeGeometry(0.04, 0.14, 4), metal(STEEL, 0.15), [0.02, 1.5, 0]));
      g.add(mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 16), metal(accent, 0.3), [0, 0.98, 0]));
      return { main: g, twoHanded: true };
    }
    case 'spear': {
      const g = new THREE.Group();
      const shaft = mesh(new THREE.CylinderGeometry(0.016, 0.019, 1.5, 8), toon({ color: WOOD }), [0, 0.5, 0]);
      silhouette(shaft);
      g.add(shaft);
      const head = mesh(new THREE.ConeGeometry(0.042, 0.3, 4), metal(STEEL, 0.16), [0, 1.4, 0]);
      silhouette(head);
      g.add(head);
      g.add(mesh(new THREE.TorusGeometry(0.038, 0.012, 6, 14), metal(accent, 0.3), [0, 1.24, 0]));
      for (let i = 0; i < 4; i++) {
        const t = mesh(new THREE.CylinderGeometry(0.004, 0.002, 0.16, 4), toon({ color: accent }), [
          Math.cos(i) * 0.02,
          1.15,
          Math.sin(i) * 0.02,
        ]);
        g.add(t);
      }
      return { main: g, twoHanded: true };
    }
    case 'hammer': {
      const g = new THREE.Group();
      const shaft = mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.9, 8), toon({ color: WOOD }), [0, 0.32, 0]);
      silhouette(shaft);
      g.add(shaft);
      const head = mesh(new THREE.BoxGeometry(0.24, 0.2, 0.2), metal(DARK_STEEL, 0.35), [0, 0.86, 0]);
      silhouette(head);
      g.add(head);
      g.add(mesh(new THREE.BoxGeometry(0.26, 0.055, 0.22), metal(accent, 0.3), [0, 0.86, 0]));
      g.add(mesh(new THREE.OctahedronGeometry(0.05), glow(aura, 0.9), [0, 0.86, 0.115]));
      return { main: g, twoHanded: true };
    }
    case 'daggers': {
      const make = () => {
        const g = new THREE.Group();
        const blade = mesh(new THREE.ConeGeometry(0.028, 0.34, 4), metal(STEEL, 0.12), [0, 0.2, 0]);
        silhouette(blade);
        g.add(blade);
        g.add(mesh(new THREE.ConeGeometry(0.014, 0.3, 4), glow(aura, 0.55), [0, 0.2, 0]));
        g.add(mesh(new THREE.BoxGeometry(0.09, 0.016, 0.02), metal(accent, 0.3), [0, 0.035, 0]));
        grip(g, accent, 0.1, 0.013);
        return g;
      };
      return { main: make(), off: make() };
    }
    case 'claws': {
      const make = () => {
        const g = new THREE.Group();
        g.add(mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.13, 10), toon({ color: shade(accent, -0.2) }), [0, -0.04, 0]));
        for (let i = -1; i <= 1; i++) {
          const c = mesh(new THREE.ConeGeometry(0.014, 0.26, 4), metal(STEEL, 0.12), [i * 0.035, 0.12, 0.02]);
          c.rotation.x = -0.25;
          c.rotation.z = i * 0.13;
          silhouette(c);
          g.add(c);
          const t = mesh(new THREE.ConeGeometry(0.007, 0.22, 4), glow(aura, 0.6), [i * 0.035, 0.12, 0.022]);
          t.rotation.x = -0.25;
          g.add(t);
        }
        return g;
      };
      return { main: make(), off: make() };
    }
    case 'grimoire': {
      const g = new THREE.Group();
      const book = mesh(new THREE.BoxGeometry(0.2, 0.25, 0.05), toon({ color: shade(accent, -0.25) }), [0, 0, 0]);
      silhouette(book);
      g.add(book);
      g.add(mesh(new THREE.BoxGeometry(0.185, 0.235, 0.055), toon({ color: '#f6f1e4' })));
      g.add(mesh(new THREE.BoxGeometry(0.04, 0.05, 0.065), glow(aura, 0.95)));
      for (let i = 0; i < 3; i++) {
        const r = mesh(new THREE.TorusGeometry(0.15 + i * 0.05, 0.004, 6, 24), glow(aura, 0.45 - i * 0.1));
        r.rotation.x = Math.PI / 2;
        r.name = 'spin';
        r.position.y = -0.02 - i * 0.05;
        g.add(r);
      }
      return { main: g, floating: true };
    }
    case 'chakram': {
      const g = new THREE.Group();
      for (let i = 0; i < 2; i++) {
        const ring = mesh(new THREE.TorusGeometry(0.1 - i * 0.024, 0.011, 8, 22), metal(accent, 0.22), [i * 0.09 - 0.045, i * 0.12, 0]);
        ring.rotation.x = Math.PI / 2 - 0.4;
        ring.name = 'spin';
        silhouette(ring);
        g.add(ring);
        const inner = mesh(new THREE.TorusGeometry(0.1 - i * 0.024, 0.004, 6, 20), glow(aura, 0.8), [i * 0.09 - 0.045, i * 0.12, 0]);
        inner.rotation.x = Math.PI / 2 - 0.4;
        g.add(inner);
      }
      return { main: g, floating: true };
    }
  }
}
