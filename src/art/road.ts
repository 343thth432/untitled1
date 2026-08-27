import { dark, light, mix, rgba, seeded, spline, type P } from './illustration/paint';

/**
 * Дорога: живописный пейзаж из множества слоёв.
 * Тяжёлое пишется один раз в широкие тайлы и повторяется с параллаксом,
 * лёгкое и подвижное — облака, лучи, туман, птицы, вспышки, прохожие —
 * рисуется каждый кадр поверх.
 */

export type BiomeId = 'mist' | 'steppe' | 'salt' | 'city';
export type Weather = 'none' | 'rain' | 'snow' | 'motes' | 'dust';
export type Flora = 'pine' | 'grass' | 'pillar' | 'tower';

export interface Biome {
  id: BiomeId;
  name: string;
  sky: [string, string, string];
  sun: string;
  sunAt: [number, number];
  sunR: number;
  fog: string;
  ridge: [string, string, string];
  mid: string;
  midAlt: string;
  midDeep: string;
  ground: string;
  groundLit: string;
  road: string;
  roadEdge: string;
  roadLit: string;
  weather: Weather;
  motes: string;
  grade: string;
  gradeAlpha: number;
  flora: Flora;
  /** сила солнечных лучей 0..1 */
  rays: number;
  /** сколько птиц в небе */
  birds: number;
  /** светлячки и искры */
  sparks: number;
  /** блеск мокрой земли и лужи */
  wet: number;
  /** гроза */
  storm: number;
  /** марево над землёй */
  heat: number;
  night: boolean;
  /** цвет огней вдоль дороги */
  lamp: string;
}

export const BIOMES: Record<BiomeId, Biome> = {
  mist: {
    id: 'mist',
    name: 'Туманный лес',
    sky: ['#a9cbd6', '#cfe1de', '#eaf0e6'],
    sun: '#fff6d8',
    sunAt: [0.72, 0.24],
    sunR: 0.03,
    fog: '#e4eeea',
    ridge: ['#a6bcc0', '#8ba3aa', '#6b8790'],
    mid: '#3d5a54',
    midAlt: '#2c4742',
    midDeep: '#1d3330',
    ground: '#374b41',
    groundLit: '#7d9573',
    road: '#ab9370',
    roadEdge: '#544c39',
    roadLit: '#d6c49b',
    weather: 'motes',
    motes: '#f6ffe8',
    grade: '#5f8f96',
    gradeAlpha: 0.07,
    flora: 'pine',
    rays: 0.9,
    birds: 2,
    sparks: 26,
    wet: 0.2,
    storm: 0,
    heat: 0,
    night: false,
    lamp: '#ffd9a0',
  },
  steppe: {
    id: 'steppe',
    name: 'Дождевая степь',
    sky: ['#5d6d87', '#8b98aa', '#c0bfba'],
    sun: '#e8e2d2',
    sunAt: [0.3, 0.2],
    sunR: 0.026,
    fog: '#b2b6b8',
    ridge: ['#87909e', '#767f8e', '#5f6a79'],
    mid: '#6b6a52',
    midAlt: '#54543f',
    midDeep: '#3c3d2d',
    ground: '#7a7350',
    groundLit: '#ad9e69',
    road: '#9c8a5f',
    roadEdge: '#4f4832',
    roadLit: '#cdbb8a',
    weather: 'rain',
    motes: '#dfe6ef',
    grade: '#4d5a72',
    gradeAlpha: 0.14,
    flora: 'grass',
    rays: 0.25,
    birds: 5,
    sparks: 0,
    wet: 1,
    storm: 1,
    heat: 0,
    night: false,
    lamp: '#ffcf87',
  },
  salt: {
    id: 'salt',
    name: 'Соляные равнины',
    sky: ['#eebfa8', '#f6d9c0', '#fdefe1'],
    sun: '#fff0c8',
    sunAt: [0.2, 0.46],
    sunR: 0.042,
    fog: '#fae6d8',
    ridge: ['#cfae a3'.replace(' ',''), '#bd9a94', '#a07f7e'],
    mid: '#e6d6cc',
    midAlt: '#cdb8b0',
    midDeep: '#b09a92',
    ground: '#d4bea6',
    groundLit: '#fdf3e6',
    road: '#f0dfc8',
    roadEdge: '#7d6853',
    roadLit: '#fffaf2',
    weather: 'dust',
    motes: '#fff4e2',
    grade: '#e08b5c',
    gradeAlpha: 0.15,
    flora: 'pillar',
    rays: 1,
    birds: 1,
    sparks: 0,
    wet: 0,
    storm: 0,
    heat: 1,
    night: false,
    lamp: '#ffdca6',
  },
  city: {
    id: 'city',
    name: 'Ночной город',
    sky: ['#10142a', '#1e2140', '#3a3054'],
    sun: '#ffd9a0',
    sunAt: [0.8, 0.16],
    sunR: 0.024,
    fog: '#38304e',
    ridge: ['#282845', '#1f2038', '#17182a'],
    mid: '#181a2e',
    midAlt: '#101120',
    midDeep: '#0a0b16',
    ground: '#1d1e2d',
    groundLit: '#3b3a55',
    road: '#3c3950',
    roadEdge: '#171624',
    roadLit: '#6b6490',
    weather: 'rain',
    motes: '#cfe0ff',
    grade: '#2a2b5a',
    gradeAlpha: 0.2,
    flora: 'tower',
    rays: 0.2,
    birds: 0,
    sparks: 12,
    wet: 1,
    storm: 0.3,
    heat: 0,
    night: true,
    lamp: '#ffbf6a',
  },
};

// ── примитивы ────────────────────────────────────────────────
function poly(ctx: CanvasRenderingContext2D, pts: P[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

function ridgeLine(rnd: () => number, w: number, base: number, amp: number, step: number): P[] {
  const pts: P[] = [];
  let x = -step;
  while (x <= w + step) {
    pts.push([x, base - amp * (0.3 + rnd() * 0.7)]);
    x += step;
  }
  return spline(pts, 6);
}

function tile(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext('2d');
  if (ctx) draw(ctx);
  return c;
}

function blur(ctx: CanvasRenderingContext2D, px: number): void {
  ctx.filter = px > 0 ? `blur(${px.toFixed(1)}px)` : 'none';
}

// ── растительность и постройки ───────────────────────────────
function pine(ctx: CanvasRenderingContext2D, rnd: () => number, x: number, base: number, h: number, w: number): void {
  const tiers = 6;
  const lean = (rnd() - 0.5) * w * 0.2;
  ctx.beginPath();
  ctx.moveTo(x + lean, base - h);
  for (let i = 0; i < tiers; i++) {
    const t = (i + 1) / tiers;
    const y = base - h * (1 - t);
    const ww = w * t * (0.85 + rnd() * 0.3);
    ctx.lineTo(x + lean * (1 - t) + ww * 0.56, y + h * 0.055);
    ctx.lineTo(x + lean * (1 - t) + ww * 0.3, y + h * 0.025);
  }
  ctx.lineTo(x + w * 0.09, base);
  ctx.lineTo(x - w * 0.09, base);
  for (let i = tiers - 1; i >= 0; i--) {
    const t = (i + 1) / tiers;
    const y = base - h * (1 - t);
    const ww = w * t * (0.85 + rnd() * 0.3);
    ctx.lineTo(x + lean * (1 - t) - ww * 0.3, y + h * 0.025);
    ctx.lineTo(x + lean * (1 - t) - ww * 0.56, y + h * 0.055);
  }
  ctx.closePath();
  ctx.fill();
}

function fern(ctx: CanvasRenderingContext2D, rnd: () => number, x: number, base: number, h: number): void {
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i / 6 - 0.5) * 2.1;
    const len = h * (0.6 + rnd() * 0.5);
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5, base + Math.sin(a) * len * 0.7, x + Math.cos(a) * len, base + Math.sin(a) * len);
    ctx.lineWidth = 2.2;
    ctx.stroke();
  }
}

