import { H, HILLS, SWITCHES, W } from './config';
import { EDGES, OUT, posOf, type Food, type State } from './sim';

export const INK = '#16110F';
export const FOOD_COLOR = ['#E8281E', '#2E9E3E', '#2F6BFF'] as const;
export const FOOD_NAME = ['fraise', 'feuille', 'myrtille'] as const;

export interface Pop {
  x: number;
  y: number;
  text: string;
  t: number;
  color: string;
}
export interface Fx {
  pops: Pop[];
  hillFlash: number[]; // secondes restantes de clignotement par fourmilière
  hillBad: number[];
  shake: number;
}
export const newFx = (): Fx => ({ pops: [], hillFlash: [0, 0, 0], hillBad: [0, 0, 0], shake: 0 });

/** Forme de la nourriture : cercle, triangle, carré (en plus de la couleur, pour tous les yeux). */
export function foodPath(ctx: CanvasRenderingContext2D, f: Food, x: number, y: number, r: number): void {
  ctx.beginPath();
  if (f === 0) ctx.arc(x, y, r, 0, Math.PI * 2);
  else if (f === 1) {
    ctx.moveTo(x, y - r * 1.15);
    ctx.lineTo(x + r * 1.1, y + r * 0.85);
    ctx.lineTo(x - r * 1.1, y + r * 0.85);
    ctx.closePath();
  } else ctx.rect(x - r * 0.9, y - r * 0.9, r * 1.8, r * 1.8);
}

function drawFood(ctx: CanvasRenderingContext2D, f: Food, x: number, y: number, r: number, lw: number): void {
  foodPath(ctx, f, x, y, r);
  ctx.fillStyle = FOOD_COLOR[f];
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function line(ctx: CanvasRenderingContext2D, i: number): void {
  const e = EDGES[i];
  ctx.beginPath();
  ctx.moveTo(e.a.x, e.a.y);
  ctx.lineTo(e.b.x, e.b.y);
  ctx.stroke();
}

function drawAnt(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, food: Food, t: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  // pattes qui bougent
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  const w = Math.sin(t * 22) * 3;
  for (const k of [-5, 0, 5]) {
    ctx.beginPath();
    ctx.moveTo(k, -2);
    ctx.lineTo(k + (k === 0 ? -w : w), -10);
    ctx.moveTo(k, 2);
    ctx.lineTo(k + (k === 0 ? w : -w), 10);
    ctx.stroke();
  }
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(-8, 0, 8, 6, 0, 0, Math.PI * 2);
  ctx.ellipse(2, 0, 5, 4.5, 0, 0, Math.PI * 2);
  ctx.ellipse(10, 0, 5.5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // nourriture portée au-dessus, grosse et lisible
  drawFood(ctx, food, x, y - 1, 7.5, 3);
}

export function draw(ctx: CanvasRenderingContext2D, s: State, fx: Fx, showSwitchHint: boolean): void {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (fx.shake > 0) ctx.translate((Math.random() - 0.5) * 8 * fx.shake, (Math.random() - 0.5) * 8 * fx.shake);
  // sol
  ctx.fillStyle = '#FFF4E0';
  ctx.fillRect(-10, -10, W + 20, H + 20);
  ctx.fillStyle = '#F0DFBF';
  ctx.fillRect(-10, 560, W + 20, H);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // pistes : contour encre, puis sable
  ctx.strokeStyle = INK;
  ctx.lineWidth = 30;
  for (let i = 0; i < EDGES.length; i++) line(ctx, i);
  ctx.strokeStyle = '#E9C98A';
  ctx.lineWidth = 24;
  for (let i = 0; i < EDGES.length; i++) line(ctx, i);
  // branche active : pointillés rose
  ctx.strokeStyle = '#FF4F9A';
  ctx.lineWidth = 7;
  ctx.setLineDash([12, 12]);
  for (let k = 0; k < 3; k++) line(ctx, OUT[k][s.switches[k]]);
  ctx.setLineDash([]);

  // entrée
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(EDGES[0].a.x, EDGES[0].a.y - 6, 22, Math.PI, 0);
  ctx.lineTo(EDGES[0].a.x + 22, EDGES[0].a.y + 10);
  ctx.lineTo(EDGES[0].a.x - 22, EDGES[0].a.y + 10);
  ctx.fill();

  // fourmilières
  HILLS.forEach((h, i) => {
    const flash = Math.max(fx.hillFlash[i], fx.hillBad[i]);
    const grow = 1 + flash * 0.18;
    ctx.save();
    ctx.translate(h.x, h.y + 26);
    ctx.scale(grow, grow);
    ctx.beginPath();
    ctx.arc(0, 0, 50, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = fx.hillBad[i] > 0 ? '#D81E5B' : '#8A4B1E';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();
    // porte et badge de nourriture
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(h.x, h.y + 26, 14, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(h.x, h.y - 10, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF4E0';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.stroke();
    drawFood(ctx, i as Food, h.x, h.y - 10, 12, 3.5);
  });

  // aiguillages : pastille + flèche vers la direction active + numéro
  SWITCHES.forEach((p, k) => {
    const e = EDGES[OUT[k][s.switches[k]]];
    const ang = Math.atan2(e.b.y - e.a.y, e.b.x - e.a.x);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.beginPath();
    ctx.arc(0, 0, 21, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD60A';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.lineTo(2, -6);
    ctx.lineTo(2, -12);
    ctx.lineTo(14, 0);
    ctx.lineTo(2, 12);
    ctx.lineTo(2, 6);
    ctx.lineTo(-10, 6);
    ctx.closePath();
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.restore();
    ctx.font = '700 18px Fredoka, ui-rounded, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    ctx.fillText(String(k + 1), p.x + (k === 2 ? 36 : -36), p.y);
  });

  // fourmis
  for (const a of s.ants) {
    if (a.d < 0) continue;
    const e = EDGES[a.edge];
    const p = posOf(a);
    drawAnt(ctx, p.x, p.y, Math.atan2(e.b.y - e.a.y, e.b.x - e.a.x), a.food, s.time + a.id);
  }

  // textes flottants
  ctx.font = '700 26px Fredoka, ui-rounded, sans-serif';
  ctx.textAlign = 'center';
  for (const p of fx.pops) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / 0.9);
    ctx.lineWidth = 6;
    ctx.strokeStyle = INK;
    ctx.strokeText(p.text, p.x, p.y - p.t * 40);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y - p.t * 40);
  }
  ctx.globalAlpha = 1;

  if (showSwitchHint) {
    ctx.font = '700 22px Fredoka, ui-rounded, sans-serif';
    ctx.lineWidth = 6;
    ctx.strokeStyle = INK;
    ctx.strokeText('Touche un aiguillage', W / 2, 262);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Touche un aiguillage', W / 2, 262);
  }
  ctx.restore();
}
