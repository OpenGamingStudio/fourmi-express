import { HILLS, MAX_LIVES, SPAWN, SWITCHES, type Pt } from './config';

export type Dir = 0 | 1; // 0 = gauche, 1 = droite
export type Food = 0 | 1 | 2; // fraise, feuille, myrtille : couleur = fourmilière

/** Un tronçon de piste : une ligne droite d'un point à un autre. */
export interface Edge {
  a: Pt;
  b: Pt;
  len: number;
  /** Fin du tronçon : un aiguillage (index) ou une fourmilière (index). */
  to: { kind: 'switch' | 'hill'; i: number };
}

const edge = (a: Pt, b: Pt, to: Edge['to']): Edge => ({ a, b, len: Math.hypot(b.x - a.x, b.y - a.y), to });

/** Tronçons : 0 entrée ; 1-2 après l'aiguillage 1 ; 3-4 après le 2 ; 5-6 après le 3. */
export const EDGES: Edge[] = [
  edge(SPAWN, SWITCHES[0], { kind: 'switch', i: 0 }),
  edge(SWITCHES[0], SWITCHES[1], { kind: 'switch', i: 1 }),
  edge(SWITCHES[0], SWITCHES[2], { kind: 'switch', i: 2 }),
  edge(SWITCHES[1], HILLS[0], { kind: 'hill', i: 0 }),
  edge(SWITCHES[1], HILLS[1], { kind: 'hill', i: 1 }),
  edge(SWITCHES[2], HILLS[1], { kind: 'hill', i: 1 }),
  edge(SWITCHES[2], HILLS[2], { kind: 'hill', i: 2 }),
];
/** Pour chaque aiguillage : tronçons de sortie [gauche, droite]. */
export const OUT: [number, number][] = [
  [1, 2],
  [3, 4],
  [5, 6],
];

export interface Ant {
  id: number;
  food: Food;
  edge: number;
  d: number; // distance parcourue sur le tronçon
}

export type SimEvent =
  | { type: 'deliver'; ant: Ant; hill: number; points: number; streak: number }
  | { type: 'miss'; ant: Ant; hill: number; lives: number }
  | { type: 'spawn'; ant: Ant }
  | { type: 'over' };

export interface State {
  switches: Dir[];
  ants: Ant[];
  score: number;
  deliveries: number;
  streak: number;
  bestStreak: number;
  lives: number;
  over: boolean;
  time: number;
  nextSpawn: number;
  nextId: number;
}

export const speedFor = (deliveries: number): number => 78 + Math.min(deliveries * 2, 130);
export const gapFor = (deliveries: number): number => Math.max(0.62, 1.9 - deliveries * 0.03);

export function newState(): State {
  return {
    switches: [0, 0, 0],
    ants: [],
    score: 0,
    deliveries: 0,
    streak: 0,
    bestStreak: 0,
    lives: MAX_LIVES,
    over: false,
    time: 0,
    nextSpawn: 0.6,
    nextId: 1,
  };
}

export function toggle(s: State, i: number): void {
  if (s.over || i < 0 || i >= s.switches.length) return;
  s.switches[i] = s.switches[i] === 0 ? 1 : 0;
}

/** Points d'une livraison réussie : 1, puis +1 tous les 5 enchaînées (plafonné à 5). */
export const pointsFor = (streak: number): number => Math.min(5, 1 + Math.floor((streak - 1) / 5));

export function posOf(a: Ant): Pt {
  const e = EDGES[a.edge];
  const t = e.len === 0 ? 1 : Math.min(1, a.d / e.len);
  return { x: e.a.x + (e.b.x - e.a.x) * t, y: e.a.y + (e.b.y - e.a.y) * t };
}

/** Fait avancer la partie de dt secondes. rng est utilisé pour la nourriture des nouvelles fourmis. */
export function step(s: State, dt: number, rng: () => number): SimEvent[] {
  const ev: SimEvent[] = [];
  if (s.over) return ev;
  s.time += dt;
  const sp = speedFor(s.deliveries);
  s.nextSpawn -= dt;
  while (s.nextSpawn <= 0) {
    const ant: Ant = { id: s.nextId++, food: Math.floor(rng() * 3) as Food, edge: 0, d: -s.nextSpawn * sp };
    s.ants.push(ant);
    ev.push({ type: 'spawn', ant });
    s.nextSpawn += gapFor(s.deliveries);
  }
  const alive: Ant[] = [];
  for (const ant of s.ants) {
    let move = sp * dt;
    let done = false;
    while (move > 0 && !done) {
      const e = EDGES[ant.edge];
      const room = e.len - ant.d;
      if (move < room) {
        ant.d += move;
        move = 0;
        break;
      }
      move -= Math.max(0, room);
      if (e.to.kind === 'switch') {
        // la direction compte à l'instant où la fourmi arrive
        ant.edge = OUT[e.to.i][s.switches[e.to.i]];
        ant.d = 0;
      } else {
        done = true;
        const hill = e.to.i;
        if (hill === ant.food) {
          s.deliveries++;
          s.streak++;
          s.bestStreak = Math.max(s.bestStreak, s.streak);
          const points = pointsFor(s.streak);
          s.score += points;
          ev.push({ type: 'deliver', ant, hill, points, streak: s.streak });
        } else {
          s.streak = 0;
          s.lives--;
          ev.push({ type: 'miss', ant, hill, lives: s.lives });
          if (s.lives <= 0) {
            s.over = true;
            ev.push({ type: 'over' });
          }
        }
      }
    }
    if (!done) alive.push(ant);
  }
  s.ants = s.over ? [] : alive;
  return ev;
}