function grassTuft(ctx: CanvasRenderingContext2D, rnd: () => number, x: number, base: number, h: number, lean = 0): void {
  const n = 4 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const l = (rnd() - 0.5) * h * 0.7 + lean * h * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.quadraticCurveTo(x + l * 0.4, base - h * 0.6, x + l, base - h);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function reed(ctx: CanvasRenderingContext2D, rnd: () => number, x: number, base: number, h: number, col: string): void {
  ctx.save();
  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  const l = (rnd() - 0.5) * h * 0.4;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.quadraticCurveTo(x + l * 0.3, base - h * 0.6, x + l, base - h);
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(x + l, base - h - 3, 2.6, 7, l * 0.02, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function saltPillar(ctx: CanvasRenderingContext2D, rnd: () => number, x: number, base: number, h: number, w: number): void {
  const pts: P[] = [
    [x - w * 0.5, base],
    [x - w * 0.36 + rnd() * 5, base - h * 0.45],
    [x - w * 0.22, base - h * 0.86],
    [x - w * 0.05, base - h],
    [x + w * 0.2, base - h * 0.9],
    [x + w * 0.4 - rnd() * 5, base - h * 0.4],
    [x + w * 0.5, base],
  ];
  poly(ctx, pts);
  ctx.fill();
}

function building(ctx: CanvasRenderingContext2D, rnd: () => number, x: number, base: number, h: number, w: number, body: string, lamp: string, lit: number): void {
  ctx.fillStyle = body;
  ctx.fillRect(x - w / 2, base - h, w, h);
  // крыша
  if (rnd() > 0.5) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2 - 4, base - h);
    ctx.lineTo(x, base - h - 14 - rnd() * 18);
    ctx.lineTo(x + w / 2 + 4, base - h);
    ctx.closePath();
    ctx.fill();
  }
  const cols = Math.max(1, Math.floor(w / 15));
  const rows = Math.max(2, Math.floor(h / 24));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rnd() > lit) continue;
      const wx = x - w / 2 + 6 + c * 15;
      const wy = base - h + 12 + r * 24;
      ctx.fillStyle = rnd() > 0.28 ? lamp : '#9ec4ff';
      ctx.fillRect(wx, wy, 5.5, 9);
      ctx.save();
      blur(ctx, 5);
      ctx.globalAlpha = 0.5;
      ctx.fillRect(wx - 3, wy - 3, 11, 15);
      ctx.restore();
    }
  }
}

// ── придорожные предметы ─────────────────────────────────────
type PropKind = 'stone' | 'log' | 'bush' | 'post' | 'milestone' | 'cairn' | 'fence' | 'lantern' | 'wagon' | 'bones' | 'shrine' | 'crystal';

interface Prop {
  kind: PropKind;
  /** координата вдоль дороги */
  x: number;
  /** сдвиг по глубине: -1 дальняя обочина, 1 ближняя */
  side: number;
  s: number;
  seed: number;
}

const PROPS_BY_BIOME: Record<BiomeId, PropKind[]> = {
  mist: ['stone', 'log', 'bush', 'cairn', 'shrine', 'post', 'bush', 'stone'],
  steppe: ['post', 'fence', 'wagon', 'bush', 'stone', 'milestone', 'fence', 'bush'],
  salt: ['crystal', 'bones', 'cairn', 'stone', 'crystal', 'milestone', 'bones', 'crystal'],
  city: ['lantern', 'post', 'fence', 'stone', 'lantern', 'wagon', 'lantern', 'bush'],
};

