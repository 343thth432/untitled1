import type { Appearance } from '../../game/types';
import { blob, dark, hex, light, linear, mix, poly, radial, rgba, seeded, shadowOf, stroke, type P } from './paint';

/** Проектное пространство рисунка — всё считается в нём, потом масштабируется */
export const DW = 480;
export const DH = 640;

const HEAD = {
  cx: 240,
  top: 132,
  chin: 372,
  eyeY: 294,
  eyeDX: 44,
  eyeRX: 37,
  eyeRY: 35,
  browY: 232,
  mouthY: 345,
  neckTop: 356,
  neckBottom: 436,
  shoulderY: 492,
};

function faceOutline(): P[] {
  const { cx, top, chin } = HEAD;
  return [
    [cx, top],
    [cx + 56, top + 12],
    [cx + 82, top + 74],
    [cx + 84, 258],
    [cx + 64, 322],
    [cx + 28, 356],
    [cx, chin],
    [cx - 28, 356],
    [cx - 64, 322],
    [cx - 84, 258],
    [cx - 82, top + 74],
    [cx - 56, top + 12],
  ];
}

export interface PortraitStyle {
  /** насколько дерзкое выражение: 0 — мягкое, 1 — вызывающее */
  sultry?: number;
}

/**
 * Рисует аниме-портрет героини по её параметрам внешности.
 * Всё процедурно: силуэт причёски, крой костюма, глаза и выражение
 * собираются из Appearance, поэтому лист референсов всегда синхронен с данными игры.
 */
export function drawPortrait(
  ctx: CanvasRenderingContext2D,
  look: Appearance,
  id: string,
  W: number,
  H: number,
  style: PortraitStyle = {},
): void {
  const rnd = seeded(id);
  ctx.save();
  ctx.scale(W / DW, H / DH);
  ctx.clearRect(0, 0, DW, DH);

  const sultry = style.sultry ?? 1 - look.mood;

  drawBackground(ctx, look, rnd);

  // кадрируем плотнее: голова крупнее, грудь подрезана нижним краем
  ctx.save();
  ctx.translate(0, 10);
  ctx.scale(1.08, 1.08);
  ctx.translate(0, -40);

  drawBackHair(ctx, look, rnd);
  drawBody(ctx, look);
  drawOutfit(ctx, look, rnd);
  drawHead(ctx, look);
  drawFace(ctx, look, sultry);
  drawFrontHair(ctx, look, rnd);
  drawAccessory(ctx, look);
  ctx.restore();

  drawFinish(ctx, look, rnd);

  ctx.restore();
}

// ── фон ──────────────────────────────────────────────────────
function drawBackground(ctx: CanvasRenderingContext2D, look: Appearance, rnd: () => number): void {
  ctx.fillStyle = linear(ctx, 0, 0, 0, DH, [
    [0, light(look.aura, 0.6)],
    [0.5, light(look.aura, 0.9)],
    [1, light(look.aura, 0.72)],
  ]);
  ctx.fillRect(0, 0, DW, DH);

  // ореол за головой
  ctx.fillStyle = radial(ctx, 240, 250, 20, 280, [
    [0, rgba(light(look.aura, 0.55), 0.9)],
    [0.55, rgba(light(look.aura, 0.2), 0.35)],
    [1, rgba(look.aura, 0)],
  ]);
  ctx.fillRect(0, 0, DW, DH);

  // лучи
  ctx.save();
  ctx.translate(240, 258);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + rnd() * 0.2;
    const len = 210 + rnd() * 110;
    ctx.rotate(Math.PI * 2 / 14);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len * 0.9);
    ctx.lineTo(Math.cos(a + 0.06) * len, Math.sin(a + 0.06) * len * 0.9);
    ctx.closePath();
    ctx.fillStyle = rgba(look.aura, 0.05);
    ctx.fill();
  }
  ctx.restore();

  // искры
  for (let i = 0; i < 22; i++) {
    const x = rnd() * DW;
    const y = rnd() * DH;
    const r = 1.5 + rnd() * 4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = rgba(look.aura, 0.16 + rnd() * 0.2);
    ctx.fill();
  }
}

