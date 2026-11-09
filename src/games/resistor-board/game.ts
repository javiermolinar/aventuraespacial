export const slotIds = ['A', 'B', 'C'] as const;
export type SlotId = typeof slotIds[number];
export type ComponentId = 'bridge' | 'r1' | 'r2' | 'r3';
export type Placements = Record<SlotId, ComponentId | null>;
export type LevelId = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type BranchLevelId = 2 | 3 | 4 | 5 | 6 | 7;

export const components: Record<ComponentId, { name: string; shortName: string; loss: number }> = {
  bridge: { name: 'Puente', shortName: 'Puente · 0', loss: 0 },
  r1: { name: 'Resistencia −1', shortName: 'Resistencia', loss: 1 },
  r2: { name: 'Resistencia −2', shortName: 'Resistencia', loss: 2 },
  r3: { name: 'Resistencia −3', shortName: 'Resistencia', loss: 3 },
};

export const emptyPlacements = (): Placements => ({ A: null, B: null, C: null });
export type ResistorState = { placements: Placements; tested: boolean };
export const emptyResistorState = (): ResistorState => ({ placements: emptyPlacements(), tested: false });

/** Only unique, available pieces in this board's active slots can be restored. */
export function validResistorState(value: unknown, level: LevelId): value is ResistorState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as ResistorState;
  if (typeof state.tested !== 'boolean' || !state.placements || typeof state.placements !== 'object' || Array.isArray(state.placements) ||
    Object.keys(state.placements).length !== slotIds.length || !slotIds.every(slot => Object.hasOwn(state.placements, slot))) return false;
  const active = level === 1 ? slotIds : branchLevels[level].slots;
  const pieces = slotIds.map(slot => state.placements[slot]);
  if (!slotIds.every(slot => state.placements[slot] === null || (active.includes(slot) && levelPieces[level].includes(state.placements[slot]!)))) return false;
  const used = pieces.filter(piece => piece !== null);
  return new Set(used).size === used.length && (!state.tested || evaluateBoard(state.placements, level).complete);
}

const allPieces: ComponentId[] = ['bridge', 'r1', 'r2', 'r3'];
export const levelPieces: Record<LevelId, ComponentId[]> = {
  1: ['bridge', 'r1', 'r3'], 2: ['bridge', 'r1', 'r3'], 3: allPieces, 4: allPieces, 5: allPieces, 6: allPieces, 7: allPieces,
};

// Parallel boards: every branch starts with `start` sparks, loses its fixed
// resistor plus the placed piece, and cannot drop below 0. The bulb receives the sum.
export const branchLevels: Record<BranchLevelId, { start: number; target: number; slots: SlotId[]; fixed: Partial<Record<SlotId, number>> }> = {
  2: { start: 3, target: 2, slots: ['A', 'B'], fixed: { A: 1 } },
  3: { start: 4, target: 2, slots: ['A', 'B', 'C'], fixed: { A: 2, C: 2 } },
  4: { start: 4, target: 2, slots: ['A', 'B', 'C'], fixed: { B: 2, C: 3 } },
  5: { start: 4, target: 3, slots: ['A', 'B', 'C'], fixed: { A: 1, B: 3 } },
  6: { start: 4, target: 4, slots: ['A', 'B', 'C'], fixed: { A: 3, B: 1, C: 2 } },
  7: { start: 4, target: 4, slots: ['A', 'B', 'C'], fixed: { A: 3 } },
};
export const targetFor = (level: LevelId) => level === 1 ? 2 : branchLevels[level as BranchLevelId].target;

export function evaluateBoard(placements: Placements, level: LevelId = 1) {
  if (level === 1) {
    const complete = slotIds.every(slot => placements[slot] !== null);
    const afterFirst = placements.A ? 5 - components[placements.A].loss : null;
    const arrival = placements.A && placements.B ? afterFirst! - components[placements.B].loss : null;
    const outcome = !complete ? 'incomplete' : arrival === 2 ? 'correct' : arrival! > 2 ? 'high' : 'low';
    return { complete, afterFirst, arrival, outcome, solved: complete && arrival === 2, outs: {} as Partial<Record<SlotId, number | null>> };
  }

  const config = branchLevels[level];
  const target = config.target;
  const outs: Partial<Record<SlotId, number | null>> = {};
  for (const slot of config.slots) {
    const piece = placements[slot];
    outs[slot] = piece ? Math.max(0, config.start - (config.fixed[slot] ?? 0) - components[piece].loss) : null;
  }
  const complete = config.slots.every(slot => outs[slot] !== null);
  const arrival = complete ? config.slots.reduce((sum, slot) => sum + outs[slot]!, 0) : null;
  const outcome = !complete ? 'incomplete' : arrival === target ? 'correct' : arrival! > target ? 'high' : 'low';
  return { complete, afterFirst: null as number | null, arrival, outcome, solved: complete && arrival === target, outs };
}
