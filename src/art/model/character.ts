import * as THREE from 'three';
import type { Appearance } from '../../game/types';
import { headTexture, type Expression } from './face';
import { buildWeapon } from './weapons';
import { buildOutlines, glow, metal, shade, silhouette, toon } from './toon';

export type AnimState = 'idle' | 'attack' | 'cast' | 'hurt' | 'dead' | 'victory';

// ── Канонические пропорции (рост 1.70) ───────────────────────
const Y = {
  ankle: 0.1,
  knee: 0.48,
  hip: 0.92,
  waist: 1.03,
  underBust: 1.13,
  bust: 1.21,
  shoulder: 1.36,
  chin: 1.44,
  head: 1.548,
  top: 1.665,
};
const R = {
  thigh: 0.078,
  knee: 0.055,
  calf: 0.06,
  ankle: 0.036,
  hip: 0.138,
  waist: 0.098,
  bust: 0.126,
  shoulderX: 0.151,
  upperArm: 0.043,
  elbow: 0.035,
  forearm: 0.034,
  wrist: 0.026,
  neck: 0.046,
  head: 0.116,
};

interface Mats {
  skin: THREE.Material;
  skinDark: THREE.Material;
  cloth: THREE.Material;
  trim: THREE.Material;
  trimMetal: THREE.Material;
  sheer: THREE.Material;
  hair: THREE.Material;
  hairTip: THREE.Material;
  stocking: THREE.Material | null;
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, pos?: [number, number, number]): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(...pos);
  return m;
}

function limb(rTop: number, rBot: number, from: number, to: number, mat: THREE.Material): THREE.Mesh {
  const len = from - to;
  const m = mesh(new THREE.CylinderGeometry(rTop, rBot, len, 14, 1), mat, [0, -len / 2, 0]);
  return m;
}

// ── Голова с сужением к подбородку ───────────────────────────
function headGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(R.head, 30, 24);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = Math.max(0, -y / R.head);
    const taper = 1 - Math.pow(t, 1.7) * 0.42;
    pos.setXYZ(i, x * taper * 0.95, y * 1.04, z * taper * 0.94);
  }
  geo.computeVertexNormals();
  return geo;
}

// ── Торс ─────────────────────────────────────────────────────
function torsoGeometry(figure: number): THREE.BufferGeometry {
  const bust = R.bust * (0.92 + figure * 0.2);
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.001, Y.hip - 0.1),
    new THREE.Vector2(R.hip * 0.85, Y.hip - 0.08),
    new THREE.Vector2(R.hip, Y.hip),
    new THREE.Vector2(R.hip * 0.86, Y.hip + 0.06),
    new THREE.Vector2(R.waist, Y.waist),
    new THREE.Vector2(R.waist * 1.05, Y.underBust),
    new THREE.Vector2(bust, Y.bust),
    new THREE.Vector2(bust * 0.94, Y.bust + 0.07),
    new THREE.Vector2(R.bust * 0.82, Y.shoulder - 0.02),
    new THREE.Vector2(R.neck * 1.5, Y.shoulder + 0.02),
    new THREE.Vector2(0.001, Y.shoulder + 0.03),
  ];
  const geo = new THREE.LatheGeometry(pts, 26);
  geo.scale(1, 1, 0.74);
  return geo;
}

/** Полотно волос сзади: половина цилиндра, а не бочка вокруг тела */
function backSheet(rTop: number, rBot: number, len: number): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(rTop, rBot, len, 18, 4, true, Math.PI * 0.42, Math.PI * 1.16);
  geo.scale(1, 1, 0.92);
  return geo;
}