// ── тело ─────────────────────────────────────────────────────
function drawBody(ctx: CanvasRenderingContext2D, look: Appearance): void {
  const skin = look.skin;
  const sh = shadowOf(skin, 0.2);

  ctx.save();
  // плечи и торс
  blob(ctx, [
    [16, DH + 60],
    [34, 572],
    [58, 514],
    [118, 488],
    [186, 474],
    [240, 470],
    [294, 474],
    [362, 488],
    [422, 514],
    [446, 572],
    [464, DH + 60],
  ]);
  ctx.fillStyle = linear(ctx, 110, 470, 400, DH, [
    [0, light(skin, 0.12)],
    [0.48, skin],
    [1, sh],
  ]);
  ctx.fill();

  // мягкая светотень по плечам
  ctx.save();
  blob(ctx, [
    [16, DH + 60],
    [34, 572],
    [58, 514],
    [118, 488],
    [186, 474],
    [240, 470],
    [294, 474],
    [362, 488],
    [422, 514],
    [446, 572],
    [464, DH + 60],
  ]);
  ctx.clip();
  ctx.fillStyle = radial(ctx, 168, 508, 10, 150, [
    [0, rgba(light(skin, 0.5), 0.4)],
    [1, rgba(light(skin, 0.5), 0)],
  ]);
  ctx.fillRect(0, 440, DW, 200);
  ctx.fillStyle = linear(ctx, 330, 0, 440, 0, [
    [0, rgba(sh, 0)],
    [1, rgba(sh, 0.42)],
  ]);
  ctx.fillRect(320, 440, 160, 200);
  // тень под подбородком на груди
  ctx.fillStyle = radial(ctx, 240, 468, 10, 110, [
    [0, rgba(dark(skin, 0.5), 0.3)],
    [1, rgba(dark(skin, 0.5), 0)],
  ]);
  ctx.fillRect(120, 440, 240, 140);
  ctx.restore();

  // ключицы
  ctx.beginPath();
  ctx.moveTo(140, 506);
  ctx.quadraticCurveTo(198, 530, 230, 520);
  stroke(ctx, rgba(dark(skin, 0.45), 0.3), 5);
  ctx.beginPath();
  ctx.moveTo(340, 506);
  ctx.quadraticCurveTo(282, 530, 250, 520);
  stroke(ctx, rgba(dark(skin, 0.45), 0.3), 5);

  // грудь: объём под вырезом
  ctx.save();
  for (const s2 of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(240 + s2 * 46, 648, 76, 104, s2 * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = linear(ctx, 240 + s2 * 46 - 76, 544, 240 + s2 * 46 + 60, 700, [
      [0, light(skin, 0.16)],
      [0.55, skin],
      [1, shadowOf(skin, 0.24)],
    ]);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(240 + s2 * 46, 648, 76, 104, s2 * 0.1, 0, Math.PI * 2);
    stroke(ctx, rgba(dark(skin, 0.45), 0.22), 4);
  }
  // ложбинка
  ctx.fillStyle = linear(ctx, 210, 0, 270, 0, [
    [0, rgba(dark(skin, 0.6), 0)],
    [0.5, rgba(dark(skin, 0.6), 0.3)],
    [1, rgba(dark(skin, 0.6), 0)],
  ]);
  ctx.fillRect(206, 556, 68, 120);
  ctx.restore();

  // грудь: мягкие дуги и ложбинка
  ctx.beginPath();
  ctx.moveTo(146, DH);
  ctx.quadraticCurveTo(160, 566, 226, 578);
  stroke(ctx, rgba(dark(skin, 0.4), 0.2), 7);
  ctx.beginPath();
  ctx.moveTo(334, DH);
  ctx.quadraticCurveTo(320, 566, 254, 578);
  stroke(ctx, rgba(dark(skin, 0.4), 0.2), 7);
  ctx.beginPath();
  ctx.moveTo(240, 568);
  ctx.quadraticCurveTo(234, 604, 240, DH);
  stroke(ctx, rgba(dark(skin, 0.55), 0.5), 6);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(240, 568);
  ctx.quadraticCurveTo(206, 606, 210, DH);
  ctx.lineTo(272, DH);
  ctx.quadraticCurveTo(274, 606, 240, 568);
  ctx.closePath();
  ctx.fillStyle = rgba(dark(skin, 0.5), 0.14);
  ctx.fill();
  ctx.restore();
  ctx.restore();

  // шея
  ctx.save();
  blob(ctx, [
    [212, HEAD.neckTop - 10],
    [268, HEAD.neckTop - 10],
    [274, 430],
    [240, 470],
    [206, 430],
  ]);
  ctx.fillStyle = mix(skin, '#c98fa8', 0.1);
  ctx.fill();
  ctx.save();
  blob(ctx, [
    [212, HEAD.neckTop - 10],
    [268, HEAD.neckTop - 10],
    [270, 398],
    [240, 418],
    [210, 398],
  ]);
  ctx.clip();
  ctx.fillStyle = rgba(dark(skin, 0.55), 0.32);
  ctx.fillRect(190, 330, 110, 110);
  ctx.restore();
  ctx.restore();
}

// ── голова ───────────────────────────────────────────────────
function drawHead(ctx: CanvasRenderingContext2D, look: Appearance): void {
  const skin = look.skin;
  ctx.save();
  blob(ctx, faceOutline());
  stroke(ctx, rgba(dark(skin, 0.62), 0.45), 4);
  blob(ctx, faceOutline());
  ctx.fillStyle = linear(ctx, 150, 140, 340, 360, [
    [0, light(skin, 0.14)],
    [0.6, skin],
    [1, shadowOf(skin, 0.16)],
  ]);
  ctx.fill();

  // тень от чёлки
  ctx.save();
  blob(ctx, faceOutline());
  ctx.clip();
  ctx.fillStyle = radial(ctx, 240, 168, 20, 150, [
    [0, rgba(dark(skin, 0.5), 0.34)],
    [1, rgba(dark(skin, 0.5), 0)],
  ]);
  ctx.fillRect(140, 120, 200, 160);
  // боковая тень
  ctx.fillStyle = linear(ctx, 292, 0, 336, 0, [
    [0, rgba(shadowOf(skin, 0.5), 0)],
    [1, rgba(shadowOf(skin, 0.5), 0.35)],
  ]);
  ctx.fillRect(280, 120, 60, 260);
  ctx.restore();

  // уши
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(240 + s * 90, 288, 13, 26, s * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = mix(skin, '#d09090', 0.18);
    ctx.fill();
  }
  ctx.restore();
}

// ── лицо ─────────────────────────────────────────────────────
/** Миндалевидный глаз в локальных координатах: наружный угол приподнят */
function eyePath(ctx: CanvasRenderingContext2D, w: number, h: number, lid: number): void {
  ctx.beginPath();
  ctx.moveTo(-w, h * 0.16);
  ctx.bezierCurveTo(-w * 0.6, -h * (1.05 - lid), w * 0.35, -h * (1.12 - lid), w, -h * 0.34);
  ctx.bezierCurveTo(w * 0.55, h * 0.72, -w * 0.35, h * 1.02, -w, h * 0.16);
  ctx.closePath();
}

function drawFace(ctx: CanvasRenderingContext2D, look: Appearance, sultry: number): void {
  const { cx, eyeY, eyeDX, eyeRX, eyeRY, browY, mouthY } = HEAD;
  const lash = mix(dark(look.hairColor, 0.55), '#241531', 0.45);
  const lid = sultry * 0.22;

  // румянец
  for (const s of [-1, 1]) {
    ctx.fillStyle = radial(ctx, cx + s * 62, eyeY + 46, 4, 50, [
      [0, 'rgba(255,120,148,0.4)'],
      [1, 'rgba(255,120,148,0)'],
    ]);
    ctx.fillRect(cx + s * 62 - 54, eyeY, 108, 90);
  }

  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(cx + s * eyeDX, eyeY);
    ctx.scale(s, 1);

    // тень верхнего века на белке
    eyePath(ctx, eyeRX, eyeRY, lid);
    ctx.save();
    ctx.clip();

    ctx.fillStyle = '#fdfbff';
    ctx.fillRect(-eyeRX * 1.4, -eyeRY * 1.6, eyeRX * 2.8, eyeRY * 3.2);
    ctx.fillStyle = linear(ctx, 0, -eyeRY, 0, eyeRY * 0.2, [
      [0, 'rgba(120,92,150,0.5)'],
      [1, 'rgba(120,92,150,0)'],
    ]);
    ctx.fillRect(-eyeRX * 1.4, -eyeRY * 1.6, eyeRX * 2.8, eyeRY * 3.2);

    // радужка
    const irx = eyeRX * 0.66;
    const iry = eyeRY * 0.92;
    const iy = eyeRY * 0.06;
    ctx.beginPath();
    ctx.ellipse(-eyeRX * 0.05, iy, irx, iry, 0, 0, Math.PI * 2);
    ctx.fillStyle = linear(ctx, 0, iy - iry, 0, iy + iry, [
      [0, dark(look.eyeColor, 0.6)],
      [0.42, look.eyeColor],
      [1, light(look.eyeColor, 0.62)],
    ]);
    ctx.fill();
    // нижнее свечение
    ctx.beginPath();
    ctx.ellipse(-eyeRX * 0.05, iy + iry * 0.34, irx * 0.72, iry * 0.56, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba(light(look.eyeColor, 0.72), 0.55);
    ctx.fill();
    // лучики
    ctx.strokeStyle = rgba(dark(look.eyeColor, 0.45), 0.16);
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(-eyeRX * 0.05 + Math.cos(a) * irx * 0.4, iy + Math.sin(a) * iry * 0.44);
      ctx.lineTo(-eyeRX * 0.05 + Math.cos(a) * irx * 0.94, iy + Math.sin(a) * iry * 0.96);
      ctx.stroke();
    }
    // зрачок
    ctx.beginPath();
    ctx.ellipse(-eyeRX * 0.05, iy, irx * 0.42, iry * 0.56, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#180f26';
    ctx.fill();
    // блики
    ctx.beginPath();
    ctx.ellipse(-irx * 0.42, iy - iry * 0.48, irx * 0.4, iry * 0.3, -0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(irx * 0.5, iy + iry * 0.44, irx * 0.2, iry * 0.15, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
    ctx.restore();

    // верхняя линия ресниц
    ctx.beginPath();
    ctx.moveTo(-eyeRX, eyeRY * 0.16);
    ctx.bezierCurveTo(-eyeRX * 0.6, -eyeRY * (1.05 - lid), eyeRX * 0.35, -eyeRY * (1.12 - lid), eyeRX, -eyeRY * 0.34);
    ctx.bezierCurveTo(eyeRX * 0.3, -eyeRY * (0.72 - lid), -eyeRX * 0.55, -eyeRY * (0.62 - lid), -eyeRX, eyeRY * 0.16);
    ctx.closePath();
    ctx.fillStyle = lash;
    ctx.fill();

    // росчерк наружного угла
    ctx.beginPath();
    ctx.moveTo(eyeRX * 0.8, -eyeRY * 0.36);
    ctx.quadraticCurveTo(eyeRX * 1.4, -eyeRY * 0.9, eyeRX * 1.62, -eyeRY * 1.34);
    stroke(ctx, lash, 8);

    // нижнее веко
    ctx.beginPath();
    ctx.moveTo(-eyeRX * 0.72, eyeRY * 0.78);
    ctx.quadraticCurveTo(0, eyeRY * 1.12, eyeRX * 0.86, eyeRY * 0.6);
    stroke(ctx, rgba(lash, 0.5), 3.4);

    ctx.restore();
  }

  // брови
  for (const s of [-1, 1]) {
    const bx = cx + s * eyeDX;
    const tilt = (sultry - 0.45) * 8;
    ctx.save();
    ctx.translate(bx, browY - tilt * 0.3);
    ctx.scale(s, 1);
    ctx.beginPath();
    ctx.moveTo(-eyeRX * 0.86, 8 + tilt * 0.5);
    ctx.quadraticCurveTo(-eyeRX * 0.1, -9 - tilt * 0.3, eyeRX * 0.92, 2 + tilt);
    stroke(ctx, dark(look.hairColor, 0.28), 6.5);
    ctx.restore();
  }

  // нос
  ctx.beginPath();
  ctx.moveTo(cx + 7, 320);
  ctx.quadraticCurveTo(cx + 14, 328, cx + 5, 331);
  stroke(ctx, rgba(dark(look.skin, 0.6), 0.45), 3.2);

  // рот
  if (sultry > 0.5) {
    ctx.beginPath();
    ctx.moveTo(cx - 19, mouthY + 2);
    ctx.quadraticCurveTo(cx + 1, mouthY + 11, cx + 23, mouthY - 6);
    stroke(ctx, '#b23a5e', 4.6);
    ctx.beginPath();
    ctx.moveTo(cx - 11, mouthY + 5);
    ctx.quadraticCurveTo(cx + 3, mouthY + 13, cx + 17, mouthY + 1);
    ctx.quadraticCurveTo(cx + 3, mouthY + 5, cx - 11, mouthY + 5);
    ctx.fillStyle = 'rgba(196,58,88,0.45)';
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx - 17, mouthY);
    ctx.quadraticCurveTo(cx, mouthY + 14, cx + 17, mouthY);
    stroke(ctx, '#b23a5e', 4.6);
  }
}

// ── причёска ─────────────────────────────────────────────────
/** Светлым волосам нужен более контрастный контур, иначе они тонут в белом фоне */
function hairEdge(look: Appearance): string {
  const c = hex(look.hairColor);
  const lum = (c.r * 0.299 + c.g * 0.587 + c.b * 0.114) / 255;
  const t = 0.35 + lum * 0.35;
  return rgba(dark(look.hairColor, t), 0.35 + lum * 0.3);
}

function hairFills(ctx: CanvasRenderingContext2D, look: Appearance): { main: CanvasGradient; deep: string; tip: string } {
  return {
    main: linear(ctx, 120, 100, 380, 520, [
      [0, light(look.hairColor, 0.3)],
      [0.42, look.hairColor],
      [1, dark(look.hairColor, 0.35)],
    ]),
    deep: dark(look.hairColor, 0.45),
    tip: look.hairColor2,
  };
}

function drawBackHair(ctx: CanvasRenderingContext2D, look: Appearance, rnd: () => number): void {
  const f = hairFills(ctx, look);
  const H = look.hair;
  ctx.save();

  const mass = (pts: P[], fillStyle: string | CanvasGradient = f.main) => {
    blob(ctx, pts);
    ctx.fillStyle = fillStyle;
    ctx.fill();
    stroke(ctx, hairEdge(look), 4);
  };

  if (H === 'short') {
    mass([
      [240, 106],
      [346, 168],
      [356, 300],
      [330, 356],
      [240, 372],
      [150, 356],
      [124, 300],
      [134, 168],
    ]);
  } else if (H === 'bob') {
    mass([
      [240, 100],
      [352, 166],
      [368, 330],
      [352, 418],
      [300, 438],
      [240, 424],
      [180, 438],
      [128, 418],
      [112, 330],
      [128, 166],
    ]);
  } else if (H === 'buns') {
    mass([
      [240, 104],
      [348, 170],
      [360, 320],
      [336, 396],
      [240, 410],
      [144, 396],
      [120, 320],
      [132, 170],
    ]);
    for (const s of [-1, 1]) {
      const bx = 240 + s * 128;
      ctx.beginPath();
      ctx.arc(bx, 148, 58, 0, Math.PI * 2);
      ctx.fillStyle = f.main;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bx - s * 14, 132, 30, 0, Math.PI * 2);
      ctx.fillStyle = rgba(light(look.hairColor, 0.4), 0.5);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(bx, 196, 44, 16, 0, 0, Math.PI * 2);
      ctx.fillStyle = look.outfitTrim;
      ctx.fill();
    }
  } else if (H === 'twin') {
    mass([
      [240, 102],
      [348, 168],
      [360, 318],
      [330, 380],
      [240, 396],
      [150, 380],
      [120, 318],
      [132, 168],
    ]);
    for (const s of [-1, 1]) {
      const bx = 240 + s * 148;
      mass([
        [bx, 190],
        [bx + s * 60, 260],
        [bx + s * 52, 400],
        [bx + s * 24, 540],
        [bx - s * 8, 600],
        [bx - s * 46, 520],
        [bx - s * 38, 340],
        [bx - s * 30, 236],
      ]);
      poly(ctx, [
        [bx - s * 6, 560],
        [bx + s * 22, 528],
        [bx + s * 4, 626],
      ]);
      ctx.fillStyle = f.tip;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(bx + s * 6, 202, 46, 20, s * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = look.outfitTrim;
      ctx.fill();
    }
  } else if (H === 'ponytail') {
    mass([
      [240, 102],
      [344, 168],
      [356, 310],
      [326, 370],
      [240, 386],
      [154, 370],
      [124, 310],
      [136, 168],
    ]);
    mass([
      [330, 190],
      [420, 238],
      [452, 360],
      [438, 490],
      [400, 588],
      [356, 546],
      [372, 420],
      [352, 300],
    ]);
    poly(ctx, [
      [372, 540],
      [412, 512],
      [396, 626],
    ]);
    ctx.fillStyle = f.tip;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(346, 204, 40, 20, 0.5, 0, Math.PI * 2);
    ctx.fillStyle = look.outfitTrim;
    ctx.fill();
  } else if (H === 'braid') {
    mass([
      [240, 102],
      [346, 168],
      [358, 320],
      [330, 392],
      [240, 408],
      [150, 392],
      [122, 320],
      [134, 168],
    ]);
    // коса через плечо
    let bx = 322;
    let by = 396;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(bx, by, 30 - i * 2.6, 24 - i * 1.8, 0.5 + i * 0.06, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 ? f.main : light(look.hairColor, 0.12);
      ctx.fill();
      bx += 8;
      by += 40;
    }
    poly(ctx, [
      [bx - 14, by - 26],
      [bx + 12, by - 30],
      [bx - 2, by + 34],
    ]);
    ctx.fillStyle = f.tip;
    ctx.fill();
  } else if (H === 'wavy') {
    mass([
      [240, 98],
      [356, 164],
      [382, 300],
      [356, 380],
      [386, 460],
      [352, 540],
      [378, 626],
      [240, 626],
      [102, 626],
      [128, 540],
      [94, 460],
      [124, 380],
      [98, 300],
      [124, 164],
    ]);
    ctx.fillStyle = rgba(f.tip, 0.5);
    blob(ctx, [
      [240, 560],
      [356, 560],
      [378, 626],
      [102, 626],
      [124, 560],
    ]);
    ctx.fill();
  } else {
    // long
    mass([
      [240, 98],
      [354, 162],
      [378, 300],
      [386, 440],
      [372, 626],
      [240, 626],
      [108, 626],
      [94, 440],
      [102, 300],
      [126, 162],
    ]);
    ctx.fillStyle = rgba(f.tip, 0.45);
    blob(ctx, [
      [240, 552],
      [376, 540],
      [372, 626],
      [108, 626],
      [104, 540],
    ]);
    ctx.fill();
  }

  void rnd;
  ctx.restore();
}

/** Кончик пряди: узкий клин с острым концом */
function tip(ctx: CanvasRenderingContext2D, x: number, w: number, yTop: number, yTip: number, bow: number): void {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, yTop);
  ctx.bezierCurveTo(x - w / 2 + bow * 0.4, yTop + 40, x + bow - w * 0.28, yTip - 46, x + bow, yTip);
  ctx.bezierCurveTo(x + bow + w * 0.36, yTip - 50, x + w / 2 + bow * 0.4, yTop + 40, x + w / 2, yTop);
  ctx.closePath();
}

function drawFrontHair(ctx: CanvasRenderingContext2D, look: Appearance, rnd: () => number): void {
  const f = hairFills(ctx, look);
  ctx.save();

  // сплошная масса чёлки: лоб полностью закрыт
  ctx.beginPath();
  ctx.moveTo(136, 250);
  ctx.bezierCurveTo(132, 158, 180, 104, 240, 102);
  ctx.bezierCurveTo(300, 104, 348, 158, 344, 250);
  // нижняя кромка волной, с пробором по центру
  ctx.bezierCurveTo(334, 242, 320, 276, 302, 266);
  ctx.bezierCurveTo(286, 258, 272, 284, 256, 272);
  ctx.bezierCurveTo(248, 266, 246, 262, 240, 262);
  ctx.bezierCurveTo(234, 262, 232, 266, 224, 272);
  ctx.bezierCurveTo(208, 284, 194, 258, 178, 266);
  ctx.bezierCurveTo(160, 276, 146, 242, 136, 250);
  ctx.closePath();
  ctx.fillStyle = f.main;
  ctx.fill();
  stroke(ctx, hairEdge(look), 4);

  // кончики прядей ниже кромки
  const tips: [number, number, number, number, number][] = [
    [158, 46, 246, 326, -14],
    [200, 44, 252, 300, -7],
    [240, 58, 240, 292, 0],
    [280, 44, 252, 302, 7],
    [322, 46, 246, 330, 14],
  ];
  tips.forEach((t, i) => {
    tip(ctx, t[0], t[1], t[2], t[3], t[4]);
    ctx.fillStyle = i % 2 ? f.main : light(look.hairColor, 0.08);
    ctx.fill();
  });

  // разделительные штрихи внутри массы
  ctx.strokeStyle = rgba(dark(look.hairColor, 0.35), 0.35);
  ctx.lineWidth = 3;
  for (const [x0, x1] of [[186, 168] as const, [216, 208] as const, [266, 274] as const, [296, 314] as const]) {
    ctx.beginPath();
    ctx.moveTo(x0, 128);
    ctx.quadraticCurveTo((x0 + x1) / 2, 200, x1, 252);
    ctx.stroke();
  }

  // блик-лента
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(136, 250);
  ctx.bezierCurveTo(132, 158, 180, 104, 240, 102);
  ctx.bezierCurveTo(300, 104, 348, 158, 344, 250);
  ctx.lineTo(136, 250);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = rgba(light(look.hairColor2, 0.45), 0.55);
  blob(ctx, [
    [156, 190],
    [200, 166],
    [240, 160],
    [286, 168],
    [326, 192],
    [316, 214],
    [280, 190],
    [240, 184],
    [198, 190],
    [166, 214],
  ]);
  ctx.fill();
  ctx.restore();

  // боковые пряди у лица
  for (const s of [-1, 1]) {
    const x = 240 + s * 92;
    blob(ctx, [
      [x - s * 24, 162],
      [x + s * 28, 240],
      [x + s * 32, 388],
      [x + s * 18, 506],
      [x - s * 14, 456],
      [x - s * 8, 314],
      [x - s * 30, 220],
    ]);
    ctx.fillStyle = f.main;
    ctx.fill();
    poly(ctx, [
      [x + s * 10, 466],
      [x + s * 32, 432],
      [x + s * 18, 534],
    ]);
    ctx.fillStyle = f.tip;
    ctx.fill();
  }

  void rnd;
  ctx.restore();
}

// ── костюм ───────────────────────────────────────────────────
type Neck = 'sweetheart' | 'deepV' | 'band' | 'qipao' | 'wrap';

/** Контур верха одежды: вырез сверху, дальше вниз до края кадра */
function garmentPath(ctx: CanvasRenderingContext2D, neck: Neck, drop: number): void {
  const yL = 534 + drop;
  ctx.beginPath();
  ctx.moveTo(20, DH);
  ctx.lineTo(32, 592);
  ctx.quadraticCurveTo(64, 528, 126, 506);
  switch (neck) {
    case 'sweetheart':
      ctx.quadraticCurveTo(190, 496, 206, yL);
      ctx.quadraticCurveTo(240, yL + 34, 272, yL);
      ctx.quadraticCurveTo(290, 496, 354, 506);
      break;
    case 'deepV':
      ctx.quadraticCurveTo(190, 492, 240, yL + 84);
      ctx.quadraticCurveTo(290, 492, 354, 506);
      break;
    case 'band':
      ctx.quadraticCurveTo(240, 492 + drop, 354, 506);
      break;
    case 'wrap':
      ctx.quadraticCurveTo(198, 500, 236, yL + 34);
      ctx.quadraticCurveTo(302, 514, 354, 486);
      break;
    default:
      ctx.quadraticCurveTo(210, 476, 258, 526);
      ctx.quadraticCurveTo(302, 560, 354, 486);
      break;
  }
  ctx.quadraticCurveTo(416, 528, 444, 586);
  ctx.lineTo(460, DH);
  ctx.closePath();
}

function necklineStroke(ctx: CanvasRenderingContext2D, neck: Neck, drop: number, color: string, w = 8): void {
  const yL = 534 + drop;
  ctx.beginPath();
  switch (neck) {
    case 'sweetheart':
      ctx.moveTo(126, 506);
      ctx.quadraticCurveTo(190, 496, 206, yL);
      ctx.quadraticCurveTo(240, yL + 34, 272, yL);
      ctx.quadraticCurveTo(290, 496, 354, 506);
      break;
    case 'deepV':
      ctx.moveTo(126, 506);
      ctx.quadraticCurveTo(190, 492, 240, yL + 84);
      ctx.quadraticCurveTo(290, 492, 354, 506);
      break;
    case 'band':
      ctx.moveTo(126, 506);
      ctx.quadraticCurveTo(240, 492 + drop, 354, 506);
      break;
    case 'wrap':
      ctx.moveTo(126, 506);
      ctx.quadraticCurveTo(198, 500, 236, yL + 34);
      ctx.quadraticCurveTo(302, 514, 354, 486);
      break;
    default:
      ctx.moveTo(126, 506);
      ctx.quadraticCurveTo(210, 476, 258, 526);
      ctx.quadraticCurveTo(302, 560, 354, 486);
      break;
  }
  stroke(ctx, color, w);
}

function drawOutfit(ctx: CanvasRenderingContext2D, look: Appearance, rnd: () => number): void {
  const c = look.outfit;
  const t = look.outfitTrim;
  const st = look.outfitStyle;
  const grad = linear(ctx, 110, 500, 400, DH, [
    [0, light(c, 0.24)],
    [0.5, c],
    [1, dark(c, 0.28)],
  ]);
  const metalGrad = linear(ctx, 110, 500, 400, DH, [
    [0, light(t, 0.55)],
    [0.45, t],
    [1, dark(t, 0.3)],
  ]);

  const NECK: Record<string, [Neck, number]> = {
    leotard: ['sweetheart', 18],
    plate: ['sweetheart', 8],
    harness: ['sweetheart', 26],
    coat: ['sweetheart', 14],
    slit: ['deepV', 6],
    robe: ['sweetheart', 22],
    sarashi: ['band', 10],
    qipao: ['qipao', 0],
  };
  const [neck, drop] = NECK[st] ?? ['sweetheart', 14];

  ctx.save();

  const choker = () => {
    ctx.beginPath();
    ctx.moveTo(208, 438);
    ctx.quadraticCurveTo(240, 470, 272, 438);
    ctx.lineTo(274, 416);
    ctx.quadraticCurveTo(240, 446, 206, 416);
    ctx.closePath();
    ctx.fillStyle = dark(t, 0.12);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(240, 460, 12, 0, Math.PI * 2);
    ctx.fillStyle = light(look.aura, 0.18);
    ctx.fill();
  };

  // распахнутый плащ рисуется до самой одежды
  if (st === 'coat' || st === 'robe') {
    for (const s of [-1, 1]) {
      blob(ctx, [
        [240 + s * 132, 486],
        [240 + s * 236, 556],
        [240 + s * 250, DH + 20],
        [240 + s * 120, DH + 20],
        [240 + s * 106, 566],
      ]);
      ctx.fillStyle = st === 'robe' ? rgba(t, 0.45) : linear(ctx, 120, 480, 400, DH, [
        [0, light(c, 0.06)],
        [1, dark(c, 0.48)],
      ]);
      ctx.fill();
    }
  }

  if (st === 'sarashi') {
    // бинты
    for (let i = 0; i < 4; i++) {
      const y = 536 + i * 26;
      ctx.beginPath();
      ctx.moveTo(120, y - 30);
      ctx.quadraticCurveTo(240, y + 8, 360, y - 30);
      stroke(ctx, i % 2 ? light(c, 0.18) : c, 24);
    }
    ctx.beginPath();
    ctx.moveTo(240, 540);
    ctx.lineTo(240, DH);
    stroke(ctx, rgba(t, 0.65), 6);
  } else {
    garmentPath(ctx, neck, drop);
    ctx.fillStyle = st === 'plate' ? metalGrad : grad;
    ctx.fill();
    necklineStroke(ctx, neck, drop, t, st === 'plate' ? 10 : 8);
    // блик по краю выреза
    necklineStroke(ctx, neck, drop, rgba('#ffffff', 0.35), 3);
  }

  if (st === 'plate') {
    for (const s of [-1, 1]) {
      blob(ctx, [
        [240 + s * 152, 496],
        [240 + s * 224, 538],
        [240 + s * 228, 614],
        [240 + s * 150, 578],
      ]);
      ctx.fillStyle = metalGrad;
      ctx.fill();
      necklineStroke(ctx, 'band', 0, 'rgba(0,0,0,0)', 0);
    }
    ctx.beginPath();
    ctx.arc(240, 596, 16, 0, Math.PI * 2);
    ctx.fillStyle = light(look.aura, 0.1);
    ctx.fill();
  }

  if (st === 'harness') {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(240 + s * 10, 500);
      ctx.lineTo(240 + s * 150, DH);
      stroke(ctx, dark(t, 0.05), 14);
      ctx.beginPath();
      ctx.moveTo(240 + s * 62, 520);
      ctx.lineTo(240 + s * 104, DH);
      stroke(ctx, t, 9);
    }
    ctx.beginPath();
    ctx.arc(240, 574, 15, 0, Math.PI * 2);
    ctx.fillStyle = dark(t, 0.1);
    ctx.fill();
  }

  if (st === 'leotard') {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(240 + s * 58, 528);
      ctx.quadraticCurveTo(240 + s * 128, 512, 240 + s * 176, 604);
      stroke(ctx, c, 22);
      ctx.beginPath();
      ctx.moveTo(240 + s * 58, 528);
      ctx.quadraticCurveTo(240 + s * 128, 512, 240 + s * 176, 604);
      stroke(ctx, rgba(t, 0.8), 5);
    }
  }

  if (st === 'qipao') {
    // стойка
    ctx.beginPath();
    ctx.moveTo(198, 442);
    ctx.quadraticCurveTo(240, 476, 282, 442);
    ctx.lineTo(284, 406);
    ctx.quadraticCurveTo(240, 442, 196, 406);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(198, 442);
    ctx.quadraticCurveTo(240, 476, 282, 442);
    stroke(ctx, t, 6);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(266 + i * 12, 560 + i * 26, 7, 0, Math.PI * 2);
      ctx.fillStyle = t;
      ctx.fill();
    }
  }

  if (st !== 'qipao') choker();

  void rnd;
  ctx.restore();
}