function drawProp(ctx: CanvasRenderingContext2D, b: Biome, p: Prop, t: number, wind: number): void {
  const rnd = seeded(`prop${p.seed}`);
  const ink = dark(b.roadEdge, 0.35);
  ctx.save();
  ctx.scale(p.s, p.s);
  // тень
  ctx.beginPath();
  ctx.ellipse(0, 2, 16, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = rgba(dark(b.roadEdge, 0.5), 0.28);
  ctx.fill();

  switch (p.kind) {
    case 'stone': {
      const w = 14 + rnd() * 16;
      const h = 8 + rnd() * 14;
      const pts: P[] = [
        [-w * 0.5, 0],
        [-w * 0.42, -h * 0.7],
        [-w * 0.1, -h],
        [w * 0.3, -h * 0.85],
        [w * 0.5, -h * 0.2],
      ];
      poly(ctx, pts);
      const g = ctx.createLinearGradient(-w * 0.5, -h, w * 0.5, 0);
      g.addColorStop(0, light(b.ridge[0], 0.18));
      g.addColorStop(1, dark(b.ridge[2], 0.1));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = rgba(ink, 0.35);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      break;
    }
    case 'log': {
      const w = 46 + rnd() * 30;
      ctx.save();
      ctx.rotate(-0.06);
      const g = ctx.createLinearGradient(0, -14, 0, 2);
      g.addColorStop(0, mix(b.roadEdge, '#8a6440', 0.6));
      g.addColorStop(1, dark(mix(b.roadEdge, '#553d28', 0.6), 0.2));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -13, w, 13, 6);
      ctx.fill();
      ctx.fillStyle = mix(b.roadEdge, '#c69b6d', 0.7);
      ctx.beginPath();
      ctx.ellipse(-w / 2, -6.5, 3.4, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // мох
      ctx.strokeStyle = rgba(b.groundLit, 0.6);
      for (let i = 0; i < 5; i++) grassTuft(ctx, rnd, -w / 2 + rnd() * w, -12, 6);
      break;
    }
    case 'bush': {
      const w = 26 + rnd() * 24;
      const h = 18 + rnd() * 18;
      ctx.save();
      blur(ctx, 1.5);
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse((rnd() - 0.5) * w, -h * (0.3 + rnd() * 0.6), w * 0.34, h * 0.4, rnd(), 0, Math.PI * 2);
        ctx.fillStyle = i % 2 ? b.mid : b.midAlt;
        ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = rgba(b.groundLit, 0.5);
      for (let i = 0; i < 6; i++) grassTuft(ctx, rnd, (rnd() - 0.5) * w, 0, h * 0.5, wind * 0.3);
      break;
    }
    case 'post': {
      const h = 54 + rnd() * 46;
      ctx.strokeStyle = mix(b.roadEdge, '#6a4c30', 0.55);
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(rnd() * 4 - 2, -h);
      ctx.stroke();
      // проволока
      ctx.strokeStyle = rgba(ink, 0.4);
      ctx.lineWidth = 1;
      for (const y of [-h * 0.75, -h * 0.5]) {
        ctx.beginPath();
        ctx.moveTo(-120, y + 6);
        ctx.quadraticCurveTo(0, y + 12, 120, y + 6);
        ctx.stroke();
      }
      break;
    }
    case 'milestone': {
      const h = 34 + rnd() * 14;
      poly(ctx, [[-11, 0], [-9, -h + 6], [0, -h], [9, -h + 6], [11, 0]]);
      const g = ctx.createLinearGradient(-11, -h, 11, 0);
      g.addColorStop(0, light(b.ridge[0], 0.3));
      g.addColorStop(1, dark(b.ridge[1], 0.14));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = rgba(ink, 0.4);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = rgba(ink, 0.5);
      ctx.fillRect(-5, -h * 0.6, 10, 2);
      ctx.fillRect(-4, -h * 0.45, 8, 2);
      break;
    }
    case 'cairn': {
      let y = 0;
      for (let i = 0; i < 4 + Math.floor(rnd() * 3); i++) {
        const w = 26 - i * 4 + rnd() * 5;
        const hh = 8 + rnd() * 5;
        ctx.beginPath();
        ctx.ellipse((rnd() - 0.5) * 4, y - hh * 0.5, w * 0.5, hh * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 ? light(b.ridge[0], 0.16) : b.ridge[1];
        ctx.fill();
        ctx.strokeStyle = rgba(ink, 0.3);
        ctx.lineWidth = 1;
        ctx.stroke();
        y -= hh;
      }
      break;
    }
    case 'fence': {
      const n = 4;
      ctx.strokeStyle = mix(b.roadEdge, '#6a4c30', 0.5);
      ctx.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const x = -50 + i * 33;
        const h = 26 + rnd() * 12;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + (rnd() - 0.5) * 4, -h);
        ctx.stroke();
      }
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-52, -20);
      ctx.lineTo(52, -24);
      ctx.moveTo(-52, -8);
      ctx.lineTo(52, -11);
      ctx.stroke();
      break;
    }
    case 'lantern': {
      const h = 76 + rnd() * 26;
      ctx.strokeStyle = dark(b.roadEdge, 0.2);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -h);
      ctx.quadraticCurveTo(0, -h - 10, 14, -h - 10);
      ctx.stroke();
      const flick = 0.75 + Math.sin(t * 7 + p.seed) * 0.12 + Math.sin(t * 23 + p.seed) * 0.05;
      ctx.save();
      blur(ctx, 16);
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.arc(14, -h - 2, 40, 0, Math.PI * 2);
      ctx.fillStyle = rgba(b.lamp, 0.4 * flick);
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(9, -h - 10);
      ctx.lineTo(19, -h - 10);
      ctx.lineTo(21, -h + 6);
      ctx.lineTo(7, -h + 6);
      ctx.closePath();
      ctx.fillStyle = rgba(light(b.lamp, 0.4), flick);
      ctx.fill();
      ctx.strokeStyle = dark(b.roadEdge, 0.3);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      break;
    }
    case 'wagon': {
      const w = 74;
      ctx.save();
      ctx.rotate(0.04);
      ctx.fillStyle = mix(b.roadEdge, '#6f4f31', 0.6);
      ctx.beginPath();
      ctx.roundRect(-w / 2, -34, w, 24, 4);
      ctx.fill();
      ctx.strokeStyle = rgba(ink, 0.45);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      for (const cx2 of [-w * 0.28, w * 0.3]) {
        ctx.beginPath();
        ctx.arc(cx2, -8, 12, 0, Math.PI * 2);
        ctx.strokeStyle = dark(b.roadEdge, 0.2);
        ctx.lineWidth = 3;
        ctx.stroke();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(cx2, -8);
          ctx.lineTo(cx2 + Math.cos(a) * 11, -8 + Math.sin(a) * 11);
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
      // тент
      ctx.beginPath();
      ctx.moveTo(-w * 0.44, -34);
      ctx.quadraticCurveTo(0, -66, w * 0.44, -34);
      ctx.closePath();
      ctx.fillStyle = rgba(mix(b.fog, '#d8c8a8', 0.5), 0.9);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'bones': {
      ctx.strokeStyle = rgba('#efe6da', 0.85);
      ctx.lineCap = 'round';
      ctx.lineWidth = 4;
      for (let i = 0; i < 4; i++) {
        const a = rnd() * Math.PI;
        const l = 12 + rnd() * 18;
        ctx.beginPath();
        ctx.moveTo(-14 + rnd() * 28, -2 - rnd() * 4);
        ctx.lineTo(-14 + rnd() * 28 + Math.cos(a) * l, -2 + Math.sin(a) * l * 0.3);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.ellipse(10, -6, 9, 7, 0.2, 0, Math.PI * 2);
      ctx.fillStyle = '#efe6da';
      ctx.fill();
      ctx.fillStyle = rgba(ink, 0.6);
      ctx.beginPath();
      ctx.ellipse(7, -7, 2.4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'shrine': {
      const h = 58;
      ctx.fillStyle = mix(b.roadEdge, '#7a5a3c', 0.55);
      ctx.fillRect(-4, -h, 8, h);
      ctx.fillRect(-20, -h - 8, 40, 8);
      ctx.beginPath();
      ctx.moveTo(-26, -h - 8);
      ctx.lineTo(0, -h - 26);
      ctx.lineTo(26, -h - 8);
      ctx.closePath();
      ctx.fillStyle = mix(b.roadEdge, '#5d4128', 0.6);
      ctx.fill();
      const gl = 0.6 + Math.sin(t * 2 + p.seed) * 0.25;
      ctx.save();
      blur(ctx, 10);
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.arc(0, -h - 2, 18, 0, Math.PI * 2);
      ctx.fillStyle = rgba(b.lamp, 0.35 * gl);
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.arc(0, -h - 2, 5, 0, Math.PI * 2);
      ctx.fillStyle = rgba(light(b.lamp, 0.4), gl);
      ctx.fill();
      break;
    }
    case 'crystal': {
      const h = 40 + rnd() * 60;
      const w = 12 + rnd() * 14;
      poly(ctx, [[-w * 0.5, 0], [-w * 0.3, -h * 0.7], [0, -h], [w * 0.35, -h * 0.6], [w * 0.5, 0]]);
      const g = ctx.createLinearGradient(-w, -h, w, 0);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.5, light(b.ridge[0], 0.4));
      g.addColorStop(1, b.ridge[1]);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = rgba('#ffffff', 0.7);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-w * 0.1, 0);
      ctx.lineTo(0, -h);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

// ── слои ─────────────────────────────────────────────────────
interface Layer {
  canvas: HTMLCanvasElement;
  par: number;
  top: number;
  /** сила покачивания от ветра */
  sway?: number;
}

interface Cloud {
  x: number;
  y: number;
  w: number;
  h: number;
  a: number;
  v: number;
}

interface Bird {
  x: number;
  y: number;
  v: number;
  s: number;
  ph: number;
}

interface Spark {
  x: number;
  y: number;
  r: number;
  a: number;
  ph: number;
  v: number;
}

export interface RoadScene {
  biome: Biome;
  w: number;
  h: number;
  layers: Layer[];
  sky: HTMLCanvasElement;
  horizon: number;
  seed: string;
  clouds: Cloud[];
  birds: Bird[];
  sparks: Spark[];
  props: Prop[];
  /** мягкая маска лучей света */
  rays: HTMLCanvasElement | null;
  fogBands: { y: number; w: number; h: number; a: number; v: number; x: number }[];
  walkers: { x: number; s: number; v: number; ph: number; tone: number }[];
}

const TILE = 1500;

export function buildScene(biome: Biome, w: number, h: number, seed: string): RoadScene {
  const horizon = 0.56;
  const hy = h * horizon;
  const b = biome;

  // ── небо ──
  const sky = tile(w, h, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, hy + 40);
    g.addColorStop(0, b.sky[0]);
    g.addColorStop(0.55, b.sky[1]);
    g.addColorStop(1, b.sky[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, hy + 40);

    const sx = w * b.sunAt[0];
    const sy = hy * b.sunAt[1];
    const halo = ctx.createRadialGradient(sx, sy, 2, sx, sy, h * 0.6);
    halo.addColorStop(0, rgba(b.sun, 0.9));
    halo.addColorStop(0.12, rgba(b.sun, 0.34));
    halo.addColorStop(0.45, rgba(b.sun, 0.09));
    halo.addColorStop(1, rgba(b.sun, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, hy + 40);
    ctx.save();
    blur(ctx, 7);
    ctx.beginPath();
    ctx.arc(sx, sy, h * b.sunR, 0, Math.PI * 2);
    ctx.fillStyle = rgba(light(b.sun, 0.5), 0.95);
    ctx.fill();
    ctx.restore();

    // звёзды ночью
    if (b.night) {
      const rnd = seeded(`${seed}stars`);
      for (let i = 0; i < 90; i++) {
        const x = rnd() * w;
        const y = rnd() * hy * 0.8;
        const r = rnd() * 1.3 + 0.3;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = rgba('#ffffff', 0.2 + rnd() * 0.6);
        ctx.fill();
      }
    }
  });

  const layers: Layer[] = [];

  // ── дальние гряды ──
  for (let i = 0; i < 3; i++) {
    const rnd = seeded(`${seed}ridge${i}`);
    const amp = h * (0.09 + i * 0.045);
    const lh = Math.ceil(amp + h * 0.22);
    const col = b.ridge[i];
    const fogK = 0.58 - i * 0.19;
    const c = tile(TILE, lh, (ctx) => {
      const line = ridgeLine(rnd, TILE, lh, amp, 130 - i * 30);
      poly(ctx, [...line, [TILE, lh], [0, lh]]);
      const g = ctx.createLinearGradient(0, lh - amp, 0, lh);
      g.addColorStop(0, mix(col, b.fog, fogK * 0.45));
      g.addColorStop(1, mix(col, b.fog, fogK));
      ctx.fillStyle = g;
      ctx.fill();
      // деревья по гребню
      if (b.flora === 'pine' && i >= 1) {
        ctx.save();
        poly(ctx, [...line, [TILE, lh], [0, lh]]);
        ctx.clip();
        ctx.fillStyle = mix(col, b.midDeep, 0.35);
        for (let k = 0; k < 60; k++) {
          const x = rnd() * TILE;
          const idx = Math.min(line.length - 1, Math.floor((x / TILE) * line.length));
          pine(ctx, rnd, x, line[idx][1] + 6, 14 + rnd() * 22, 8 + rnd() * 8);
        }
        ctx.restore();
      }
      ctx.save();
      poly(ctx, [...line, [TILE, lh], [0, lh]]);
      ctx.clip();
      blur(ctx, 3);
      ctx.strokeStyle = rgba(b.sun, 0.32 - i * 0.08);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(line[0][0], line[0][1]);
      for (const p of line) ctx.lineTo(p[0], p[1]);
      ctx.stroke();
      ctx.restore();
    });
    layers.push({ canvas: c, par: 0.05 + i * 0.055, top: horizon - (amp + h * 0.22) / h });
  }

  // ── средний план: дальний ряд ──
  {
    const rnd = seeded(`${seed}midfar`);
    const lh = Math.ceil(h * 0.3);
    const c = tile(TILE, lh, (ctx) => {
      const base = lh;
      const n = b.flora === 'grass' ? 120 : b.flora === 'tower' ? 20 : 34;
      for (let i = 0; i < n; i++) {
        const x = (i / n) * TILE + (rnd() - 0.5) * 44;
        const col = mix(b.mid, b.fog, 0.42);
        ctx.fillStyle = col;
        ctx.strokeStyle = col;
        const hh = lh * (0.34 + rnd() * 0.3);
        if (b.flora === 'pine') pine(ctx, rnd, x, base, hh, hh * 0.36);
        else if (b.flora === 'tower') building(ctx, rnd, x, base, hh * 1.6, 26 + rnd() * 46, mix(b.midDeep, b.fog, 0.3), b.lamp, 0.22);
        else if (b.flora === 'pillar') saltPillar(ctx, rnd, x, base, hh * 0.8, 24 + rnd() * 34);
        else grassTuft(ctx, rnd, x, base + 2, hh * 0.16);
      }
      const g = ctx.createLinearGradient(0, lh * 0.4, 0, lh);
      g.addColorStop(0, rgba(b.fog, 0));
      g.addColorStop(1, rgba(b.fog, 0.5));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, TILE, lh);
    });
    layers.push({ canvas: c, par: 0.22, top: horizon - 0.3 + 0.012 });
  }

  // ── средний план: ближний ряд ──
  {
    const rnd = seeded(`${seed}midnear`);
    const lh = Math.ceil(h * 0.36);
    const c = tile(TILE, lh, (ctx) => {
      const base = lh;
      const n = b.flora === 'grass' ? 150 : b.flora === 'tower' ? 16 : 26;
      for (let i = 0; i < n; i++) {
        const x = (i / n) * TILE + (rnd() - 0.5) * 56;
        const col = mix(b.mid, b.midAlt, rnd());
        ctx.fillStyle = col;
        ctx.strokeStyle = col;
        const hh = lh * (0.55 + rnd() * 0.45);
        if (b.flora === 'pine') pine(ctx, rnd, x, base, hh, hh * 0.4);
        else if (b.flora === 'tower') building(ctx, rnd, x, base, hh * 1.5, 34 + rnd() * 60, b.midAlt, b.lamp, 0.42);
        else if (b.flora === 'pillar') saltPillar(ctx, rnd, x, base, hh * 0.75, 30 + rnd() * 44);
        else {
          ctx.strokeStyle = col;
          for (let k = 0; k < 5; k++) reed(ctx, rnd, x + k * 5 - 10, base + 2, hh * 0.34, col);
        }
      }
      const g = ctx.createLinearGradient(0, lh * 0.5, 0, lh);
      g.addColorStop(0, rgba(b.fog, 0));
      g.addColorStop(1, rgba(b.fog, 0.3));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, TILE, lh);
    });
    layers.push({ canvas: c, par: 0.42, top: horizon - 0.36 + 0.02 });
  }

  // ── земля и дорога ──
  const groundTop = horizon - 8 / h;
  {
    const rnd = seeded(`${seed}ground`);
    const lh = Math.ceil(h * (1 - horizon) + 8);
    const roadTop = lh * 0.15;
    const roadBot = lh * 0.66;
    const c = tile(TILE, lh, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, lh);
      g.addColorStop(0, mix(b.ground, b.fog, 0.34));
      g.addColorStop(0.1, mix(b.ground, b.fog, 0.1));
      g.addColorStop(0.5, b.ground);
      g.addColorStop(1, dark(b.ground, 0.32));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, TILE, lh);

      // трава на дальней обочине
      ctx.strokeStyle = rgba(mix(b.groundLit, b.ground, 0.4), 0.4);
      for (let i = 0; i < 200; i++) grassTuft(ctx, rnd, rnd() * TILE, roadTop - rnd() * roadTop, 4 + rnd() * 10);

      // полотно
      const rg = ctx.createLinearGradient(0, roadTop, 0, roadBot);
      rg.addColorStop(0, mix(b.road, b.fog, 0.22));
      rg.addColorStop(0.25, b.road);
      rg.addColorStop(0.7, dark(b.road, 0.05));
      rg.addColorStop(1, dark(b.road, 0.22));
      ctx.fillStyle = rg;
      ctx.fillRect(0, roadTop, TILE, roadBot - roadTop);

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, roadTop, TILE, roadBot - roadTop);
      ctx.clip();

      // длинные тени поперёк дороги
      ctx.save();
      blur(ctx, 10);
      for (let i = 0; i < 18; i++) {
        const x = (i / 18) * TILE + rnd() * 70;
        const wdt = 20 + rnd() * 80;
        const lean = (roadBot - roadTop) * (0.6 + rnd() * 0.8);
        poly(ctx, [
          [x, roadTop - 8],
          [x + wdt, roadTop - 8],
          [x + wdt * 0.5 + lean * 0.6, roadTop + lean],
          [x - wdt * 0.1 + lean * 0.6, roadTop + lean],
        ]);
        ctx.fillStyle = rgba(dark(b.roadEdge, 0.4), 0.14 + rnd() * 0.12);
        ctx.fill();
      }
      ctx.restore();

      // колеи
      for (const k of [0.32, 0.68]) {
        const y = roadTop + (roadBot - roadTop) * k;
        ctx.save();
        blur(ctx, 8);
        ctx.strokeStyle = rgba(b.roadEdge, 0.34);
        ctx.lineWidth = (roadBot - roadTop) * 0.12;
        ctx.beginPath();
        for (let x = 0; x <= TILE; x += 50) {
          const yy = y + Math.sin(x * 0.005 + k * 9) * 6;
          if (x === 0) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }
        ctx.stroke();
        ctx.restore();
      }

      // соляная корка
      if (b.flora === 'pillar') {
        ctx.strokeStyle = rgba(b.roadEdge, 0.22);
        ctx.lineWidth = 1;
        for (let i = 0; i < 120; i++) {
          const x = rnd() * TILE;
          const y = roadTop + rnd() * (roadBot - roadTop);
          ctx.beginPath();
          const n = 5;
          for (let k = 0; k < n; k++) {
            const a = (k / n) * Math.PI * 2;
            const r = 8 + rnd() * 14;
            const px = x + Math.cos(a) * r;
            const py = y + Math.sin(a) * r * 0.45;
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }

      // щебень
      for (let i = 0; i < 420; i++) {
        const y = roadTop + rnd() * (roadBot - roadTop);
        const k = (y - roadTop) / (roadBot - roadTop);
        const x = rnd() * TILE;
        const r = 1 + k * 4.4 * rnd();
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.6, rnd() * 3, 0, Math.PI * 2);
        ctx.fillStyle = rnd() > 0.5 ? rgba(b.roadLit, 0.45) : rgba(b.roadEdge, 0.36);
        ctx.fill();
      }

      // мокрый блеск и отражения огней
      if (b.night) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 26; i++) {
          const x = rnd() * TILE;
          const y0 = roadTop + rnd() * (roadBot - roadTop) * 0.5;
          const len = (roadBot - y0) * (0.4 + rnd() * 0.6);
          blur(ctx, 6);
          const rg2 = ctx.createLinearGradient(0, y0, 0, y0 + len);
          const col = rnd() > 0.35 ? b.lamp : '#8fb6ff';
          rg2.addColorStop(0, rgba(col, 0.5));
          rg2.addColorStop(1, rgba(col, 0));
          ctx.fillStyle = rg2;
          ctx.fillRect(x - 4 - rnd() * 5, y0, 8 + rnd() * 10, len);
        }
        ctx.restore();
      }

      // лужи
      if (b.wet > 0.4) {
        for (let i = 0; i < 12; i++) {
          const y = roadTop + (0.2 + rnd() * 0.7) * (roadBot - roadTop);
          const x = rnd() * TILE;
          const rx = 24 + rnd() * 80;
          ctx.save();
          blur(ctx, 3);
          ctx.beginPath();
          ctx.ellipse(x, y, rx, rx * 0.14, 0, 0, Math.PI * 2);
          const pg = ctx.createLinearGradient(0, y - rx * 0.14, 0, y + rx * 0.14);
          pg.addColorStop(0, rgba(mix(b.sky[1], b.road, 0.2), 0.75));
          pg.addColorStop(1, rgba(mix(b.sky[0], b.road, 0.4), 0.5));
          ctx.fillStyle = pg;
          ctx.fill();
          ctx.restore();
        }
      }
      ctx.restore();

      // кромки
      ctx.save();
      blur(ctx, 3);
      ctx.strokeStyle = rgba(dark(b.roadEdge, 0.25), 0.5);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, roadTop + 1);
      ctx.lineTo(TILE, roadTop + 1);
      ctx.moveTo(0, roadBot - 1);
      ctx.lineTo(TILE, roadBot - 1);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = rgba(mix(b.groundLit, b.ground, 0.3), 0.6);
      for (let i = 0; i < 190; i++) grassTuft(ctx, rnd, rnd() * TILE, roadTop + 3, 5 + rnd() * 13);
      ctx.strokeStyle = rgba(mix(dark(b.groundLit, 0.22), b.ground, 0.45), 0.75);
      for (let i = 0; i < 170; i++) grassTuft(ctx, rnd, rnd() * TILE, roadBot + 2, 8 + rnd() * 22);

      const eg = ctx.createLinearGradient(0, roadBot - 8, 0, roadBot + 30);
      eg.addColorStop(0, rgba(b.roadEdge, 0.4));
      eg.addColorStop(1, rgba(b.roadEdge, 0));
      ctx.fillStyle = eg;
      ctx.fillRect(0, roadBot - 8, TILE, 38);

      ctx.strokeStyle = rgba(dark(b.ground, 0.35), 0.7);
      for (let i = 0; i < 200; i++) {
        grassTuft(ctx, rnd, rnd() * TILE, roadBot + 22 + rnd() * (lh - roadBot - 22), 10 + rnd() * 26);
      }
      // папоротники у ближней обочины в лесу
      if (b.flora === 'pine') {
        ctx.strokeStyle = rgba(b.midAlt, 0.8);
        for (let i = 0; i < 26; i++) fern(ctx, rnd, rnd() * TILE, roadBot + 26 + rnd() * 30, 16 + rnd() * 14);
      }
    });
    layers.push({ canvas: c, par: 1, top: groundTop });
  }

  // ── передний план ──
  {
    const rnd = seeded(`${seed}fore`);
    const lh = Math.ceil(h * 0.17);
    const c = tile(TILE, lh, (ctx) => {
      ctx.strokeStyle = rgba(dark(b.ground, 0.55), 0.9);
      for (let i = 0; i < 110; i++) grassTuft(ctx, rnd, rnd() * TILE, lh, 26 + rnd() * 56);
      if (b.flora === 'pine') {
        ctx.strokeStyle = rgba(dark(b.midDeep, 0.3), 0.9);
        for (let i = 0; i < 14; i++) fern(ctx, rnd, rnd() * TILE, lh - 4, 26 + rnd() * 20);
      }
      const g = ctx.createLinearGradient(0, 0, 0, lh);
      g.addColorStop(0, rgba(dark(b.ground, 0.65), 0));
      g.addColorStop(1, rgba(dark(b.ground, 0.65), 0.55));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, TILE, lh);
    });
    layers.push({ canvas: c, par: 1.9, top: 1 - 0.17, sway: 0.05 });
  }

  // ── ветви над головой: рамка кадра ──
  if (b.flora === 'pine' || b.flora === 'tower') {
    const rnd = seeded(`${seed}canopy`);
    const lh = Math.ceil(h * 0.3);
    const c = tile(TILE, lh, (ctx) => {
      blur(ctx, 3);
      const col = rgba(dark(b.midDeep, 0.55), b.night ? 0.9 : 0.82);
      for (let i = 0; i < 5; i++) {
        const x = (i / 5) * TILE + rnd() * 200;
        const dir = rnd() > 0.5 ? 1 : -1;
        ctx.strokeStyle = col;
        ctx.lineCap = 'round';
        ctx.lineWidth = 9 + rnd() * 7;
        const len = 150 + rnd() * 200;
        ctx.beginPath();
        ctx.moveTo(x, -8);
        ctx.quadraticCurveTo(x + dir * len * 0.5, lh * 0.2, x + dir * len, lh * (0.35 + rnd() * 0.3));
        ctx.stroke();
        // хвоя
        ctx.lineWidth = 2.2;
        for (let k = 1; k < 9; k++) {
          const u = k / 9;
          const px = x + dir * len * u;
          const py = -8 + (lh * (0.35 + 0.2) - -8) * u * u;
          for (let j = -1; j <= 1; j += 2) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + j * (14 + rnd() * 16), py + 16 + rnd() * 20);
            ctx.stroke();
          }
        }
      }
    });
    layers.push({ canvas: c, par: 2.4, top: -0.03, sway: -0.035 });
  }

  // ── подвижное ──
  const rc = seeded(`${seed}live`);
  const clouds: Cloud[] = [];
  for (let i = 0; i < 8; i++) {
    clouds.push({
      x: rc() * 1.4 - 0.2,
      y: hy * (0.08 + rc() * 0.66),
      w: w * (0.3 + rc() * 0.7),
      h: h * (0.012 + rc() * 0.03),
      a: 0.12 + rc() * 0.22,
      v: 0.0012 + rc() * 0.0035,
    });
  }
  const birds: Bird[] = [];
  for (let i = 0; i < b.birds; i++) {
    birds.push({ x: rc(), y: hy * (0.1 + rc() * 0.45), v: 0.02 + rc() * 0.04, s: 0.6 + rc() * 0.8, ph: rc() * 6 });
  }
  const sparks: Spark[] = [];
  for (let i = 0; i < b.sparks; i++) {
    sparks.push({ x: rc(), y: 0.4 + rc() * 0.55, r: 1 + rc() * 2.4, a: 0.3 + rc() * 0.6, ph: rc() * 6, v: 0.004 + rc() * 0.012 });
  }
  const fogBands = [] as RoadScene['fogBands'];
  for (let i = 0; i < 4; i++) {
    fogBands.push({
      x: rc(),
      y: horizon + (rc() - 0.4) * 0.1,
      w: 0.6 + rc() * 0.9,
      h: 0.02 + rc() * 0.05,
      a: 0.14 + rc() * 0.2,
      v: 0.004 + rc() * 0.01,
    });
  }
  const walkers: RoadScene['walkers'] = [];
  const nWalk = b.flora === 'tower' ? 4 : 2;
  for (let i = 0; i < nWalk; i++) {
    walkers.push({ x: rc(), s: 0.5 + rc() * 0.4, v: 0.01 + rc() * 0.02, ph: rc() * 6, tone: rc() });
  }

  // придорожные предметы вдоль всей дороги
  const kinds = PROPS_BY_BIOME[b.id];
  const props: Prop[] = [];
  for (let i = 0; i < 90; i++) {
    props.push({
      kind: kinds[Math.floor(rc() * kinds.length) % kinds.length],
      x: i * (260 + rc() * 300),
      side: rc() > 0.55 ? 1 : -1,
      s: 0.6 + rc() * 0.7,
      seed: Math.floor(rc() * 9999),
    });
  }

  // маска лучей
  const rays =
    b.rays > 0.05
      ? tile(w, h, (ctx) => {
          const sx = w * b.sunAt[0];
          const sy = hy * b.sunAt[1];
          ctx.save();
          blur(ctx, 26);
          const rr = seeded(`${seed}rays`);
          for (let i = 0; i < 12; i++) {
            const a = -Math.PI / 2 + (rr() - 0.5) * 2.4;
            const spread = 0.02 + rr() * 0.06;
            const len = h * (0.9 + rr() * 0.7);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(a - spread) * len, sy - Math.sin(a - spread) * len + h);
            ctx.lineTo(sx + Math.cos(a + spread) * len, sy - Math.sin(a + spread) * len + h);
            ctx.closePath();
            ctx.fillStyle = rgba(b.sun, 0.05 + rr() * 0.07);
            ctx.fill();
          }
          ctx.restore();
        })
      : null;

  return { biome: b, w, h, layers, sky, horizon, seed, clouds, birds, sparks, props, rays, fogBands, walkers };
}

