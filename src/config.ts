export const W = 360;
export const H = 640;
export const SAVE_KEY = 'fourmi-express:save';
export const SAVE_VERSION = 1;
export const MAX_LIVES = 3;

export interface Pt {
  x: number;
  y: number;
}

/** Points du réseau (repère logique 360 x 640). */
export const SPAWN: Pt = { x: 180, y: 56 };
export const SWITCHES: Pt[] = [
  { x: 180, y: 190 }, // aiguillage 1 : haut
  { x: 92, y: 330 }, // aiguillage 2 : gauche
  { x: 268, y: 330 }, // aiguillage 3 : droite
];
export const HILLS: Pt[] = [
  { x: 56, y: 536 },
  { x: 180, y: 536 },
  { x: 304, y: 536 },
];
