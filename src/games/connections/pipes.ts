export type ConnectionTheme = 'water' | 'radio';
export type Direction = 0 | 1 | 2 | 3; // north, east, south, west
export type PipeKind = 'straight' | 'elbow' | 'tee';
export type PipeEndpoint = { index: number; side: Direction };
export type PipeLayout = {
  size: number;
  tiles: PipeKind[];
  initial: number[];
  solution: number[];
  source: PipeEndpoint;
  goal: PipeEndpoint;
  extraGoals?: PipeEndpoint[];
  /** Networks require every piece, every destination and no open ports. */
  network?: boolean;
};

export function openings(kind: PipeKind, rotation: number): Direction[] {
  return (kind === 'tee' ? [0, 1, 2] : kind === 'straight' ? [0, 2] : [0, 1]).map(side => (side + rotation) % 4 as Direction);
}

export const pipeGoals = (layout: PipeLayout) => [layout.goal, ...layout.extraGoals ?? []];

/** Every unmatched opening counts, including those on disconnected pieces. */
export function pipeLeaks(layout: PipeLayout, rotations: number[]): PipeEndpoint[] {
  const terminals = [layout.source, ...pipeGoals(layout)];
  return layout.tiles.flatMap((kind, index) => openings(kind, rotations[index]).flatMap(side => {
    const next = neighbour(index, side, layout.size);
    const joined = next === null
      ? terminals.some(endpoint => endpoint.index === index && endpoint.side === side)
      : openings(layout.tiles[next], rotations[next]).includes((side + 2) % 4 as Direction);
    return joined ? [] : [{ index, side }];
  }));
}

export function validRotations(value: unknown, count: number): value is number[] {
  return Array.isArray(value) && value.length === count && value.every(rotation => Number.isInteger(rotation) && rotation >= 0 && rotation < 4);
}

export function neighbour(index: number, side: Direction, size: number): number | null {
  const row = Math.floor(index / size), column = index % size;
  if (side === 0) return row > 0 ? index - size : null;
  if (side === 1) return column < size - 1 ? index + 1 : null;
  if (side === 2) return row < size - 1 ? index + size : null;
  return column > 0 ? index - 1 : null;
}

/** Routes allow spare pieces; networks must connect everything without leaks. */
export function pipeFlow(layout: PipeLayout, rotations: number[]) {
  const wet: number[] = [];
  const { source } = layout;
  const ports = (index: number) => openings(layout.tiles[index], rotations[index]);
  if (!ports(source.index).includes(source.side)) return { wet, solved: false };
  wet.push(source.index);
  for (let cursor = 0; cursor < wet.length; cursor++) {
    const index = wet[cursor];
    for (const side of ports(index)) {
      const next = neighbour(index, side, layout.size);
      if (next !== null && !wet.includes(next) && ports(next).includes((side + 2) % 4 as Direction)) wet.push(next);
    }
  }
  const destinationsConnected = pipeGoals(layout).every(goal => wet.includes(goal.index) && ports(goal.index).includes(goal.side));
  return { wet, solved: destinationsConnected && (!layout.network || (wet.length === layout.tiles.length && pipeLeaks(layout, rotations).length === 0)) };
}

/** A hint identifies one tile, but never turns it or requires the authored solution to win. */
export function pipeHint(layout: PipeLayout, rotations: number[]): number | null {
  if (pipeFlow(layout, rotations).solved) return null;
  return pipeFlow(layout, layout.solution).wet.find(index => {
    const current = openings(layout.tiles[index], rotations[index]);
    return openings(layout.tiles[index], layout.solution[index]).some(side => !current.includes(side));
  }) ?? null;
}

export function validPipeLayout(layout: PipeLayout): boolean {
  if (!Number.isInteger(layout.size) || layout.size < 3 || layout.size > 5 ||
    layout.tiles.length !== layout.size ** 2 || layout.tiles.some(kind => kind !== 'straight' && kind !== 'elbow' && kind !== 'tee') ||
    !validRotations(layout.initial, layout.tiles.length) || !validRotations(layout.solution, layout.tiles.length)) return false;
  const endpoints = [layout.source, ...pipeGoals(layout)];
  if (new Set(endpoints.map(endpoint => endpoint.index)).size !== endpoints.length) return false;
  for (const endpoint of endpoints) {
    if (!Number.isInteger(endpoint.index) || endpoint.index < 0 || endpoint.index >= layout.tiles.length ||
      !Number.isInteger(endpoint.side) || endpoint.side < 0 || endpoint.side > 3 ||
      neighbour(endpoint.index, endpoint.side, layout.size) !== null) return false;
  }
  return layout.source.index !== layout.goal.index && pipeFlow(layout, layout.solution).solved && !pipeFlow(layout, layout.initial).solved;
}

export const waterTankPuzzle: PipeLayout = {
  size: 4,
  tiles: [
    'straight', 'elbow', 'elbow', 'straight',
    'elbow', 'elbow', 'elbow', 'straight',
    'straight', 'elbow', 'elbow', 'elbow',
    'elbow', 'elbow', 'straight', 'straight',
  ],
  initial:  [1, 3, 0, 0, 1, 2, 1, 1, 1, 3, 0, 0, 3, 1, 0, 1],
  solution: [1, 2, 0, 0, 1, 0, 2, 1, 1, 1, 3, 0, 3, 0, 1, 1],
  source: { index: 0, side: 3 },
  goal: { index: 15, side: 1 },
};
