import { describe, expect, it } from 'vitest';
import { SAVE_KEY } from '../src/config';
import { freshSave, load, sanitize, save, type Store } from '../src/save';

const fake = (init?: string): Store & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  if (init !== undefined) m.set(SAVE_KEY, init);
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};

describe('sauvegarde', () => {
  it('défaut si vide ou corrompu', () => {
    expect(load(fake())).toEqual(freshSave());
    expect(load(fake('{pas du json'))).toEqual(freshSave());
  });
  it('aller-retour du record', () => {
    const st = fake();
    const d = freshSave();
    d.best = 42;
    save(st, d);
    expect(load(st).best).toBe(42);
  });
  it('nettoie les valeurs invalides', () => {
    const d = sanitize({ best: -3, bestStreak: 'x', games: 2.7, settings: { sound: 'oui', reducedMotion: 'zzz' } });
    expect(d.best).toBe(0);
    expect(d.bestStreak).toBe(0);
    expect(d.games).toBe(2);
    expect(d.settings).toEqual({ sound: true, reducedMotion: 'auto' });
  });
  it('ne plante pas si le stockage refuse', () => {
    expect(() => save({ getItem: () => null, setItem: () => { throw new Error('plein'); } }, freshSave())).not.toThrow();
  });
});