// ── погода ───────────────────────────────────────────────────
interface Mote {
  x: number;
  y: number;
  v: number;
  r: number;
  a: number;
  d: number;
}

export class Weatherfall {
  private motes: Mote[] = [];
  private splash: { x: number; y: number; t: number }[] = [];

  constructor(
    private biome: Biome,
    private w: number,
    private h: number,
  ) {
    const rnd = seeded(`${biome.id}weather`);
    const n = biome.weather === 'rain' ? 190 : biome.weather === 'snow' ? 90 : 52;
    for (let i = 0; i < n; i++) {
      this.motes.push({
        x: rnd() * w,
        y: rnd() * h,
        v: biome.weather === 'rain' ? 760 + rnd() * 700 : 12 + rnd() * 40,
        r: biome.weather === 'rain' ? 9 + rnd() * 14 : 1 + rnd() * 2.4,
        a: 0.14 + rnd() * 0.38,
        d: rnd() * Math.PI * 2,
      });
    }
  }

  draw(ctx: CanvasRenderingContext2D, t: number, dt: number, wind: number): void {
    const b = this.biome;
    if (b.weather === 'none') return;
    ctx.save();
    if (b.weather === 'rain') {
      ctx.strokeStyle = rgba(b.motes, 0.42);
      ctx.lineWidth = 1.1;
      for (const m of this.motes) {
        m.y += m.v * dt;
        m.x += wind * 70 * dt;
        if (m.y > this.h * 0.94) {
          if (Math.random() < 0.3) this.splash.push({ x: m.x, y: this.h * (0.72 + Math.random() * 0.2), t: 0 });
          m.y = -20;
          m.x = Math.random() * this.w;
        }
        if (m.x > this.w) m.x -= this.w;
        if (m.x < 0) m.x += this.w;
        ctx.globalAlpha = m.a;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - wind * 9, m.y + m.r);
        ctx.stroke();
      }
      // круги от капель
      ctx.strokeStyle = rgba(b.motes, 0.5);
      ctx.lineWidth = 1;
      for (let i = this.splash.length - 1; i >= 0; i--) {
        const s = this.splash[i];
        s.t += dt * 3;
        if (s.t > 1) {
          this.splash.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = (1 - s.t) * 0.5;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, 3 + s.t * 12, (3 + s.t * 12) * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = b.motes;
      for (const m of this.motes) {
        m.y -= (b.weather === 'motes' ? m.v : -m.v) * dt;
        m.x += Math.sin(t * 0.6 + m.d) * 16 * dt + wind * 26 * dt;
        if (m.y < -10) m.y = this.h + 10;
        if (m.y > this.h + 10) m.y = -10;
        if (m.x > this.w + 10) m.x -= this.w + 20;
        if (m.x < -10) m.x += this.w + 20;
        ctx.globalAlpha = m.a * (0.6 + 0.4 * Math.sin(t * 1.4 + m.d));
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

// ── силуэт прохожего ─────────────────────────────────────────
function walker(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, col: string): void {
  const swing = Math.sin(t * 6) * 0.5;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = col;
  ctx.strokeStyle = col;
  ctx.lineCap = 'round';
  // ноги
  ctx.lineWidth = 4;
  for (const d of [1, -1]) {
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(swing * 9 * d, 0);
    ctx.stroke();
  }
  // тело
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(-1, -40);
  ctx.stroke();
  // руки
  ctx.lineWidth = 3.4;
  for (const d of [1, -1]) {
    ctx.beginPath();
    ctx.moveTo(-1, -38);
    ctx.lineTo(-swing * 7 * d, -22);
    ctx.stroke();
  }
  // голова
  ctx.beginPath();
  ctx.arc(-1, -46, 5.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── кадр ─────────────────────────────────────────────────────
export function drawScene(
  ctx: CanvasRenderingContext2D,
  s: RoadScene,
  scroll: number,
  t: number,
): void {
  const { w, h, biome: b } = s;
  const wind = Math.sin(t * 0.31) * 0.6 + Math.sin(t * 0.11) * 0.4;
  ctx.drawImage(s.sky, 0, 0, w, h);

  // облака
  ctx.save();
  for (const c of s.clouds) {
    const x = ((c.x + t * c.v) % 1.5) * w - w * 0.25;
    blur(ctx, 16);
    ctx.globalAlpha = c.a;
    ctx.fillStyle = b.night ? mix(b.sky[2], '#000000', 0.3) : mix(b.fog, b.sky[2], 0.4);
    ctx.beginPath();
    ctx.ellipse(x, c.y, c.w * 0.5, c.h, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // птицы
  ctx.save();
  ctx.strokeStyle = b.night ? '#0b0b16' : rgba(dark(b.ridge[2], 0.4), 0.7);
  ctx.lineWidth = 1.6;
  for (const bd of s.birds) {
    const x = (((bd.x + t * bd.v) % 1.3) - 0.15) * w;
    const y = bd.y + Math.sin(t * 0.7 + bd.ph) * 8;
    for (let k = 0; k < 5; k++) {
      const px = x + k * 13 * bd.s;
      const py = y + Math.sin(t * 3 + bd.ph + k) * 4 + k * 3;
      const flap = Math.sin(t * 8 + bd.ph + k * 0.6) * 4;
      ctx.beginPath();
      ctx.moveTo(px - 3.4 * bd.s, py + flap * 0.7);
      ctx.quadraticCurveTo(px, py - 1.4, px + 3.4 * bd.s, py + flap * 0.7);
      ctx.stroke();
    }
  }
  ctx.restore();

  // слои с параллаксом
  for (const l of s.layers) {
    const lw = l.canvas.width;
    const lh = l.canvas.height;
    const y = l.top * h;
    let x = -((scroll * l.par) % lw);
    if (x > 0) x -= lw;
    ctx.save();
    if (l.sway) {
      // сдвиг верхушек по ветру: наклон вокруг нижней кромки слоя
      const k = l.sway * wind;
      ctx.transform(1, 0, k, 1, -k * (y + lh), 0);
    }
    while (x < w) {
      ctx.drawImage(l.canvas, Math.round(x), Math.round(y), lw, lh);
      x += lw;
    }
    ctx.restore();
  }

  // прохожие вдалеке
  const roadY = h * (s.horizon + 0.14);
  for (const wk of s.walkers) {
    const wx = (((wk.x - (scroll * 0.55) / (w * 3)) % 1) + 1) % 1;
    const x = wx * w * 1.2 - w * 0.1;
    walker(
      ctx,
      x,
      roadY + wk.s * 26,
      wk.s * 1.15,
      t * (0.7 + wk.v * 20) + wk.ph,
      rgba(b.night ? '#08080f' : dark(b.midDeep, 0.55), 0.55 + wk.tone * 0.3),
    );
  }

  // придорожные предметы: дальняя обочина мельче, ближняя крупнее
  const span = s.props.length * 380;
  ctx.save();
  for (const p of s.props) {
    const sx = (((p.x - scroll) % span) + span) % span;
    if (sx > w + 200 || sx < -200) continue;
    const far = p.side < 0;
    ctx.save();
    ctx.translate(sx, h * (far ? s.horizon + 0.048 : s.horizon + 0.315));
    ctx.globalAlpha = far ? 0.85 : 1;
    drawProp(ctx, b, { ...p, s: p.s * (far ? 0.5 : 1.05) }, t, wind);
    ctx.restore();
  }
  ctx.restore();

  // туманные банки у горизонта
  ctx.save();
  for (const f of s.fogBands) {
    const x = ((f.x + t * f.v) % 1.4) * w - w * 0.2;
    blur(ctx, 22);
    ctx.globalAlpha = f.a;
    ctx.fillStyle = b.fog;
    ctx.beginPath();
    ctx.ellipse(x, f.y * h, f.w * w * 0.5, f.h * h, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // солнечные лучи
  if (s.rays) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = b.rays * (0.55 + Math.sin(t * 0.4) * 0.12);
    ctx.drawImage(s.rays, Math.sin(t * 0.08) * 12, 0, w, h);
    ctx.restore();
  }

  // марево над солью
  if (b.heat > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    blur(ctx, 7);
    for (let i = 0; i < 3; i++) {
      const y = h * (s.horizon - 0.004 + i * 0.016);
      ctx.globalAlpha = 0.035 + Math.sin(t * 2 + i) * 0.018;
      ctx.fillStyle = b.sun;
      ctx.fillRect(0, y + Math.sin(t * 3 + i) * 3, w, 5);
    }
    ctx.restore();
  }

  // искры и светлячки
  if (s.sparks.length) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const sp of s.sparks) {
      const x = (((sp.x + t * sp.v * 0.4) % 1) + 1) % 1;
      const y = sp.y + Math.sin(t * 0.8 + sp.ph) * 0.04;
      const a = sp.a * (0.45 + 0.55 * Math.sin(t * 2.2 + sp.ph));
      ctx.globalAlpha = a;
      blur(ctx, 4);
      ctx.beginPath();
      ctx.arc(x * w, y * h, sp.r * 2.4, 0, Math.PI * 2);
      ctx.fillStyle = b.lamp;
      ctx.fill();
      blur(ctx, 0);
      ctx.beginPath();
      ctx.arc(x * w, y * h, sp.r * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = '#fff8e0';
      ctx.fill();
    }
    ctx.restore();
  }

  // молния
  if (b.storm > 0) {
    const period = 7.5;
    const ph = (t % period) / period;
    if (ph < 0.06) {
      const k = Math.max(0, 1 - ph / 0.06);
      const flash = k * k * b.storm;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = flash * 0.5;
      ctx.fillStyle = '#dfe9ff';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      if (ph < 0.03) {
        const rnd = seeded(`bolt${Math.floor(t / period)}`);
        ctx.save();
        ctx.strokeStyle = rgba('#ffffff', 0.85 * k);
        ctx.lineWidth = 2.2;
        ctx.shadowColor = '#cfe0ff';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        let bx = w * (0.15 + rnd() * 0.7);
        let by = 0;
        ctx.moveTo(bx, by);
        while (by < h * s.horizon) {
          bx += (rnd() - 0.5) * 46;
          by += 18 + rnd() * 30;
          ctx.lineTo(bx, by);
        }
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // дымка у горизонта
  const fog = ctx.createLinearGradient(0, h * (s.horizon - 0.16), 0, h * (s.horizon + 0.1));
  fog.addColorStop(0, rgba(b.fog, 0));
  fog.addColorStop(0.5, rgba(b.fog, 0.24));
  fog.addColorStop(1, rgba(b.fog, 0));
  ctx.fillStyle = fog;
  ctx.fillRect(0, h * (s.horizon - 0.16), w, h * 0.22);

  // общий тон, засветка и виньетка
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = b.gradeAlpha;
  ctx.fillStyle = b.grade;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  const bloom = ctx.createRadialGradient(
    w * b.sunAt[0],
    h * s.horizon * b.sunAt[1],
    0,
    w * b.sunAt[0],
    h * s.horizon * b.sunAt[1],
    h * 0.7,
  );
  bloom.addColorStop(0, rgba(b.sun, 0.09));
  bloom.addColorStop(1, rgba(b.sun, 0));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.24, w * 0.5, h * 0.52, h * 0.8);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, b.night ? 'rgba(6,6,16,0.55)' : 'rgba(20,16,32,0.34)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

// ── метки узлов на дороге ────────────────────────────────────
export type MarkerKind = 'foe' | 'elite' | 'boss' | 'rest' | 'find' | 'trade' | 'omen';

/** Ориентир, стоящий на дороге впереди */
export function drawMarker(
  ctx: CanvasRenderingContext2D,
  kind: MarkerKind,
  b: Biome,
  x: number,
  y: number,
  s: number,
  t: number,
  count = 1,
): void {
  if (count > 1 && (kind === 'foe' || kind === 'elite')) {
    for (let i = count - 1; i >= 1; i--) {
      const dx = (i % 2 ? 1 : -1) * (16 + i * 9) * s;
      ctx.save();
      ctx.globalAlpha = 0.62;
      drawMarker(ctx, kind, b, x + dx, y - 5 * s * i, s * (0.82 - i * 0.06), t + i * 1.7, 1);
      ctx.restore();
    }
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.ellipse(0, 2, 30, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(30,24,44,0.3)';
  ctx.fill();

  const ink = dark(b.roadEdge, 0.5);
  const warm = '#ffb469';

  if (kind === 'rest') {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (const a of [-0.5, 0.2, 0.9]) {
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * -20, -2);
      ctx.lineTo(Math.cos(a) * 20, -11);
      ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const k = 1 - i * 0.28;
      const wob = Math.sin(t * 6 + i) * 3;
      ctx.beginPath();
      ctx.moveTo(-14 * k, -9);
      ctx.quadraticCurveTo(-6 * k + wob, -32 * k, wob * 0.5, -50 * k);
      ctx.quadraticCurveTo(6 * k + wob, -32 * k, 14 * k, -9);
      ctx.closePath();
      ctx.fillStyle = i === 0 ? 'rgba(255,120,50,0.9)' : i === 1 ? 'rgba(255,190,90,0.92)' : 'rgba(255,244,200,0.95)';
      ctx.fill();
    }
    ctx.save();
    blur(ctx, 18);
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.arc(0, -24, 44, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,150,60,0.4)';
    ctx.fill();
    ctx.restore();
    // искры от костра
    for (let i = 0; i < 7; i++) {
      const ph = (t * 0.6 + i * 0.31) % 1;
      ctx.beginPath();
      ctx.arc(Math.sin(i * 3 + t) * 12, -46 - ph * 46, 1.6 * (1 - ph), 0, Math.PI * 2);
      ctx.fillStyle = rgba('#ffca7a', (1 - ph) * 0.9);
      ctx.fill();
    }
  } else if (kind === 'find') {
    ctx.fillStyle = mix(b.roadEdge, '#6b4a2c', 0.6);
    ctx.fillRect(-26, -32, 52, 32);
    ctx.beginPath();
    ctx.moveTo(-26, -32);
    ctx.quadraticCurveTo(0, -54, 26, -32);
    ctx.closePath();
    ctx.fillStyle = mix(b.roadEdge, '#8a5f38', 0.7);
    ctx.fill();
    ctx.fillStyle = warm;
    ctx.fillRect(-5, -37, 10, 15);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.4;
    ctx.strokeRect(-26, -32, 52, 32);
    ctx.save();
    blur(ctx, 12);
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.arc(0, -30, 26, 0, Math.PI * 2);
    ctx.fillStyle = rgba(warm, 0.25 + Math.sin(t * 2) * 0.1);
    ctx.fill();
    ctx.restore();
  } else if (kind === 'trade') {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-32, 0);
    ctx.lineTo(-28, -48);
    ctx.moveTo(32, 0);
    ctx.lineTo(28, -48);
    ctx.stroke();
    const flap = Math.sin(t * 1.6) * 4;
    ctx.beginPath();
    ctx.moveTo(-42, -48);
    ctx.quadraticCurveTo(0, -66 + flap, 42, -48);
    ctx.lineTo(33, -37);
    ctx.quadraticCurveTo(0, -52 + flap, -33, -37);
    ctx.closePath();
    ctx.fillStyle = mix(b.sun, '#b3462f', 0.55);
    ctx.fill();
    ctx.fillStyle = rgba(warm, 0.85);
    ctx.beginPath();
    ctx.arc(0, -28, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'omen') {
    const stone: P[] = [[-22, 0], [-18, -44], [-5, -58], [13, -54], [22, -20], [17, 0]];
    poly(ctx, stone);
    const g = ctx.createLinearGradient(-24, -58, 24, 0);
    g.addColorStop(0, light(b.ridge[0], 0.24));
    g.addColorStop(1, dark(b.ridge[2], 0.2));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2;
    ctx.stroke();
    const gl = 0.6 + Math.sin(t * 3) * 0.3;
    ctx.save();
    ctx.strokeStyle = rgba('#e8d6ff', gl);
    ctx.shadowColor = '#c9a6ff';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(-2, -32, 10, 0.4, 5.4);
    ctx.moveTo(-2, -48);
    ctx.lineTo(-2, -16);
    ctx.stroke();
    ctx.restore();
  } else {
    const tall = kind === 'boss' ? 116 : kind === 'elite' ? 90 : 72;
    const wide = kind === 'boss' ? 38 : 28;
    const sway = Math.sin(t * 1.4) * 3;
    ctx.save();
    blur(ctx, 3);
    const body: P[] = [
      [-wide * 0.5, 0],
      [-wide * 0.62, -tall * 0.5],
      [-wide * 0.3 + sway * 0.4, -tall * 0.86],
      [sway, -tall],
      [wide * 0.3 + sway * 0.4, -tall * 0.86],
      [wide * 0.62, -tall * 0.5],
      [wide * 0.5, 0],
    ];
    poly(ctx, body);
    const g = ctx.createLinearGradient(0, -tall, 0, 0);
    g.addColorStop(0, 'rgba(22,16,36,0.92)');
    g.addColorStop(1, 'rgba(22,16,36,0.45)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    // рваный подол тени
    ctx.save();
    blur(ctx, 6);
    for (let i = 0; i < 6; i++) {
      const px = -wide * 0.5 + (i / 5) * wide;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px + 4, -12 - Math.sin(t * 2 + i) * 8);
      ctx.lineTo(px + 8, 0);
      ctx.closePath();
      ctx.fillStyle = 'rgba(22,16,36,0.5)';
      ctx.fill();
    }
    ctx.restore();
    const eye = kind === 'boss' ? '#ff8a5c' : kind === 'elite' ? '#ffd166' : '#c8a4ff';
    for (const s2 of [-1, 1]) {
      const ex = s2 * wide * 0.34 + sway;
      const ey = -tall * 0.82;
      ctx.save();
      blur(ctx, 5);
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.arc(ex, ey, 6, 0, Math.PI * 2);
      ctx.fillStyle = rgba(eye, 0.75 + Math.sin(t * 4 + s2) * 0.2);
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.arc(ex, ey, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = eye;
      ctx.fill();
    }
    if (kind !== 'foe') {
      ctx.save();
      blur(ctx, 20);
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.arc(0, -tall * 0.6, kind === 'boss' ? 74 : 54, 0, Math.PI * 2);
      ctx.fillStyle = rgba(eye, 0.2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}
