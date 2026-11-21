import { SAVE_KEY, SAVE_VERSION } from './config';

export type MotionPref = 'auto' | 'yes' | 'no';
export interface SaveData {
  v: number;
  best: number;
  bestStreak: number;
  games: number;
  settings: { sound: boolean; reducedMotion: MotionPref };
}
export interface Store {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

export const freshSave = (): SaveData => ({
  v: SAVE_VERSION,
  best: 0,
  bestStreak: 0,
  games: 0,
  settings: { sound: true, reducedMotion: 'auto' },
});

const int = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);

/** Nettoie un objet lu : entiers >= 0, valeurs inconnues remises par défaut. */
export function sanitize(raw: unknown): SaveData {
  const s = freshSave();
  if (!raw || typeof raw !== 'object') return s;
  const r = raw as Record<string, unknown>;
  s.best = int(r.best);
  s.bestStreak = int(r.bestStreak);
  s.games = int(r.games);
  const st = r.settings as Record<string, unknown> | undefined;
  if (st && typeof st === 'object') {
    if (typeof st.sound === 'boolean') s.settings.sound = st.sound;
    if (st.reducedMotion === 'yes' || st.reducedMotion === 'no' || st.reducedMotion === 'auto') s.settings.reducedMotion = st.reducedMotion;
  }
  return s;
}

export function load(store: Store): SaveData {
  try {
    const t = store.getItem(SAVE_KEY);
    return t ? sanitize(JSON.parse(t)) : freshSave();
  } catch {
    return freshSave();
  }
}

export function save(store: Store, d: SaveData): void {
  try {
    store.setItem(SAVE_KEY, JSON.stringify(d));
  } catch {
    /* stockage plein ou interdit : on joue quand même */
  }
}
