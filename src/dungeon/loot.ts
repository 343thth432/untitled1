import { rng } from '../game/engine/rng';
import type { MarkKind } from './map';

/** Подбираемое добро и спуск: предметы на полу со свечением. */

export interface LootArt {
  canvas: HTMLCanvasElement;
  scale: number;
  glow: string;
  label: string;
}

const W = 192;
const H = 192;
const cache = new Map<string, LootArt>();

function make(draw: (c: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (ctx) draw(ctx);
  return c;
}

function build(kind: MarkKind, seed: string): LootArt {
  const r = rng(seed);
  const base = H - 10;
  const cx = W / 2;

  if (kind === 'heal') {
    return {
      canvas: make((ctx) => {
        // склянка с алым отваром
        ctx.fillStyle = '#2b2f3c';
        ctx.beginPath();
        ctx.roundRect(cx - 12, base - 96, 24, 18, 5);
        ctx.fill();
        const g = ctx.createLinearGradient(cx - 26, base - 82, cx + 26, base);
        g.addColorStop(0, 'rgba(255,120,140,0.95)');
        g.addColorStop(0.5, 'rgba(210,40,70,0.95)');
        g.addColorStop(1, 'rgba(110,14,36,0.95)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(cx - 14, base - 80);
        ctx.quadraticCurveTo(cx - 34, base - 44, cx - 26, base - 12);
        ctx.quadraticCurveTo(cx, base + 2, cx + 26, base - 12);
        ctx.quadraticCurveTo(cx + 34, base - 44, cx + 14, base - 80);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,220,225,0.4)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }),
      scale: 0.36,
      glow: 'rgba(255,90,110,0.55)',
      label: 'Отвар',
    };
  }

  if (kind === 'ammo') {
    return {
      canvas: make((ctx) => {
        const g = ctx.createLinearGradient(cx - 44, base - 62, cx + 44, base);
        g.addColorStop(0, '#4a3826');
        g.addColorStop(0.55, '#2b2014');
        g.addColorStop(1, '#15100a');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(cx - 44, base - 62, 88, 62, 6);
        ctx.fill();
        ctx.strokeStyle = '#6a6153';
        ctx.lineWidth = 5;
        ctx.stroke();
        for (let i = 0; i < 4; i++) {
          const x = cx - 27 + i * 18;
          ctx.fillStyle = '#8a8f9e';
          ctx.beginPath();
          ctx.roundRect(x - 5, base - 84, 10, 26, 4);
          ctx.fill();
          ctx.fillStyle = '#d7b46a';
          ctx.beginPath();
          ctx.arc(x, base - 84, 5, Math.PI, 0);
          ctx.fill();
        }
      }),
      scale: 0.34,
      glow: 'rgba(255,200,120,0.45)',
      label: 'Заряды',
    };
  }

  if (kind === 'weapon') {
    return {
      canvas: make((ctx) => {
        // постамент
        ctx.fillStyle = '#3a3d49';
        ctx.beginPath();
        ctx.roundRect(cx - 40, base - 34, 80, 34, 5);
        ctx.fill();
        ctx.fillStyle = '#22242e';
        ctx.beginPath();
        ctx.roundRect(cx - 30, base - 52, 60, 20, 4);
        ctx.fill();
        // силуэт оружия
        ctx.save();
        ctx.translate(cx, base - 78);
        ctx.rotate(-0.35);
        ctx.fillStyle = '#1a1d26';
        ctx.beginPath();
        ctx.roundRect(-46, -9, 92, 18, 6);
        ctx.fill();
        ctx.fillStyle = '#43485a';
        ctx.beginPath();
        ctx.roundRect(-46, -7, 34, 14, 5);
        ctx.fill();
        ctx.restore();
      }),
      scale: 0.6,
      glow: 'rgba(170,210,255,0.55)',
      label: 'Оружие',
    };
  }

  if (kind === 'relic') {
    return {
      canvas: make((ctx) => {
        ctx.save();
        ctx.translate(cx, base - 56);
        ctx.rotate(r() * 0.4 - 0.2);
        const g = ctx.createLinearGradient(-30, -40, 30, 40);
        g.addColorStop(0, '#e8d69a');
        g.addColorStop(0.5, '#a5883f');
        g.addColorStop(1, '#4a3a18');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, -44);
        ctx.lineTo(30, -10);
        ctx.lineTo(18, 40);
        ctx.lineTo(-18, 40);
        ctx.lineTo(-30, -10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,240,200,0.5)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }),
      scale: 0.42,
      glow: 'rgba(255,220,140,0.5)',
      label: 'Реликвия',
    };
  }

  return {
    canvas: make((ctx) => {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(cx, base, cx, base - 168);
      g.addColorStop(0, 'rgba(150,205,255,0.6)');
      g.addColorStop(1, 'rgba(120,170,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx - 62, base);
      ctx.lineTo(cx - 40, base - 158);
      ctx.lineTo(cx + 40, base - 158);
      ctx.lineTo(cx + 62, base);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // ступени вниз
      ctx.fillStyle = 'rgba(10,14,24,0.9)';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(cx - 52 + i * 6, base - 16 - i * 10, 104 - i * 12, 8);
      }
    }),
    scale: 0.95,
    glow: 'rgba(150,200,255,0.55)',
    label: 'Спуск',
  };
}

export function lootArt(kind: MarkKind, seed: string): LootArt {
  const key = `${kind}|${seed}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = build(kind, seed);
    cache.set(key, hit);
  }
  return hit;
}

export const LOOT_ART = { W, H };