// ── аксессуары ───────────────────────────────────────────────
function drawAccessory(ctx: CanvasRenderingContext2D, look: Appearance): void {
  const t = look.outfitTrim;
  ctx.save();
  switch (look.accessory) {
    case 'horns':
      for (const s of [-1, 1]) {
        poly(ctx, [
          [240 + s * 66, 150],
          [240 + s * 122, 68],
          [240 + s * 138, 96],
          [240 + s * 96, 172],
        ]);
        ctx.fillStyle = linear(ctx, 200, 60, 300, 180, [
          [0, light(t, 0.45)],
          [1, dark(t, 0.35)],
        ]);
        ctx.fill();
      }
      break;
    case 'halo': {
      ctx.beginPath();
      ctx.ellipse(240, 74, 108, 26, 0, 0, Math.PI * 2);
      stroke(ctx, rgba(look.aura, 0.9), 11);
      ctx.beginPath();
      ctx.ellipse(240, 74, 108, 26, 0, 0, Math.PI * 2);
      stroke(ctx, 'rgba(255,255,255,0.75)', 3);
      break;
    }
    case 'ears':
      for (const s of [-1, 1]) {
        poly(ctx, [
          [240 + s * 52, 140],
          [240 + s * 78, 46],
          [240 + s * 128, 128],
        ]);
        ctx.fillStyle = hairFills(ctx, look).main;
        ctx.fill();
        poly(ctx, [
          [240 + s * 66, 132],
          [240 + s * 82, 74],
          [240 + s * 112, 124],
        ]);
        ctx.fillStyle = '#ffa8cf';
        ctx.fill();
      }
      break;
    case 'crown': {
      poly(ctx, [
        [148, 148],
        [172, 86],
        [204, 126],
        [240, 66],
        [276, 126],
        [308, 86],
        [332, 148],
      ]);
      ctx.fillStyle = linear(ctx, 150, 70, 330, 150, [
        [0, light(t, 0.55)],
        [0.5, t],
        [1, dark(t, 0.3)],
      ]);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(240, 116, 13, 0, Math.PI * 2);
      ctx.fillStyle = light(look.aura, 0.15);
      ctx.fill();
      break;
    }
    case 'visor': {
      ctx.beginPath();
      ctx.moveTo(140, 232);
      ctx.quadraticCurveTo(240, 194, 340, 232);
      stroke(ctx, dark(t, 0.1), 15);
      ctx.beginPath();
      ctx.arc(330, 226, 15, 0, Math.PI * 2);
      ctx.fillStyle = light(look.aura, 0.2);
      ctx.fill();
      break;
    }
    case 'hairpin': {
      const px = 320;
      const py = 196;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(px + Math.cos(a) * 24, py + Math.sin(a) * 24, 17, 12, a, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 ? light(t, 0.25) : t;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(px, py, 11, 0, Math.PI * 2);
      ctx.fillStyle = light(look.aura, 0.1);
      ctx.fill();
      break;
    }
    case 'veil': {
      ctx.beginPath();
      ctx.moveTo(126, 236);
      ctx.quadraticCurveTo(240, 130, 354, 236);
      ctx.quadraticCurveTo(240, 168, 126, 236);
      ctx.closePath();
      ctx.fillStyle = rgba(t, 0.55);
      ctx.fill();
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

// ── финальные штрихи ─────────────────────────────────────────
function drawFinish(ctx: CanvasRenderingContext2D, look: Appearance, rnd: () => number): void {
  // контровой свет по левому краю
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = radial(ctx, 96, 200, 20, 320, [
    [0, rgba(look.aura, 0.3)],
    [1, rgba(look.aura, 0)],
  ]);
  ctx.fillRect(0, 0, DW, DH);
  ctx.restore();

  // виньетка
  ctx.fillStyle = radial(ctx, 240, 300, 190, 440, [
    [0, 'rgba(40,24,64,0)'],
    [1, 'rgba(40,24,64,0.26)'],
  ]);
  ctx.fillRect(0, 0, DW, DH);

  // блёстки поверх
  for (let i = 0; i < 8; i++) {
    const x = rnd() * DW;
    const y = 60 + rnd() * 460;
    const r = 2 + rnd() * 5;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      ctx.rotate(Math.PI / 2);
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(r * 0.6, r * 0.6, 0, r * 3);
      ctx.quadraticCurveTo(-r * 0.6, r * 0.6, 0, 0);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
    ctx.restore();
  }
}
