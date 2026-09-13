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
] as const;

// Illustrations for the landing cards only, never used to populate a game.
export const levelExamples: Operation[] = [
  { a: 4, b: 3, operator: '+' }, { a: 10, b: 5, operator: '+' },
  { a: 8, b: 7, operator: '+' }, { a: 15, b: 15, operator: '+' },
  { a: 25, b: 12, operator: '−' }, { a: 23, b: 7, operator: '−' },
  { a: 43, b: 12, operator: '−' },
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