// ── Причёска ─────────────────────────────────────────────────
function buildHair(look: Appearance, m: Mats): { group: THREE.Group; back: THREE.Group } {
  const g = new THREE.Group();
  const back = new THREE.Group();
  back.position.set(0, Y.head, 0);

  const cap = mesh(new THREE.SphereGeometry(R.head * 1.075, 26, 20, 0, Math.PI * 2, 0, 1.16), m.hair, [0, Y.head, 0]);
  cap.scale.set(1.0, 1.06, 1.0);
  silhouette(cap);
  g.add(cap);

  // чёлка
  const strands = 7;
  for (let i = 0; i < strands; i++) {
    const a = -0.95 + (i / (strands - 1)) * 1.9;
    const len = 0.05 + Math.abs(a) * 0.035 + (i % 2) * 0.008;
    const s = mesh(new THREE.ConeGeometry(0.03, len, 6), m.hair, [
      Math.sin(a) * R.head * 0.72,
      Y.head + R.head * 0.62 - len / 2,
      Math.cos(a) * R.head * 0.84,
    ]);
    s.rotation.x = Math.PI;
    s.rotation.z = a * 0.28;
    g.add(s);
  }
  // блик-прядь
  for (const sx of [-1, 1]) {
    const lock = mesh(new THREE.CylinderGeometry(0.026, 0.016, 0.3, 8), m.hair, [
      sx * R.head * 0.9,
      Y.head - 0.09,
      R.head * 0.28,
    ]);
    lock.rotation.z = sx * 0.1;
    lock.scale.z = 0.7;
    silhouette(lock);
    g.add(lock);
    const tip = mesh(new THREE.ConeGeometry(0.017, 0.075, 6), m.hairTip, [sx * R.head * 0.93, Y.head - 0.265, R.head * 0.28]);
    tip.rotation.x = Math.PI;
    g.add(tip);
  }

  const gleam = mesh(new THREE.TorusGeometry(R.head * 0.84, 0.01, 6, 18, Math.PI * 0.85), m.hairTip, [0, Y.head + R.head * 0.55, 0]);
  gleam.rotation.x = Math.PI / 2 - 0.2;
  g.add(gleam);

  const addBack = (geo: THREE.BufferGeometry, pos: [number, number, number], rot?: [number, number, number]) => {
    const b = mesh(geo, m.hair, pos);
    if (rot) b.rotation.set(...rot);
    silhouette(b);
    back.add(b);
    return b;
  };

  switch (look.hair) {
    case 'short':
      addBack(backSheet(R.head * 1.05, R.head * 1.0, 0.13), [0, -0.05, -0.01]);
      break;
    case 'bob': {
      addBack(backSheet(R.head * 1.06, R.head * 1.1, 0.26), [0, -0.12, -0.01]);
      break;
    }
    case 'buns':
      addBack(backSheet(R.head * 1.04, R.head * 1.0, 0.16), [0, -0.07, -0.01]);
      for (const sx of [-1, 1]) {
        const bun = mesh(new THREE.SphereGeometry(0.072, 16, 14), m.hair, [sx * 0.135, 0.085, -0.02]);
        silhouette(bun);
        back.add(bun);
        back.add(mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 16), m.hairTip, [sx * 0.135, 0.085, -0.02]));
      }
      break;
    case 'twin': {
      addBack(backSheet(R.head * 1.04, R.head * 0.98, 0.18), [0, -0.08, -0.01]);
      for (const sx of [-1, 1]) {
        const tail = new THREE.Group();
        tail.position.set(sx * 0.14, 0.03, -0.03);
        tail.rotation.z = sx * 0.32;
        let r = 0.055;
        for (let i = 0; i < 5; i++) {
          const seg = mesh(new THREE.SphereGeometry(r, 14, 12), i > 3 ? m.hairTip : m.hair, [0, -i * 0.105, 0]);
          seg.scale.set(1, 1.25, 1);
          silhouette(seg);
          tail.add(seg);
          r *= 0.87;
        }
        tail.add(mesh(new THREE.TorusGeometry(0.058, 0.014, 6, 14), m.trim, [0, 0.02, 0]));
        back.add(tail);
      }
      break;
    }
    case 'ponytail': {
      addBack(backSheet(R.head * 1.04, R.head * 0.96, 0.16), [0, -0.07, -0.01]);
      const tail = new THREE.Group();
      tail.position.set(0, 0.05, -0.1);
      tail.rotation.x = -0.35;
      let r = 0.062;
      for (let i = 0; i < 7; i++) {
        const seg = mesh(new THREE.SphereGeometry(r, 14, 12), i > 4 ? m.hairTip : m.hair, [0, -i * 0.11, i * 0.012]);
        seg.scale.set(1, 1.3, 1);
        silhouette(seg);
        tail.add(seg);
        r *= 0.9;
      }
      tail.add(mesh(new THREE.TorusGeometry(0.066, 0.016, 6, 14), m.trim, [0, 0.02, 0]));
      back.add(tail);
      break;
    }
    case 'braid': {
      addBack(backSheet(R.head * 1.04, R.head * 1.0, 0.2), [0, -0.09, -0.01]);
      const braid = new THREE.Group();
      braid.position.set(0.075, -0.02, -0.07);
      braid.rotation.z = 0.18;
      for (let i = 0; i < 8; i++) {
        const seg = mesh(new THREE.SphereGeometry(0.045 - i * 0.003, 12, 10), i > 5 ? m.hairTip : m.hair, [
          Math.sin(i * 1.5) * 0.012,
          -i * 0.082,
          0,
        ]);
        seg.scale.set(1.15, 1, 1);
        silhouette(seg);
        braid.add(seg);
      }
      braid.add(mesh(new THREE.TorusGeometry(0.03, 0.011, 6, 12), m.trim, [0, -0.64, 0]));
      back.add(braid);
      break;
    }
    case 'wavy': {
      const geo = backSheet(R.head * 1.05, R.head * 1.24, 0.7);
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const k = 1 + Math.sin(y * 24) * 0.07;
        pos.setXYZ(i, pos.getX(i) * k, y, pos.getZ(i) * k);
      }
      geo.computeVertexNormals();
      addBack(geo, [0, -0.33, -0.015]);
      const tips = mesh(backSheet(R.head * 1.2, R.head * 1.12, 0.13), m.hairTip, [0, -0.71, -0.015]);
      back.add(tips);
      break;
    }
    case 'long':
    default: {
      addBack(backSheet(R.head * 1.05, R.head * 1.2, 0.76), [0, -0.36, -0.015]);
      const tips = mesh(backSheet(R.head * 1.18, R.head * 1.08, 0.13), m.hairTip, [0, -0.77, -0.015]);
      back.add(tips);
      break;
    }
  }

  g.add(back);
  return { group: g, back };
}

