import { describe, expect, it } from 'vitest';
import { makeRng } from '../src/rng';
import { EDGES, gapFor, newState, pointsFor, speedFor, step, toggle, type Food } from '../src/sim';

/** Lâche une fourmi de couleur `food` seule et fait tourner jusqu'à son arrivée. */
function run(food: Food, sw: (0 | 1)[]) {
  const s = newState();
  s.switches = sw;
  s.nextSpawn = 1e9;
  s.ants.push({ id: 1, food, edge: 0, d: 0 });
  const ev = [];
  for (let i = 0; i < 2000 && s.ants.length; i++) ev.push(...step(s, 0.05, () => 0));
  return { s, ev };
}

describe('réseau', () => {
  it('chaque fourmilière est atteignable', () => {
    const reach = new Set<number>();
    for (const a of [0, 1] as const) for (const b of [0, 1] as const) for (const c of [0, 1] as const) {
      const { ev } = run(0, [a, b, c]);
      for (const e of ev) if (e.type === 'deliver' || e.type === 'miss') reach.add(e.hill);
    }
    expect([...reach].sort()).toEqual([0, 1, 2]);
  });
  it('les tronçons ont une longueur', () => expect(EDGES.every((e) => e.len > 0)).toBe(true));
});

describe('livraisons', () => {
  it('bonne fourmilière : point et série', () => {
    const { s, ev } = run(0, [0, 0, 0]);
    expect(ev.some((e) => e.type === 'deliver' && e.hill === 0)).toBe(true);
    expect(s.score).toBe(1);
    expect(s.streak).toBe(1);
    expect(s.lives).toBe(3);
  });
  it('mauvaise fourmilière : une vie perdue, série à zéro', () => {
    const s = newState();
    s.streak = 4;
    s.nextSpawn = 1e9;
    s.switches = [0, 0, 0];
    s.ants.push({ id: 1, food: 2, edge: 0, d: 0 });
    for (let i = 0; i < 2000 && s.ants.length; i++) step(s, 0.05, () => 0);
    expect(s.lives).toBe(2);
    expect(s.streak).toBe(0);
    expect(s.score).toBe(0);
  });
  it("l'aiguillage compte à l'arrivée de la fourmi", () => {
    const s = newState();
    s.nextSpawn = 1e9;
    s.ants.push({ id: 1, food: 2, edge: 0, d: 0 });
    // on bascule en route : la fourmi doit suivre la direction du moment
    for (let i = 0; i < 5; i++) step(s, 0.05, () => 0);
    toggle(s, 0);
    toggle(s, 2);
    for (let i = 0; i < 2000 && s.ants.length; i++) step(s, 0.05, () => 0);
    expect(s.score).toBe(1);
  });
  it('trois erreurs : game over, plus rien ne bouge', () => {
    const s = newState();
    s.switches = [0, 0, 0];
    const rng = () => 0.99; // toujours la nourriture 2, mais les aiguillages vont vers 0
    let over = false;
    for (let i = 0; i < 4000 && !over; i++) over = step(s, 0.05, rng).some((e) => e.type === 'over');
    expect(over).toBe(true);
    expect(s.lives).toBe(0);
    expect(step(s, 1, rng)).toEqual([]);
    toggle(s, 0);
    expect(s.switches[0]).toBe(0);
  });
});

describe('difficulté', () => {
  it('la vitesse monte puis plafonne', () => {
    expect(speedFor(10)).toBeGreaterThan(speedFor(0));
    expect(speedFor(1000)).toBe(speedFor(500));
  });
  it("l'écart entre fourmis diminue puis plafonne", () => {
    expect(gapFor(20)).toBeLessThan(gapFor(0));
    expect(gapFor(1000)).toBeCloseTo(0.62);
  });
  it('points de série', () => {
    expect([1, 5, 6, 11, 100].map(pointsFor)).toEqual([1, 1, 2, 3, 5]);
  });
  it('simulation déterministe', () => {
    const go = () => {
      const s = newState();
      const r = makeRng(7);
      for (let i = 0; i < 400; i++) step(s, 0.05, r);
      return [s.score, s.lives, s.ants.length];
    };
    expect(go()).toEqual(go());
  });
});
