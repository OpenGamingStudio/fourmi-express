import './style.css';
import { setSound, sfx } from './audio';
import { H, MAX_LIVES, SWITCHES, W } from './config';
import { draw, newFx, type Fx } from './render';
import { makeRng } from './rng';
import { freshSave, load, save, type MotionPref, type SaveData } from './save';
import { newState, step, toggle, type State } from './sim';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('stage');
const ctx = canvas.getContext('2d')!;
const board = $('board');
const store = window.localStorage;

let data: SaveData = load(store);
let state: State = newState();
let fx: Fx = newFx();
let rng = makeRng(Date.now());
type Mode = 'menu' | 'play' | 'pause' | 'over' | 'settings';
let mode: Mode = 'menu';
let firstTap = true;
let last = 0;

const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduced = (): boolean => (data.settings.reducedMotion === 'auto' ? mq.matches : data.settings.reducedMotion === 'yes');
function applyMotion(): void {
  document.documentElement.classList.toggle('reduce', reduced());
}

/* ---------- mise à l'échelle : plateau 9:16 centré ---------- */
function layout(): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(vw, (vh * 9) / 16);
  const h = (w * 16) / 9;
  board.style.width = `${w}px`;
  board.style.height = `${h}px`;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform((w * dpr) / W, 0, 0, (h * dpr) / H, 0, 0);
}
window.addEventListener('resize', layout);

/* ---------- boutons d'aiguillage ---------- */
const swEls: HTMLButtonElement[] = SWITCHES.map((p, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'sw';
  b.style.left = `${((p.x - 40) / W) * 100}%`;
  b.style.top = `${((p.y - 40) / H) * 100}%`;
  b.style.width = `${(80 / W) * 100}%`;
  b.style.height = `${(80 / H) * 100}%`;
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    flip(i);
  });
  b.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      flip(i);
    }
  });
  $('switches').appendChild(b);
  return b;
});
const DIR_NAME = ['à gauche', 'à droite'];
function labelSwitches(): void {
  swEls.forEach((b, i) => {
    b.setAttribute('aria-label', `Aiguillage ${i + 1}, dirigé ${DIR_NAME[state.switches[i]]}. Appuie pour changer.`);
    b.disabled = mode !== 'play';
  });
}
function flip(i: number): void {
  if (mode !== 'play') return;
  toggle(state, i);
  firstTap = false;
  sfx.tap();
  labelSwitches();
}

/* ---------- écrans ---------- */
const screens: Record<string, HTMLElement> = { menu: $('menu'), pause: $('pause'), over: $('over'), settings: $('settings') };
function show(m: Mode): void {
  mode = m;
  for (const [k, el] of Object.entries(screens)) el.hidden = k !== m;
  $('hud').hidden = !(m === 'play' || m === 'pause');
  labelSwitches();
  const focus: Partial<Record<Mode, string>> = { menu: 'btn-play', pause: 'btn-resume', over: 'btn-again', settings: 'settings-back' };
  const f = focus[m];
  if (f) $(f).focus({ preventScroll: true });
}

function renderHearts(): void {
  const box = $('hud-lives');
  box.replaceChildren();
  for (let i = 0; i < MAX_LIVES; i++) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'h-6 w-6');
    svg.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', 'M12 21C5 15 2.5 11.5 2.5 8A5 5 0 0 1 12 6a5 5 0 0 1 9.5 2c0 3.5-2.5 7-9.5 13z');
    p.setAttribute('stroke', '#16110F');
    p.setAttribute('stroke-width', '2.5');
    p.setAttribute('stroke-linejoin', 'round');
    p.setAttribute('fill', i < state.lives ? '#E8281E' : '#F0DFBF');
    svg.appendChild(p);
    box.appendChild(svg);
  }
  box.setAttribute('aria-label', `${state.lives} vie${state.lives > 1 ? 's' : ''}`);
}
function renderHud(): void {
  $('hud-score').textContent = String(state.score);
  $('hud-streak').textContent = String(state.streak);
  renderHearts();
}
const say = (t: string): void => {
  $('live').textContent = t;
};

function fillMenu(): void {
  $('menu-best').textContent = String(data.best);
  $('menu-streak').textContent = String(data.bestStreak);
}

function startGame(): void {
  state = newState();
  fx = newFx();
  rng = makeRng(Date.now());
  data.games++;
  save(store, data);
  show('play');
  renderHud();
  say('Partie lancée. 3 vies.');
}

