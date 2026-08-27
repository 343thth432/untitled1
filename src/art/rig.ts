import type { Appearance } from '../game/types';
import {
  BH,
  BW,
  HAND_ANCHOR,
  PART_ORDER,
  SK,
  buildParts,
  type Part,
  type PartName,
  type Parts,
} from './illustration/body';
import { twoHanded, weaponArt, type WeaponArt } from './illustration/weapon';

export { BW, BH, SK };

/** Иерархия костей: таз — корень, ноги отдельно от корпуса */
const PARENT: Record<PartName, PartName | null> = {
  cape: 'torso',
  backHair: 'head',
  armFarUpper: 'torso',
  armFarFore: 'armFarUpper',
  legFarThigh: null,
  legFarShin: 'legFarThigh',
  legNearThigh: null,
  legNearShin: 'legNearThigh',
  torso: null,
  skirt: 'torso',
  head: 'torso',
  armNearUpper: 'torso',
  armNearFore: 'armNearUpper',
};

export type AnimName = 'idle' | 'attack' | 'cast' | 'hurt' | 'dead' | 'win';

export interface Pose {
  rootX: number;
  rootY: number;
  rootRot: number;
  stretch: number;
  rot: Partial<Record<PartName, number>>;
  weapon: number;
  alpha: number;
}

export interface Rig {
  parts: Parts;
  weapon: WeaponArt;
  look: Appearance;
  quality: number;
}

const rigCache = new Map<string, Rig>();

export function buildRig(look: Appearance, id: string, quality = 1): Rig {
  const key = `${id}|${quality}`;
  const hit = rigCache.get(key);
  if (hit) return hit;
  const rig: Rig = {
    parts: buildParts(look, id, quality),
    weapon: weaponArt(look, quality),
    look,
    quality,
  };
  rigCache.set(key, rig);
  return rig;
}

/** стабильный ключ образа — сид для прядей и складок */
export function lookKey(look: Appearance): string {
  return [
    look.hair,
    look.hairColor,
    look.eyeColor,
    look.skin,
    look.outfit,
    look.outfitStyle,
    look.accessory,
    look.weapon,
    look.aura,
  ].join('-');
}

export function clearRigCache(): void {
  rigCache.clear();
}

// ── матрицы ──────────────────────────────────────────────────
type M = [number, number, number, number, number, number];
const ID: M = [1, 0, 0, 1, 0, 0];