// ── Аксессуары ───────────────────────────────────────────────
function buildAccessory(look: Appearance, m: Mats): THREE.Object3D | null {
  const g = new THREE.Group();
  switch (look.accessory) {
    case 'horns':
      for (const sx of [-1, 1]) {
        const h = mesh(new THREE.ConeGeometry(0.026, 0.16, 8), m.trimMetal, [sx * 0.075, Y.head + 0.11, -0.02]);
        h.rotation.z = sx * 0.5;
        h.rotation.x = -0.25;
        silhouette(h);
        g.add(h);
      }
      break;
    case 'halo': {
      const halo = mesh(new THREE.TorusGeometry(0.115, 0.011, 8, 28), glow(look.aura, 0.95), [0, Y.top + 0.09, -0.02]);
      halo.rotation.x = Math.PI / 2 - 0.28;
      halo.name = 'halo';
      g.add(halo);
      break;
    }
    case 'ears':
      for (const sx of [-1, 1]) {
        const e = mesh(new THREE.ConeGeometry(0.042, 0.11, 5), m.hair, [sx * 0.068, Y.head + 0.115, -0.01]);
        e.rotation.z = sx * 0.28;
        silhouette(e);
        g.add(e);
        g.add(mesh(new THREE.ConeGeometry(0.024, 0.07, 5), toon({ color: '#ff9ecd' }), [sx * 0.068, Y.head + 0.112, 0.012]));
      }
      break;
    case 'crown': {
      const band = mesh(new THREE.TorusGeometry(0.098, 0.009, 6, 22), m.trimMetal, [0, Y.head + 0.085, 0]);
      band.rotation.x = Math.PI / 2;
      g.add(band);
      for (let i = 0; i < 5; i++) {
        const a = -0.9 + (i / 4) * 1.8;
        const spike = mesh(new THREE.ConeGeometry(0.016, 0.05 + (i === 2 ? 0.035 : 0), 4), m.trimMetal, [
          Math.sin(a) * 0.095,
          Y.head + 0.115 + (i === 2 ? 0.018 : 0),
          Math.cos(a) * 0.095,
        ]);
        g.add(spike);
      }
      g.add(mesh(new THREE.OctahedronGeometry(0.018), glow(look.aura, 0.95), [0, Y.head + 0.125, 0.095]));
      break;
    }
    case 'visor': {
      const v = mesh(new THREE.TorusGeometry(0.113, 0.014, 6, 22, Math.PI * 1.05), m.trimMetal, [0, Y.head + 0.05, 0]);
      v.rotation.x = Math.PI / 2;
      v.rotation.z = -Math.PI * 0.52;
      g.add(v);
      break;
    }
    case 'hairpin': {
      const p = mesh(new THREE.OctahedronGeometry(0.03), m.trim, [0.098, Y.head + 0.055, 0.04]);
      g.add(p);
      for (let i = 0; i < 4; i++) {
        const petal = mesh(new THREE.SphereGeometry(0.017, 8, 6), m.trim, [
          0.098 + Math.cos((i / 4) * 6.28) * 0.026,
          Y.head + 0.055 + Math.sin((i / 4) * 6.28) * 0.026,
          0.042,
        ]);
        petal.scale.z = 0.5;
        g.add(petal);
      }
      break;
    }
    case 'veil': {
      const v = mesh(new THREE.CylinderGeometry(R.head * 1.16, R.head * 1.3, 0.26, 20, 1, true), m.sheer, [0, Y.head - 0.05, -0.03]);
      g.add(v);
      break;
    }
    default:
      return null;
  }
  return g;
}

// ── Костюмы ──────────────────────────────────────────────────
function band(yFrom: number, yTo: number, rScale: number, mat: THREE.Material, figure: number): THREE.Mesh {
  const bust = R.bust * (0.92 + figure * 0.2);
  const rTop = (yFrom > Y.underBust ? bust : R.waist) * rScale;
  const rBot = (yTo > Y.underBust ? bust : R.waist) * rScale;
  const h = yFrom - yTo;
  const m = mesh(new THREE.CylinderGeometry(rTop, rBot, h, 24, 1, true), mat, [0, (yFrom + yTo) / 2, 0]);
  m.scale.z = 0.76;
  return m;
}

function cups(mat: THREE.Material, figure: number, lift = 0): THREE.Group {
  const g = new THREE.Group();
  const r = 0.06 * (0.85 + figure * 0.4);
  for (const sx of [-1, 1]) {
    const c = mesh(new THREE.SphereGeometry(r * 1.08, 18, 14), mat, [sx * r * 0.95, Y.bust - 0.002 + lift, R.bust * 0.34]);
    c.scale.set(1, 1.0, 0.92);
    silhouette(c);
    g.add(c);
  }
  return g;
}

