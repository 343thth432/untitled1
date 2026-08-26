import * as THREE from 'three';
import type { Appearance } from '../../game/types';
import { buildCharacter, type AnimState, type BuiltCharacter } from './character';
import { headTexture, type Expression } from './face';

const ONE_SHOT: Record<string, number> = { attack: 0.5, cast: 0.75, hurt: 0.28 };

/** Обёртка над моделью: поза, дыхание, замахи, смерть */
export class Actor {
  readonly built: BuiltCharacter;
  readonly root: THREE.Group;
  private t = Math.random() * 10;
  private shot: { kind: 'attack' | 'cast' | 'hurt'; p: number } | null = null;
  private deadT = 0;
  private _dead = false;
  private look: Appearance;

  constructor(look: Appearance, opts: { outlines?: boolean; expression?: Expression } = {}) {
    this.look = look;
    this.built = buildCharacter(look, opts.expression ?? 'idle', opts.outlines ?? true);
    this.root = this.built.root;
  }

  trigger(kind: 'attack' | 'cast' | 'hurt'): void {
    if (this._dead) return;
    if (this.shot && this.shot.kind === 'cast' && kind !== 'cast') return;
    this.shot = { kind, p: 0 };
  }

  setDead(dead: boolean): void {
    if (dead === this._dead) return;
    this._dead = dead;
    this.deadT = 0;
    const mat = this.built.headMaterial;
    mat.map = headTexture(this.look, dead ? 'closed' : 'idle');
    mat.needsUpdate = true;
  }

  get dead(): boolean {
    return this._dead;
  }

  update(dt: number): void {
    this.t += dt;
    const b = this.built;
    const body = this.root.children[0] as THREE.Group;

    for (const s of b.spinners) s.rotation.z += dt * 1.4;

    if (this._dead) {
      this.deadT = Math.min(1, this.deadT + dt * 2.4);
      const e = ease(this.deadT);
      this.root.rotation.x = -1.32 * e;
      this.root.position.y = -0.06 * e;
      body.position.y = 0;
      return;
    }

    this.root.rotation.x += (0 - this.root.rotation.x) * Math.min(1, dt * 8);
    this.root.position.y += (0 - this.root.position.y) * Math.min(1, dt * 8);

    // дыхание
    const breathe = Math.sin(this.t * 1.7);
    body.position.y = breathe * 0.011;
    b.chest.scale.setScalar(1 + breathe * 0.006);
    b.head.rotation.z = Math.sin(this.t * 0.8) * 0.025;
    b.head.rotation.y = Math.sin(this.t * 0.53) * 0.06;
    b.hairBack.rotation.x = 0.05 + Math.sin(this.t * 1.2) * 0.045;
    b.hairBack.rotation.z = Math.sin(this.t * 0.9) * 0.05;
    if (b.cape) {
      b.cape.rotation.x = 0.1 + Math.sin(this.t * 1.05) * 0.06;
      b.cape.rotation.z = Math.sin(this.t * 0.7) * 0.045;
    }
    if (b.weaponFloat && b.weapon) {
      b.weapon.position.y = 1.19 + Math.sin(this.t * 1.5) * 0.035;
      b.weapon.rotation.y = Math.sin(this.t * 0.6) * 0.25;
    }

    const idleArmR = -0.3 + Math.sin(this.t * 1.6) * 0.05;
    const idleArmL = 0.06 + Math.sin(this.t * 1.6 + 1) * 0.05;

    let armR = idleArmR;
    let armL = idleArmL;
    let lean = 0;
    let forward = 0;
    let auraScale = 1;

    if (this.shot) {
      const dur = ONE_SHOT[this.shot.kind];
      this.shot.p += dt / dur;
      const p = Math.min(1, this.shot.p);
      if (this.shot.kind === 'attack') {
        const swing = Math.sin(p * Math.PI);
        armR = idleArmR - swing * 2.1;
        armL = idleArmL - swing * 0.5;
        forward = swing * 0.16;
        lean = swing * 0.16;
      } else if (this.shot.kind === 'cast') {
        const rise = Math.sin(Math.min(1, p * 1.5) * Math.PI * 0.5);
        const fall = p > 0.7 ? (p - 0.7) / 0.3 : 0;
        armR = idleArmR - rise * 2.5 + fall * 1.2;
        armL = idleArmL - rise * 0.9;
        lean = -rise * 0.12;
        auraScale = 1 + rise * 0.9;
      } else {
        const k = Math.sin(p * Math.PI);
        lean = -k * 0.28;
        forward = -k * 0.1;
        armR = idleArmR + k * 0.5;
        armL = idleArmL + k * 0.5;
      }
      if (p >= 1) this.shot = null;
    }

    b.armR.rotation.x = armR;
    b.armL.rotation.x = armL;
    body.rotation.x = lean;
    body.position.z = forward;

    const ring = this.root.getObjectByName('auraRing');
    if (ring) ring.scale.setScalar(auraScale * (1 + Math.sin(this.t * 2) * 0.04));
  }

  dispose(): void {
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.geometry?.dispose();
    });
  }
}

function ease(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

export type { AnimState };