function mul(m: M, n: M): M {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

function tr(x: number, y: number): M {
  return [1, 0, 0, 1, x, y];
}

function rot(r: number): M {
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [c, s, -s, c, 0, 0];
}

function scl(x: number, y: number): M {
  return [x, 0, 0, y, 0, 0];
}

function apply(m: M, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

// ── позы ─────────────────────────────────────────────────────
function base(): Pose {
  return { rootX: 0, rootY: 0, rootRot: 0, stretch: 1, rot: {}, weapon: 0, alpha: 1 };
}

const ease = (t: number): number => t * t * (3 - 2 * t);

/** ключевые кадры: [время 0..1, значение] */
function track(ph: number, stops: [number, number][]): number {
  if (ph <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (ph <= stops[i][0]) {
      const [t0, v0] = stops[i - 1];
      const [t1, v1] = stops[i];
      return v0 + (v1 - v0) * ease((ph - t0) / Math.max(1e-4, t1 - t0));
    }
  }
  return stops[stops.length - 1][1];
}

// Знак поворота руки: «+» — мах назад (влево), «−» — вперёд (вправо).

/** дыхание, покачивание, контрапост */
function idlePose(t: number): Pose {
  const b = Math.sin(t * 1.9);
  const s = Math.sin(t * 0.86);
  const p = base();
  p.rootX = s * 1.6;
  p.rootY = 2 + b * 2.4;
  p.rootRot = s * 0.008;
  p.stretch = 1 + b * 0.006;
  p.rot = {
    torso: -0.03 + s * 0.014,
    head: 0.05 - s * 0.022,
    backHair: -0.02 + s * 0.05,
    cape: s * 0.06,
    skirt: s * 0.035,
    armNearUpper: 0.06 + b * 0.02,
    armNearFore: -0.2 - b * 0.03,
    armFarUpper: -0.07 - b * 0.018,
    armFarFore: -0.15 - b * 0.024,
    legNearThigh: 0.018,
    legNearShin: -0.024,
    legFarThigh: -0.022,
    legFarShin: 0.026,
  };
  p.weapon = s * 0.04;
  return p;
}

function add(p: Pose, d: Partial<Record<PartName, number>>): Pose {
  for (const k of Object.keys(d) as PartName[]) p.rot[k] = (p.rot[k] ?? 0) + (d[k] ?? 0);
  return p;
}

/** замах над плечом и рубящий удар вперёд */
function attackPose(t: number, ph: number): Pose {
  const p = idlePose(t);
  const up = track(ph, [[0, 0], [0.3, 1], [0.46, 0], [1, 0]]);
  const fw = track(ph, [[0.3, 0], [0.46, 1], [0.64, 0.7], [1, 0]]);
  p.rootX += -10 * up + 30 * fw;
  p.rootRot += 0.04 * fw;
  add(p, {
    torso: 0.13 * up - 0.2 * fw,
    head: 0.06 * up - 0.13 * fw,
    armNearUpper: 1.85 * up - 0.9 * fw,
    armNearFore: 0.45 * up - 0.3 * fw,
    armFarUpper: -0.3 * up + 0.36 * fw,
    armFarFore: -0.2 * up + 0.22 * fw,
    legNearThigh: -0.08 * up + 0.18 * fw,
    legNearShin: 0.04 * up - 0.08 * fw,
    legFarThigh: 0.07 * up - 0.13 * fw,
    cape: 0.28 * up - 0.44 * fw,
    skirt: 0.15 * up - 0.24 * fw,
    backHair: 0.17 * up - 0.3 * fw,
  });
  p.weapon += 0.3 * up - 0.35 * fw;
  return p;
}

/** каст: обе руки вверх, оружие остриём в небо */
function castPose(t: number, ph: number): Pose {
  const p = idlePose(t);
  const up = track(ph, [[0, 0], [0.34, 1], [0.74, 1], [1, 0]]);
  const puls = Math.sin(ph * Math.PI * 8) * 0.045 * up;
  p.rootY -= up * 11;
  add(p, {
    torso: up * 0.1,
    head: up * 0.15,
    armNearUpper: -2.32 * up + puls,
    armNearFore: -0.34 * up,
    armFarUpper: -1.98 * up - puls,
    armFarFore: -0.3 * up,
    cape: up * 0.2,
    backHair: up * 0.17,
    skirt: up * 0.06,
    legNearThigh: -up * 0.05,
  });
  p.weapon += up * 2.36;
  return p;
}

function hurtPose(t: number, ph: number): Pose {
  const p = idlePose(t);
  const k = track(ph, [[0, 0], [0.16, 1], [1, 0]]);
  p.rootX -= k * 20;
  p.rootRot += k * 0.06;
  add(p, {
    torso: k * 0.24,
    head: k * 0.34,
    armNearUpper: k * 0.6,
    armNearFore: k * 0.45,
    armFarUpper: k * 0.5,
    armFarFore: k * 0.4,
    legNearThigh: -k * 0.18,
    legFarThigh: k * 0.12,
    cape: k * 0.3,
    backHair: k * 0.36,
  });
  return p;
}

function deadPose(t: number, ph: number): Pose {
  const p = idlePose(t * 0.2);
  const k = ease(Math.min(1, ph / 0.68));
  p.rootRot += k * 1.28;
  p.rootY += k * 118;
  p.rootX -= k * 46;
  p.alpha = 1 - ease(Math.max(0, (ph - 0.55) / 0.45)) * 0.9;
  add(p, {
    torso: k * 0.2,
    head: k * 0.42,
    armNearUpper: k * 0.85,
    armNearFore: k * 0.5,
    armFarUpper: k * 0.7,
    armFarFore: k * 0.45,
    legNearThigh: -k * 0.5,
    legNearShin: k * 0.72,
    legFarThigh: -k * 0.28,
    legFarShin: k * 0.44,
    backHair: k * 0.45,
    cape: k * 0.34,
  });
  return p;
}

function winPose(t: number, ph: number): Pose {
  const p = idlePose(t);
  const k = track(ph, [[0, 0], [0.22, 1], [0.82, 1], [1, 0]]);
  p.rootY -= Math.abs(Math.sin(ph * Math.PI * 2)) * 11 * k;
  add(p, {
    torso: k * 0.05,
    head: -k * 0.1,
    armNearUpper: -2.5 * k,
    armNearFore: -0.22 * k,
    armFarUpper: 0.5 * k,
    armFarFore: 1.15 * k,
    cape: k * 0.2,
    backHair: k * 0.16,
  });
  p.weapon += k * 2.5;
  return p;
}

export function poseFor(anim: AnimName, t: number, ph: number): Pose {
  switch (anim) {
    case 'attack':
      return attackPose(t, ph);
    case 'cast':
      return castPose(t, ph);
    case 'hurt':
      return hurtPose(t, ph);
    case 'dead':
      return deadPose(t, ph);
    case 'win':
      return winPose(t, ph);
    default:
      return idlePose(t);
  }
}

// ── отрисовка ────────────────────────────────────────────────
function partMatrix(
  name: PartName,
  parts: Parts,
  pose: Pose,
  root: M,
  memo: Map<PartName, M>,
): M {
  const hit = memo.get(name);
  if (hit) return hit;
  const parent = PARENT[name];
  const b = parent ? partMatrix(parent, parts, pose, root, memo) : root;
  const j = parts[name].joint;
  const r = pose.rot[name] ?? 0;
  const m = mul(mul(mul(b, tr(j[0], j[1])), rot(r)), tr(-j[0], -j[1]));
  memo.set(name, m);
  return m;
}

function drawPart(ctx: CanvasRenderingContext2D, p: Part, m: M): void {
  ctx.save();
  ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
  ctx.drawImage(p.canvas, p.ox, p.oy, p.w, p.h);
  ctx.restore();
}

export interface DrawOpts {
  /** время в секундах для цикла покоя */
  t: number;
  anim: AnimName;
  /** прогресс одноразовой анимации 0..1 */
  phase: number;
  /** смотрит влево */
  flip?: boolean;
  /** дополнительная прозрачность */
  alpha?: number;
}

/**
 * Рисует героиню в текущей системе координат так,
 * что ступни стоят в (0,0), а фигура смотрит вправо.
 */
export function drawRig(ctx: CanvasRenderingContext2D, rig: Rig, o: DrawOpts): void {
  const pose = poseFor(o.anim, o.t, o.phase);
  const { parts } = rig;
  const hip: P2 = [SK.cx, SK.hipY];

  ctx.save();
  ctx.globalAlpha *= pose.alpha * (o.alpha ?? 1);
  if (o.flip) ctx.scale(-1, 1);
  ctx.translate(-SK.cx, -SK.ground);

  let root: M = mul(tr(pose.rootX, pose.rootY), ID);
  root = mul(mul(mul(root, tr(hip[0], hip[1])), rot(pose.rootRot)), tr(-hip[0], -hip[1]));
  if (pose.stretch !== 1) {
    root = mul(mul(mul(root, tr(0, SK.ground)), scl(1, pose.stretch)), tr(0, -SK.ground));
  }

  const memo = new Map<PartName, M>();
  const two = twoHanded(rig.look.weapon);
  if (two) {
    pose.rot.armFarUpper = (pose.rot.armFarUpper ?? 0) - 0.42;
    pose.rot.armFarFore = (pose.rot.armFarFore ?? 0) - 0.5;
  }

  for (const name of PART_ORDER) {
    drawPart(ctx, parts[name], partMatrix(name, parts, pose, root, memo));
  }

  // оружие в ближней кисти
  const m = partMatrix('armNearFore', parts, pose, root, memo);
  const wm = mul(mul(tr(...apply(m, HAND_ANCHOR[0], HAND_ANCHOR[1])), rot(
    Math.atan2(m[1], m[0]) + 0.22 + pose.weapon,
  )), ID);
  ctx.save();
  ctx.transform(wm[0], wm[1], wm[2], wm[3], wm[4], wm[5]);
  const w = rig.weapon;
  const ws = 0.82;
  ctx.scale(ws, ws);
  ctx.drawImage(w.canvas, -w.grip[0], -w.grip[1], w.w, w.h);
  ctx.restore();

  ctx.restore();
}

type P2 = [number, number];

/** тень под ногами */
export function drawShadow(ctx: CanvasRenderingContext2D, scale = 1, alpha = 0.22): void {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.ellipse(0, 0, 92, 20, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(60,50,78,${alpha})`;
  ctx.fill();
  ctx.restore();
}
