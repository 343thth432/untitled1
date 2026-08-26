import * as THREE from 'three';
import type { Appearance } from '../../game/types';

export type Expression = 'idle' | 'fierce' | 'closed';

const cache = new Map<string, THREE.CanvasTexture>();

/**
 * Текстура головы целиком: кожа + аниме-лицо, вписанное ровно в тот кусок
 * UV-развёртки сферы, который смотрит вперёд. Отдельного «щитка» нет —
 * значит нет ни z-файтинга, ни проблем с сортировкой прозрачных мешей.
 */
export function headTexture(look: Appearance, expr: Expression = 'idle'): THREE.CanvasTexture {
  const key = `${look.skin}|${look.eyeColor}|${look.hairColor}|${look.mood}|${expr}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const W = 1024;
  const H = 512;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d');
  if (!g) throw new Error('нет 2d-контекста');

  g.fillStyle = look.skin;
  g.fillRect(0, 0, W, H);

  // область лица в UV-развёртке сферы (phi ≈ π/2 ± 0.78, theta 0.72…1.92)
  const fx = 0.126 * W;
  const fw = 0.248 * W;
  const fy = 0.216 * H;
  const fh = 0.382 * H;

  drawFace(g, look, expr, fx, fy, fw, fh);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

/** Отдельная картинка лица — для отладки и иконок */
export function faceSprite(look: Appearance, expr: Expression = 'idle', size = 256): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const g = cv.getContext('2d');
  if (g) {
    g.fillStyle = look.skin;
    g.fillRect(0, 0, size, size);
    drawFace(g, look, expr, 0, 0, size, size);
  }
  return cv;
}

function drawFace(
  g: CanvasRenderingContext2D,
  look: Appearance,
  expr: Expression,
  ox: number,
  oy: number,
  w: number,
  h: number,
): void {
  const mood = expr === 'fierce' ? Math.min(look.mood, 0.25) : look.mood;
  const lash = darken(look.hairColor, 0.45);

  const cx = ox + w * 0.5;
  const eyeY = oy + h * 0.5;
  const eyeDX = w * 0.225;
  const eyeW = w * 0.158;
  const eyeH = (expr === 'closed' ? 0.014 : 0.175 - (1 - mood) * 0.018) * h;

  g.save();

  // румянец
  for (const sx of [-1, 1]) {
    const bx = cx + sx * w * 0.28;
    const by = eyeY + h * 0.15;
    const rg = g.createRadialGradient(bx, by, 2, bx, by, w * 0.13);
    rg.addColorStop(0, 'rgba(255,132,158,0.5)');
    rg.addColorStop(1, 'rgba(255,132,158,0)');
    g.fillStyle = rg;
    g.beginPath();
    g.ellipse(bx, by, w * 0.13, h * 0.075, 0, 0, Math.PI * 2);
    g.fill();
  }

  for (const side of [-1, 1]) {
    const ex = cx + side * eyeDX;

    if (expr === 'closed') {
      g.strokeStyle = lash;
      g.lineWidth = w * 0.028;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(ex - eyeW, eyeY);
      g.quadraticCurveTo(ex, eyeY + h * 0.055, ex + eyeW, eyeY);
      g.stroke();
      continue;
    }

    g.fillStyle = '#fdfbff';
    g.beginPath();
    g.ellipse(ex, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
    g.fill();

    const ig = g.createLinearGradient(ex, eyeY - eyeH, ex, eyeY + eyeH);
    ig.addColorStop(0, darken(look.eyeColor, 0.4));
    ig.addColorStop(0.55, look.eyeColor);
    ig.addColorStop(1, lighten(look.eyeColor, 0.45));
    g.fillStyle = ig;
    g.beginPath();
    g.ellipse(ex, eyeY + eyeH * 0.06, eyeW * 0.78, eyeH * 0.9, 0, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = '#180f26';
    g.beginPath();
    g.ellipse(ex, eyeY + eyeH * 0.1, eyeW * 0.33, eyeH * 0.52, 0, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(ex - side * eyeW * 0.3, eyeY - eyeH * 0.42, eyeW * 0.27, eyeH * 0.23, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 0.72;
    g.beginPath();
    g.ellipse(ex + side * eyeW * 0.34, eyeY + eyeH * 0.46, eyeW * 0.15, eyeH * 0.12, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;

    g.strokeStyle = lash;
    g.lineWidth = w * 0.038;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(ex - eyeW * 1.1, eyeY - eyeH * 0.45);
    g.quadraticCurveTo(ex, eyeY - eyeH * 1.5, ex + eyeW * 1.1, eyeY - eyeH * 0.38);
    g.stroke();
    g.lineWidth = w * 0.019;
    g.beginPath();
    g.moveTo(ex + side * eyeW * 1.04, eyeY - eyeH * 0.46);
    g.lineTo(ex + side * eyeW * 1.5, eyeY - eyeH * 1.15);
    g.stroke();

    const browY = eyeY - eyeH * 1.95 - (1 - mood) * h * 0.012;
    const tilt = (0.5 - mood) * h * 0.075;
    g.strokeStyle = darken(look.hairColor, 0.2);
    g.lineWidth = w * 0.024;
    g.beginPath();
    g.moveTo(ex - side * eyeW * 1.02, browY);
    g.quadraticCurveTo(ex, browY - h * 0.026 + tilt, ex + side * eyeW * 1.06, browY + h * 0.016 + tilt * 0.4);
    g.stroke();
  }

  g.strokeStyle = 'rgba(150,95,95,0.55)';
  g.lineWidth = w * 0.013;
  g.beginPath();
  g.moveTo(cx + w * 0.015, eyeY + h * 0.155);
  g.lineTo(cx + w * 0.032, eyeY + h * 0.185);
  g.stroke();

  const mouthY = eyeY + h * 0.3;
  g.strokeStyle = '#bd4665';
  g.lineWidth = w * 0.021;
  g.beginPath();
  if (expr === 'fierce') {
    g.moveTo(cx - w * 0.062, mouthY);
    g.lineTo(cx + w * 0.062, mouthY - h * 0.012);
  } else {
    g.moveTo(cx - w * 0.062, mouthY - h * 0.005);
    g.quadraticCurveTo(cx, mouthY + (0.016 + mood * 0.036) * h, cx + w * 0.062, mouthY - h * 0.005);
  }
  g.stroke();
  g.restore();
}

function darken(hex: string, k: number): string {
  const c = new THREE.Color(hex);
  c.multiplyScalar(1 - k);
  return `#${c.getHexString()}`;
}

function lighten(hex: string, k: number): string {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color('#ffffff'), k);
  return `#${c.getHexString()}`;
}