function bust(mats: Mats, figure: number): THREE.Group {
  const g = new THREE.Group();
  const r = 0.058 * (0.85 + figure * 0.4);
  for (const sx of [-1, 1]) {
    const b = mesh(new THREE.SphereGeometry(r, 18, 14), mats.skin, [sx * r * 0.95, Y.bust - 0.004, R.bust * 0.33]);
    b.scale.set(1, 1.0, 0.9);
    g.add(b);
  }
  return g;
}

/** Юбка из панелей — боковые разрезы получаются сами собой */
function panelSkirt(
  mat: THREE.Material,
  len: number,
  flare: number,
  panels: { start: number; span: number }[],
  yTop = Y.hip + 0.03,
): THREE.Group {
  const g = new THREE.Group();
  for (const p of panels) {
    const m = mesh(
      new THREE.CylinderGeometry(R.hip * 1.06, R.hip * flare, len, 18, 1, true, p.start, p.span),
      mat,
      [0, yTop - len / 2, 0],
    );
    m.scale.z = 0.82;
    silhouette(m);
    g.add(m);
  }
  return g;
}

function shorts(mat: THREE.Material, len = 0.16): THREE.Mesh {
  const m = mesh(new THREE.CylinderGeometry(R.hip * 1.04, R.hip * 0.98, len, 20, 1, true), mat, [0, Y.hip - len / 2 + 0.04, 0]);
  m.scale.z = 0.84;
  silhouette(m);
  return m;
}

function briefs(mat: THREE.Material): THREE.Mesh {
  const m = mesh(new THREE.SphereGeometry(R.hip * 1.02, 20, 14, 0, Math.PI * 2, 0.55, 0.85), mat, [0, Y.hip - 0.01, 0]);
  m.scale.set(1, 1.15, 0.86);
  silhouette(m);
  return m;
}

function belt(mat: THREE.Material, y = Y.hip + 0.03): THREE.Mesh {
  const m = mesh(new THREE.TorusGeometry(R.hip * 0.98, 0.017, 8, 26), mat, [0, y, 0]);
  m.rotation.x = Math.PI / 2;
  m.scale.z = 0.84;
  return m;
}

function pauldrons(mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) {
    const p = mesh(new THREE.SphereGeometry(0.072, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), mat, [
      sx * R.shoulderX,
      Y.shoulder - 0.005,
      0,
    ]);
    p.scale.set(1.05, 0.85, 1);
    p.rotation.z = sx * 0.22;
    silhouette(p);
    g.add(p);
  }
  return g;
}

function collarPiece(mat: THREE.Material, h = 0.07): THREE.Mesh {
  const m = mesh(new THREE.CylinderGeometry(R.neck * 1.5, R.neck * 1.7, h, 16, 1, true), mat, [0, Y.chin - 0.08, 0]);
  silhouette(m);
  return m;
}

function garter(mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) {
    const t = mesh(new THREE.TorusGeometry(R.thigh * 1.08, 0.011, 6, 18), mat, [sx * 0.082, Y.hip - 0.2, 0]);
    t.rotation.x = Math.PI / 2;
    g.add(t);
  }
  return g;
}

interface WeaponPose {
  pos: [number, number, number];
  rot: [number, number, number];
  armR: number;
  armRz?: number;
  armL?: number;
  armLz?: number;
  scale?: number;
}

/** Как именно героиня держит своё оружие */
const WEAPON_POSE: Record<Appearance['weapon'], WeaponPose> = {
  katana: { pos: [0, -0.03, 0.03], rot: [-0.5, 0, -0.32], armR: -0.34, armRz: 0.1, scale: 0.95 },
  greatsword: { pos: [0, -0.03, 0.04], rot: [-0.3, 0.18, -0.22], armR: -0.5, armRz: 0.12, armL: -0.2, scale: 0.78 },
  bow: { pos: [0, -0.03, 0.02], rot: [0, 0.35, 0.3], armR: -0.42, armRz: 0.24, scale: 0.82 },
  crossbow: { pos: [0, -0.03, 0.03], rot: [-0.35, 0.75, -0.1], armR: -0.7, armRz: 0.14, armL: -0.3, scale: 0.9 },
  staff: { pos: [0, -0.42, 0.03], rot: [-0.06, 0, -0.13], armR: -0.24, armRz: 0.08, scale: 0.84 },
  wand: { pos: [0, -0.03, 0.03], rot: [-0.5, 0, -0.2], armR: -0.62, armRz: 0.12 },
  scythe: { pos: [0, -0.46, 0.03], rot: [-0.05, 0.45, -0.14], armR: -0.26, armRz: 0.08, scale: 0.8 },
  glaive: { pos: [0, -0.38, 0.03], rot: [-0.05, 0.2, -0.14], armR: -0.26, armRz: 0.08, scale: 0.85 },
  spear: { pos: [0, -0.44, 0.03], rot: [-0.05, 0.15, -0.12], armR: -0.24, armRz: 0.08, scale: 0.85 },
  hammer: { pos: [0, -0.05, 0.04], rot: [-0.22, 0.2, -0.42], armR: -0.4, armRz: 0.14, scale: 0.76 },
  daggers: { pos: [0, -0.02, 0.03], rot: [0.35, 0, 2.85], armR: -0.2, armRz: 0.06, armL: -0.2, armLz: 0.06 },
  claws: { pos: [0, -0.03, 0.01], rot: [0.25, 0, 0], armR: -0.22, armRz: 0.08, armL: -0.22, armLz: 0.08 },
  grimoire: { pos: [0.33, Y.bust - 0.04, 0.22], rot: [0, -0.5, 0.1], armR: -0.34, armRz: 0.1 },
  chakram: { pos: [0.32, Y.bust + 0.04, 0.2], rot: [0, 0, 0], armR: -0.28, armRz: 0.1 },
};