function endGame(): void {
  const record = state.score > data.best;
  if (record) data.best = state.score;
  data.bestStreak = Math.max(data.bestStreak, state.bestStreak);
  save(store, data);
  $('over-score').textContent = String(state.score);
  $('over-best').textContent = String(data.best);
  $('over-streak').textContent = String(state.bestStreak);
  $('over-record').hidden = !record;
  fillMenu();
  show('over');
  say(`Partie finie. Score ${state.score}${record ? ', nouveau record' : ''}.`);
}

/* ---------- boucle ---------- */
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  if (mode === 'play') {
    const ev = step(state, dt, rng);
    for (const e of ev) {
      if (e.type === 'deliver') {
        fx.hillFlash[e.hill] = 0.3;
        fx.pops.push({ x: [56, 180, 304][e.hill], y: 480, text: `+${e.points}`, t: 0, color: '#FFD60A' });
        sfx.deliver(e.streak);
        $('hud-score').classList.remove('bump');
        void $('hud-score').offsetWidth;
        $('hud-score').classList.add('bump');
      } else if (e.type === 'miss') {
        fx.hillBad[e.hill] = 0.5;
        if (!reduced()) fx.shake = 1;
        fx.pops.push({ x: [56, 180, 304][e.hill], y: 480, text: 'Raté !', t: 0, color: '#FFFFFF' });
        sfx.miss();
        say(`Erreur. Il reste ${e.lives} vie${e.lives > 1 ? 's' : ''}.`);
      } else if (e.type === 'over') {
        sfx.over();
      }
    }
    if (ev.length) renderHud();
    if (state.over) setTimeout(endGame, reduced() ? 100 : 700);
  }
  if (mode === 'play' || mode === 'over') {
    for (let i = 0; i < 3; i++) {
      fx.hillFlash[i] = Math.max(0, fx.hillFlash[i] - dt);
      fx.hillBad[i] = Math.max(0, fx.hillBad[i] - dt);
    }
    fx.shake = Math.max(0, fx.shake - dt * 4);
    for (const p of fx.pops) p.t += dt;
    fx.pops = fx.pops.filter((p) => p.t < 0.9);
  }
  draw(ctx, state, fx, mode === 'play' && firstTap && state.time > 0.4);
  requestAnimationFrame(frame);
}

/* ---------- commandes ---------- */
const on = (id: string, fn: () => void): void => $(id).addEventListener('click', fn);
on('btn-play', startGame);
on('btn-again', startGame);
on('btn-over-menu', () => show('menu'));
on('btn-pause', () => pause());
on('btn-resume', () => show('play'));
on('btn-pause-menu', () => show('menu'));
on('btn-settings', () => {
  fillSettings();
  show('settings');
});
on('settings-back', () => show('menu'));

function pause(): void {
  if (mode === 'play' && !state.over) show('pause');
}
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === '1' || e.key === '2' || e.key === '3') flip(Number(e.key) - 1);
  else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
    if (mode === 'play') pause();
    else if (mode === 'pause') show('play');
  }
});

/* ---------- réglages ---------- */
function fillSettings(): void {
  $('set-sound').setAttribute('aria-pressed', String(data.settings.sound));
  $('set-sound-v').textContent = data.settings.sound ? 'Oui' : 'Non';
  document.querySelectorAll<HTMLButtonElement>('[data-motion]').forEach((b) => {
    b.setAttribute('aria-checked', String(b.dataset.motion === data.settings.reducedMotion));
  });
}
on('set-sound', () => {
  data.settings.sound = !data.settings.sound;
  setSound(data.settings.sound);
  save(store, data);
  fillSettings();
});
document.querySelectorAll<HTMLButtonElement>('[data-motion]').forEach((b) =>
  b.addEventListener('click', () => {
    data.settings.reducedMotion = b.dataset.motion as MotionPref;
    save(store, data);
    applyMotion();
    fillSettings();
  }),
);
let confirmReset = false;
on('set-reset', () => {
  const b = $('set-reset');
  if (!confirmReset) {
    confirmReset = true;
    b.textContent = 'Sûr ? Appuie encore';
    setTimeout(() => {
      confirmReset = false;
      b.textContent = 'Effacer ma progression';
    }, 3000);
    return;
  }
  confirmReset = false;
  data = freshSave();
  save(store, data);
  setSound(true);
  applyMotion();
  fillSettings();
  fillMenu();
  b.textContent = 'Effacer ma progression';
});

/* ---------- démarrage ---------- */
setSound(data.settings.sound);
applyMotion();
mq.addEventListener('change', applyMotion);
layout();
fillMenu();
show('menu');
requestAnimationFrame(frame);
