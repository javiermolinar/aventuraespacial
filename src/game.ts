import { generateRound, type Random } from './games/robot-lab/operations';
import type { Operation } from './lib/maths';
export { columnAnswer, needsExchange, needsTens, operationLabel, resultOf, type Operation } from './lib/maths';
export type PartId = 'head' | 'body' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';
export type Progress = { completed: Record<string, number>; sound: boolean };

export const parts: { id: PartId; name: string; shortName: string }[] = [
  { id: 'head', name: 'la cabeza', shortName: 'Cabeza' },
  { id: 'body', name: 'el cuerpo', shortName: 'Cuerpo' },
  { id: 'leftArm', name: 'un brazo', shortName: 'Brazo izq.' },
  { id: 'rightArm', name: 'el otro brazo', shortName: 'Brazo der.' },
  { id: 'leftLeg', name: 'una pierna', shortName: 'Pierna izq.' },
  { id: 'rightLeg', name: 'la otra pierna', shortName: 'Pierna der.' },
];

export const levels = [
  { name: 'Primeras cuentas', description: 'Sumas y restas pequeñas', design: 'sprout', color: '#87b99d', robot: 'Brote', pieceCount: 4 },
  { name: 'Decenas y unidades', description: 'Sumas y restas sin llevadas', design: 'spark', color: '#b5a3e8', robot: 'Chispa', pieceCount: 6 },
  { name: 'Cuentas hasta 20', description: 'Sumas y restas hasta 20', design: 'bolt', color: '#efc775', robot: 'Rayo', pieceCount: 6 },
  { name: 'Sumas con llevadas', description: 'Solo sumas, paso a paso', design: 'space', color: '#e9a188', robot: 'Cosmo', pieceCount: 6 },
  { name: 'Cuentas más grandes', description: 'Dos cifras, sin llevadas', design: 'bubble', color: '#8fc1ce', robot: 'Burbuja', pieceCount: 6 },
  { name: 'Restas con llevadas', description: 'Solo restas, paso a paso', design: 'gear', color: '#d6a3bd', robot: 'Tuerca', pieceCount: 6 },
  { name: 'El gran taller', description: 'Sumas y restas; las restas sin llevadas', design: 'pixel', color: '#b3bd78', robot: 'Pixel', pieceCount: 6 },
  { name: 'Llegan las centenas', description: 'Tres cifras, sin llevadas', design: 'cobalt', color: '#78bcca', robot: 'Cobalto', pieceCount: 6 },
  { name: 'Sumas de tres cifras', description: 'Llevadas en varias columnas', design: 'nova', color: '#d9ae65', robot: 'Nova', pieceCount: 6 },
  { name: 'Restas de tres cifras', description: 'Cambios entre centenas, decenas y unidades', design: 'titan', color: '#99b4de', robot: 'Titan', pieceCount: 6 },
  { name: 'Tres números, más llevadas', description: 'Sumas de tres números: llevamos 2', design: 'bolt', color: '#e8a4cf', robot: 'Rayo experto', pieceCount: 6 },
  // Subtraction-only practice without borrowing. Appended so saved progress and adventure profiles keep their indices.
  { name: 'Restas de una cifra', description: 'Solo restas pequeñas, sin llevadas', design: 'leaf', color: '#8fc48e', robot: 'Hoja', pieceCount: 6 },
  { name: 'Restas de dos cifras', description: 'Solo restas, sin llevadas', design: 'flash', color: '#f0b6d0', robot: 'Destello', pieceCount: 6 },
  { name: 'Restas de tres cifras fáciles', description: 'Solo restas, sin llevadas', design: 'azure', color: '#7fb4e8', robot: 'Azur', pieceCount: 6 },
] as const;

/**
 * Order in which levels are presented, as indices into `levels`. Saved progress, adventure profiles and
 * `?level=N` links keep using the stable index; only the displayed number and the belt speed follow this order.
 */
export const levelOrder = [0, 11, 1, 2, 3, 4, 12, 5, 6, 7, 13, 8, 9, 10] as const;
/** Number shown to the player (1-based) for a stable level index. */
export const levelNumber = (level: number) => levelOrder.indexOf(level as typeof levelOrder[number]) + 1;
/** Belt-speed step: harder levels in the presented order run faster. */
export const levelPace = (level: number) => Math.max(0, levelNumber(level) - 1);
/** Stable index of the level presented after this one, if any. */
export const nextLevel = (level: number): number | undefined => levelOrder[levelNumber(level)];

// Illustrations for the landing cards only, never used to populate a game.
export const levelExamples: Operation[] = [
  { a: 4, b: 3, operator: '+' }, { a: 10, b: 5, operator: '+' },
  { a: 8, b: 7, operator: '+' }, { a: 15, b: 15, operator: '+' },
  { a: 25, b: 12, operator: '−' }, { a: 23, b: 7, operator: '−' },
  { a: 43, b: 12, operator: '−' },
  { a: 324, b: 152, operator: '+' }, { a: 278, b: 156, operator: '+' },
  { a: 402, b: 178, operator: '−' },
  { a: 289, b: 178, operator: '+', extraAddends: [177] },
  { a: 8, b: 3, operator: '−' }, { a: 47, b: 23, operator: '−' }, { a: 685, b: 241, operator: '−' },
];

export function getOperations(level: number, random: Random = Math.random): Operation[] {
  if (!levels[level]) throw new RangeError(`Unknown maths stage: ${level}`);
  return generateRound(level, levels[level].pieceCount, random);
}

const storageKey = 'little-robot-lab:v1';
export function loadProgress(): Progress {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || 'null');
    const completed: Record<string, number> = {};
    if (raw && typeof raw.completed === 'object' && raw.completed) {
      for (let i = 0; i < levels.length; i++) {
        const count = raw.completed[String(i)];
        if (Number.isSafeInteger(count) && count > 0) completed[String(i)] = Math.min(count, 9999);
      }
    }
    return { completed, sound: raw?.sound === true };
  } catch {
    return { completed: {}, sound: false };
  }
}

export function saveProgress(progress: Progress) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