export interface BuiltCharacter {
  root: THREE.Group;
  head: THREE.Group;
  hairBack: THREE.Group;
  armR: THREE.Group;
  armL: THREE.Group;
  legR: THREE.Group;
  legL: THREE.Group;
  chest: THREE.Group;
  weapon: THREE.Group | null;
  weaponFloat: boolean;
  cape: THREE.Group | null;
  spinners: THREE.Object3D[];
  headMesh: THREE.Mesh;
  headMaterial: THREE.MeshToonMaterial;
  height: number;
}

export function buildCharacter(look: Appearance, expr: Expression = 'idle', outlines = true): BuiltCharacter {
  const figure = look.figure ?? 0.5;
  const skinDark = shade(look.skin, -0.09);

  const mats: Mats = {
    skin: toon({ color: look.skin }),
    skinDark: toon({ color: skinDark }),
    cloth: toon({ color: look.outfit }),
    trim: toon({ color: look.outfitTrim }),
    trimMetal: metal(look.outfitTrim, 0.28),
    sheer: toon({ color: look.outfitTrim, transparent: true, opacity: 0.46 }),
    hair: toon({ color: look.hairColor }),
    hairTip: toon({ color: look.hairColor2 }),
    stocking: look.stockings ? toon({ color: look.stockings }) : null,
  };

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // ── ноги ───────────────────────────────────────────────────
  const legs = { l: new THREE.Group(), r: new THREE.Group() };
  const stockingTopY = Y.hip - 0.24;
  for (const side of ['l', 'r'] as const) {
    const sx = side === 'l' ? -1 : 1;
    const g = legs[side];
    g.position.set(sx * 0.072, Y.hip - 0.02, 0);
    g.rotation.z = sx * 0.035;
    if (side === 'l') {
      g.rotation.x = 0.07;
      g.position.z = -0.02;
    } else {
      g.rotation.x = -0.03;
    }

    const thighMat = mats.stocking && look.outfitStyle !== 'plate' ? mats.skin : mats.skin;
    const thigh = limb(R.thigh, R.knee, 0, -(Y.hip - Y.knee - 0.02), thighMat);
    silhouette(thigh);
    g.add(thigh);
    g.add(mesh(new THREE.SphereGeometry(R.knee * 1.05, 14, 12), mats.skin, [0, -(Y.hip - Y.knee - 0.02), 0]));

    const calfTop = -(Y.hip - Y.knee - 0.02);
    const calf = new THREE.Group();
    calf.position.set(0, calfTop, 0);
    const calfMat = mats.stocking ?? mats.skin;
    const c = limb(R.calf, R.ankle, 0, -(Y.knee - Y.ankle), calfMat);
    silhouette(c);
    calf.add(c);
    // сапог
    const footY = -(Y.knee - Y.ankle);
    const boot = mesh(new THREE.BoxGeometry(0.062, 0.042, 0.155), mats.cloth, [0, footY - 0.014, 0.036]);
    silhouette(boot);
    calf.add(boot);
    calf.add(mesh(new THREE.SphereGeometry(0.036, 12, 10), mats.cloth, [0, footY + 0.012, 0]));
    const heel = mesh(new THREE.CylinderGeometry(0.011, 0.014, 0.035, 6), mats.trim, [0, footY - 0.034, -0.022]);
    calf.add(heel);
    g.add(calf);

    // чулок с кружевом
    if (mats.stocking) {
      const sock = mesh(
        new THREE.CylinderGeometry(R.thigh * 1.03, R.knee * 1.05, Y.hip - 0.02 - stockingTopY, 14, 1, true),
        mats.stocking,
        [0, -(Y.hip - 0.02 - stockingTopY) / 2 - (Y.hip - 0.02 - stockingTopY) * 0, 0],
      );
      sock.position.y = -((Y.hip - 0.02 - stockingTopY) / 2) - 0.06;
      sock.scale.setScalar(1.0);
      g.add(sock);
      const lace = mesh(new THREE.TorusGeometry(R.thigh * 1.05, 0.008, 6, 18), mats.trim, [0, -0.06 - (Y.hip - 0.02 - stockingTopY) + 0.004, 0]);
      lace.rotation.x = Math.PI / 2;
      g.add(lace);
    }
    body.add(g);
  }

  // ── торс ───────────────────────────────────────────────────
  const chest = new THREE.Group();
  const torso = mesh(torsoGeometry(figure), mats.skin);
  silhouette(torso);
  chest.add(torso);
  chest.add(bust(mats, figure));
  body.add(chest);

  // ── руки ───────────────────────────────────────────────────
  const arms = { l: new THREE.Group(), r: new THREE.Group() };
  const hands = { l: new THREE.Group(), r: new THREE.Group() };
  for (const side of ['l', 'r'] as const) {
    const sx = side === 'l' ? -1 : 1;
    const g = arms[side];
    g.position.set(sx * R.shoulderX, Y.shoulder - 0.03, 0);
    g.rotation.z = sx * 0.14;

    const deltoid = mesh(new THREE.SphereGeometry(R.upperArm * 1.42, 14, 12), mats.skin, [0, 0.016, 0]);
    deltoid.scale.set(1, 0.95, 1);
    silhouette(deltoid);
    g.add(deltoid);
    const upper = limb(R.upperArm, R.elbow, 0, -0.3, mats.skin);
    silhouette(upper);
    g.add(upper);
    g.add(mesh(new THREE.SphereGeometry(R.elbow * 1.06, 12, 10), mats.skin, [0, -0.3, 0]));

    const fore = new THREE.Group();
    fore.position.set(0, -0.3, 0);
    const f = limb(R.forearm, R.wrist, 0, -0.28, mats.skin);
    silhouette(f);
    fore.add(f);
    const hand = hands[side];
    hand.position.set(0, -0.28, 0);
    const palm = mesh(new THREE.SphereGeometry(0.039, 12, 10), mats.skin);
    palm.scale.set(0.82, 1.25, 0.62);
    hand.add(palm);
    const thumb = mesh(new THREE.CapsuleGeometry(0.011, 0.03, 4, 8), mats.skin, [sx * 0.026, -0.012, 0.012]);
    thumb.rotation.z = sx * 0.6;
    hand.add(thumb);
    fore.add(hand);
    g.add(fore);
    body.add(g);
  }

  // ── шея и голова ───────────────────────────────────────────
  body.add(mesh(new THREE.CylinderGeometry(R.neck, R.neck * 1.12, 0.1, 14), mats.skinDark, [0, Y.chin - 0.06, 0]));

  const head = new THREE.Group();
  head.position.set(0, 0, 0);
  const headMat = new THREE.MeshToonMaterial({
    map: headTexture(look, expr),
    gradientMap: (mats.skin as THREE.MeshToonMaterial).gradientMap,
  });
  const skull = mesh(headGeometry(), headMat, [0, Y.head, 0]);
  silhouette(skull);
  head.add(skull);
  for (const sx of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(0.024, 10, 8), mats.skin, [sx * R.head * 0.93, Y.head - 0.012, 0]);
    ear.scale.set(0.5, 1.2, 0.8);
    head.add(ear);
  }
  const hair = buildHair(look, mats);
  head.add(hair.group);
  const acc = buildAccessory(look, mats);
  if (acc) head.add(acc);
  body.add(head);

  // ── костюм ─────────────────────────────────────────────────
  const outfit = new THREE.Group();
  const st = look.outfitStyle;

  if (st === 'leotard') {
    outfit.add(cups(mats.cloth, figure));
    outfit.add(band(Y.bust - 0.045, Y.underBust - 0.02, 1.04, mats.cloth, figure));
    outfit.add(briefs(mats.cloth));
    for (const sx of [-1, 1]) {
      const strap = mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.2, 6), mats.cloth, [sx * 0.075, Y.bust + 0.09, 0.04]);
      strap.rotation.x = -0.32;
      strap.rotation.z = sx * 0.26;
      outfit.add(strap);
    }
    outfit.add(belt(mats.trim, Y.hip + 0.04));
    outfit.add(garter(mats.trim));
    for (const side of ['l', 'r'] as const) {
      const sx = side === 'l' ? -1 : 1;
      const gl = mesh(new THREE.CylinderGeometry(R.forearm * 1.1, R.wrist * 1.15, 0.22, 12, 1, true), mats.cloth, [
        sx * R.shoulderX,
        Y.shoulder - 0.44,
        0,
      ]);
      outfit.add(gl);
    }
  } else if (st === 'plate') {
    outfit.add(cups(mats.trimMetal, figure));
    outfit.add(band(Y.bust - 0.05, Y.underBust - 0.03, 1.06, mats.trimMetal, figure));
    outfit.add(briefs(mats.cloth));
    outfit.add(pauldrons(mats.trimMetal));
    outfit.add(collarPiece(mats.trimMetal, 0.06));
    outfit.add(belt(mats.trimMetal, Y.hip + 0.045));
    // набедренные пластины
    for (const a of [-0.55, 0.55, Math.PI - 0.55, Math.PI + 0.55]) {
      const pl = mesh(new THREE.CylinderGeometry(R.hip * 1.1, R.hip * 1.22, 0.26, 12, 1, true, a - 0.32, 0.64), mats.trimMetal, [
        0,
        Y.hip - 0.09,
        0,
      ]);
      pl.scale.z = 0.84;
      silhouette(pl);
      outfit.add(pl);
    }
    for (const side of ['l', 'r'] as const) {
      const sx = side === 'l' ? -1 : 1;
      outfit.add(
        mesh(new THREE.CylinderGeometry(R.forearm * 1.18, R.wrist * 1.3, 0.2, 12, 1, true), mats.trimMetal, [
          sx * R.shoulderX,
          Y.shoulder - 0.45,
          0,
        ]),
      );
    }
  } else if (st === 'slit') {
    outfit.add(cups(mats.cloth, figure));
    outfit.add(band(Y.bust - 0.02, Y.hip + 0.04, 1.05, mats.cloth, figure));
    outfit.add(
      panelSkirt(mats.cloth, 0.62, 1.35, [
        { start: -0.72, span: 1.44 },
        { start: Math.PI - 0.72, span: 1.44 },
      ]),
    );
    outfit.add(belt(mats.trim, Y.hip + 0.05));
    outfit.add(collarPiece(mats.trim, 0.075));
    for (const sx of [-1, 1]) {
      const sleeve = mesh(new THREE.CylinderGeometry(R.upperArm * 1.3, R.wrist * 2.4, 0.42, 12, 1, true), mats.sheer, [
        sx * R.shoulderX,
        Y.shoulder - 0.36,
        0,
      ]);
      outfit.add(sleeve);
    }
  } else if (st === 'coat') {
    outfit.add(cups(mats.trim, figure));
    outfit.add(band(Y.bust - 0.04, Y.underBust - 0.03, 1.05, mats.trim, figure));
    outfit.add(shorts(mats.cloth, 0.17));
    outfit.add(belt(mats.trim, Y.hip + 0.05));
    // распахнутый плащ
    const coat = panelSkirt(
      mats.cloth,
      0.86,
      1.3,
      [
        { start: Math.PI - 1.35, span: 2.7 },
        { start: -1.5, span: 0.55 },
        { start: 0.95, span: 0.55 },
      ],
      Y.shoulder - 0.02,
    );
    outfit.add(coat);
    outfit.add(pauldrons(mats.trimMetal));
    outfit.add(garter(mats.trim));
  } else if (st === 'sarashi') {
    // бинты на груди
    for (let i = 0; i < 4; i++) {
      const y = Y.bust + 0.045 - i * 0.038;
      const w = band(y, y - 0.032, 1.06, i % 2 === 0 ? mats.cloth : mats.trim, figure);
      outfit.add(w);
    }
    outfit.add(
      panelSkirt(mats.cloth, 0.4, 1.5, [
        { start: -1.2, span: 2.4 },
        { start: Math.PI - 1.2, span: 2.4 },
      ]),
    );
    outfit.add(belt(mats.trim, Y.hip + 0.045));
    for (const side of ['l', 'r'] as const) {
      const sx = side === 'l' ? -1 : 1;
      for (let i = 0; i < 3; i++) {
        outfit.add(
          mesh(new THREE.TorusGeometry(R.forearm * 1.15, 0.009, 6, 14), mats.trim, [
            sx * R.shoulderX,
            Y.shoulder - 0.4 - i * 0.05,
            0,
          ]).rotateX(Math.PI / 2),
        );
      }
    }
  } else if (st === 'robe') {
    outfit.add(cups(mats.trim, figure));
    outfit.add(briefs(mats.cloth));
    const robe = mesh(new THREE.CylinderGeometry(R.hip * 1.02, R.hip * 1.9, 0.86, 22, 1, true), mats.sheer, [0, Y.hip - 0.4, 0]);
    robe.scale.z = 0.88;
    outfit.add(robe);
    outfit.add(
      panelSkirt(mats.cloth, 0.3, 1.2, [
        { start: -0.9, span: 1.8 },
        { start: Math.PI - 0.9, span: 1.8 },
      ]),
    );
    outfit.add(belt(mats.trim, Y.hip + 0.045));
    outfit.add(collarPiece(mats.trim, 0.08));
    for (const sx of [-1, 1]) {
      const sleeve = mesh(new THREE.CylinderGeometry(R.upperArm * 1.5, R.wrist * 3.2, 0.5, 14, 1, true), mats.sheer, [
        sx * R.shoulderX,
        Y.shoulder - 0.4,
        0,
      ]);
      outfit.add(sleeve);
    }
  } else if (st === 'harness') {
    outfit.add(cups(mats.cloth, figure));
    // портупея крест-накрест
    for (const sx of [-1, 1]) {
      const s1 = mesh(new THREE.BoxGeometry(0.022, 0.36, 0.012), mats.trim, [sx * 0.045, Y.bust - 0.03, R.bust * 0.62]);
      s1.rotation.z = sx * 0.5;
      outfit.add(s1);
      const s2 = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), mats.trim, [sx * 0.09, Y.bust + 0.08, 0.02]);
      s2.rotation.x = -0.3;
      s2.rotation.z = sx * 0.3;
      outfit.add(s2);
    }
    outfit.add(briefs(mats.cloth));
    outfit.add(belt(mats.trim, Y.hip + 0.035));
    outfit.add(garter(mats.trim));
    for (const sx of [-1, 1]) {
      const t = mesh(new THREE.TorusGeometry(R.thigh * 1.12, 0.014, 6, 16), mats.trim, [sx * 0.082, Y.hip - 0.13, 0]);
      t.rotation.x = Math.PI / 2;
      outfit.add(t);
    }
    for (const side of ['l', 'r'] as const) {
      const sx = side === 'l' ? -1 : 1;
      outfit.add(
        mesh(new THREE.CylinderGeometry(R.forearm * 1.15, R.wrist * 1.2, 0.24, 12, 1, true), mats.cloth, [
          sx * R.shoulderX,
          Y.shoulder - 0.45,
          0,
        ]),
      );
    }
  } else {
    // qipao
    outfit.add(band(Y.bust + 0.06, Y.hip + 0.02, 1.05, mats.cloth, figure));
    outfit.add(
      panelSkirt(mats.cloth, 0.42, 1.18, [
        { start: -0.95, span: 1.9 },
        { start: Math.PI - 0.95, span: 1.9 },
      ]),
    );
    outfit.add(collarPiece(mats.trim, 0.075));
    outfit.add(belt(mats.trim, Y.hip + 0.03));
    outfit.add(garter(mats.trim));
    for (const sx of [-1, 1]) {
      outfit.add(
        mesh(new THREE.CylinderGeometry(R.upperArm * 1.2, R.upperArm * 1.35, 0.12, 12, 1, true), mats.cloth, [
          sx * R.shoulderX,
          Y.shoulder - 0.1,
          0,
        ]),
      );
    }
  }
  body.add(outfit);

  // ── плащ ───────────────────────────────────────────────────
  let cape: THREE.Group | null = null;
  if (look.cape) {
    cape = new THREE.Group();
    cape.position.set(0, Y.shoulder + 0.02, -0.055);
    const cloth = mesh(new THREE.CylinderGeometry(R.bust * 0.95, R.hip * 2.1, 0.92, 20, 1, true, Math.PI - 1.15, 2.3), mats.trim, [
      0,
      -0.44,
      0,
    ]);
    cloth.scale.z = 0.85;
    silhouette(cloth);
    cape.add(cloth);
    cape.add(mesh(new THREE.TorusGeometry(R.neck * 1.7, 0.014, 6, 18, Math.PI * 1.2), mats.trimMetal, [0, 0.05, 0.02]));
    body.add(cape);
  }

  // ── оружие ─────────────────────────────────────────────────
  const built = buildWeapon(look.weapon, look.outfitTrim, look.aura);
  const pose = WEAPON_POSE[look.weapon];
  let weaponGroup: THREE.Group | null = null;
  if (built.floating) {
    weaponGroup = new THREE.Group();
    weaponGroup.position.set(pose.pos[0], pose.pos[1], pose.pos[2]);
    weaponGroup.add(built.main);
    body.add(weaponGroup);
  } else {
    weaponGroup = built.main;
    weaponGroup.position.set(...pose.pos);
    weaponGroup.rotation.set(...pose.rot);
    weaponGroup.scale.setScalar(pose.scale ?? 1);
    hands.r.add(weaponGroup);
    if (built.off) {
      built.off.position.set(pose.pos[0], pose.pos[1], pose.pos[2]);
      built.off.rotation.set(pose.rot[0], -pose.rot[1], -pose.rot[2]);
      built.off.scale.setScalar(pose.scale ?? 1);
      hands.l.add(built.off);
    }
  }

  // поза рук
  arms.r.rotation.x = pose.armR;
  arms.r.rotation.z = 0.14 + (pose.armRz ?? 0);
  arms.l.rotation.x = pose.armL ?? 0.08;
  arms.l.rotation.z = -0.14 - (pose.armLz ?? 0);

  // ── аура под ногами ────────────────────────────────────────
  const ring = mesh(new THREE.RingGeometry(0.16, 0.3, 32), glow(look.aura, 0.35), [0, 0.006, 0]);
  ring.rotation.x = -Math.PI / 2;
  ring.name = 'auraRing';
  root.add(ring);

  const spinners: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o.name === 'spin' || o.name === 'halo') spinners.push(o);
  });

  if (outlines) buildOutlines(root, 1.045);

  const height = 1.62 + figure * 0.14;
  root.scale.setScalar(height / 1.7);

  return {
    root,
    head,
    hairBack: hair.back,
    armR: arms.r,
    armL: arms.l,
    legR: legs.r,
    legL: legs.l,
    chest,
    weapon: weaponGroup,
    weaponFloat: Boolean(built.floating),
    cape,
    spinners,
    headMesh: skull,
    headMaterial: headMat,
    height,
  };
}
