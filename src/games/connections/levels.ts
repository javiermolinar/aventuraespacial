import { neighbour, openings, type ConnectionTheme, type Direction, type PipeKind, type PipeLayout } from './pipes';

export type ConnectionLevel = { id: string; name: string; layout: PipeLayout };
export const connectionDifficulties = ['Inicio', 'Fácil', 'Medio', 'Difícil', 'Avanzado', 'Experto'];

/** Author a route from left to right; spare pieces are optional, never required. */
function route(size: number, path: number[], misplaced: number, seed: number): PipeLayout {
  const tiles: PipeKind[] = Array.from({ length: size ** 2 }, (_, index) => (index + seed) % 3 === 0 ? 'elbow' : 'straight');
  const solution = tiles.map((_, index) => (index + seed) % 4);
  path.forEach((index, step) => {
    const from = step === 0 ? 3 : [0, 1, 2, 3].find(side => neighbour(index, side as Direction, size) === path[step - 1])!;
    const to = step === path.length - 1 ? 1 : [0, 1, 2, 3].find(side => neighbour(index, side as Direction, size) === path[step + 1])!;
    tiles[index] = (from + 2) % 4 === to ? 'straight' : 'elbow';
    solution[index] = [0, 1, 2, 3].find(rotation => {
      const ports = openings(tiles[index], rotation);
      return ports.includes(from as Direction) && ports.includes(to as Direction);
    })!;
  });
  const initial = solution.map((rotation, index) => path.includes(index) ? rotation : (rotation + 1) % 4);
  // Leave an increasing number of route pieces to repair. Keep the source
  // connected in the introductory levels so the first step is easy to see.
  path.slice(-misplaced).forEach((index, step) => { initial[index] = (solution[index] + (tiles[index] === 'elbow' ? 1 + (step + seed) % 3 : 1)) % 4; });
  return { size, tiles, initial, solution, source: { index: path[0], side: 3 }, goal: { index: path.at(-1)!, side: 1 } };
}

/** A spanning route plus branches and loops. All pieces belong to one sealed network. */
function network(size: number, path: number[], destinations: number[], links: [number, number][], seed: number): PipeLayout {
  const base = route(size, path, path.length, seed);
  const ports = base.tiles.map((kind, index) => openings(kind, base.solution[index]));
  destinations.forEach(index => ports[index].push(1));
  for (const [a, b] of links) {
    const side = [0, 1, 2, 3].find(direction => neighbour(a, direction as Direction, size) === b) as Direction;
    ports[a].push(side);
    ports[b].push((side + 2) % 4 as Direction);
  }
  const tiles: PipeKind[] = ports.map(sides => sides.length === 3 ? 'tee' : (sides[0] + 2) % 4 === sides[1] ? 'straight' : 'elbow');
  const solution = tiles.map((kind, index) => {
    const rotation = [0, 1, 2, 3].find(turn => {
      const sides = openings(kind, turn);
      return sides.length === ports[index].length && sides.every(side => ports[index].includes(side));
    });
    if (rotation === undefined) throw new Error(`Invalid network piece at ${index}`);
    return rotation;
  });
  const goals = [base.goal.index, ...destinations].sort((a, b) => a - b).map(index => ({ index, side: 1 as const }));
  return { ...base, tiles, solution, initial: solution.map((rotation, index) => (rotation + (tiles[index] === 'straight' ? 1 : 1 + (index + seed) % 3)) % 4),
    goal: goals[0], extraGoals: goals.slice(1), network: true };
}

export const connectionGames: Record<ConnectionTheme, { title: string; description: string; levels: ConnectionLevel[] }> = {
  water: {
    title: 'La ruta del agua',
    description: 'Empieza con un camino y termina con una red de cuatro depósitos. ¡Que no escape ni una gota!',
    levels: [
      { id: 'water-1', name: 'Un camino recto', layout: route(3, [3, 4, 5], 2, 1) },
      { id: 'water-2', name: 'Las primeras curvas', layout: route(3, [0, 1, 4, 7, 8], 4, 2) },
      { id: 'water-network-3', name: 'Dos depósitos', layout: network(4, [4, 0, 1, 2, 3, 7, 6, 5, 9, 8, 12, 13, 14, 10, 11, 15], [3], [], 21) },
      { id: 'water-network-4', name: 'Red sin fugas', layout: network(4, [4, 0, 1, 2, 3, 7, 6, 5, 9, 8, 12, 13, 14, 10, 11, 15], [3, 7], [[1, 5]], 26) },
      { id: 'water-network-5', name: 'La estación de agua', layout: network(5, [10, 15, 20, 21, 16, 11, 6, 5, 0, 1, 2, 3, 4, 9, 8, 7, 12, 13, 14, 19, 18, 17, 22, 23, 24], [19, 4], [[9, 14], [2, 7]], 23) },
      { id: 'water-network-6', name: 'La red maestra', layout: network(5, [10, 15, 20, 21, 22, 23, 24, 19, 18, 17, 16, 11, 12, 13, 14, 9, 8, 7, 6, 5, 0, 1, 2, 3, 4], [24, 14, 9], [[15, 16], [6, 11], [13, 18], [2, 7]], 36) },
    ],
  },
  radio: {
    title: 'Enciende la radio',
    description: 'De una radio a toda una central. Une cada cable y comprueba que no quede ningún conector suelto.',
    levels: [
      { id: 'radio-1', name: 'La primera conexión', layout: route(3, [0, 1, 2], 2, 7) },
      { id: 'radio-2', name: 'Dobla la esquina', layout: route(3, [3, 4, 1, 2], 4, 8) },
      { id: 'radio-network-3', name: 'Dos radios', layout: network(4, [0, 1, 2, 3, 7, 6, 5, 4, 8, 12, 13, 9, 10, 14, 15, 11], [3], [], 31) },
      { id: 'radio-network-4', name: 'El circuito completo', layout: network(4, [0, 4, 8, 12, 13, 14, 15, 11, 10, 9, 5, 1, 2, 6, 7, 3], [15, 11], [[4, 5]], 32) },
      { id: 'radio-network-5', name: 'Señal para todos', layout: network(5, [20, 21, 22, 23, 24, 19, 18, 17, 16, 15, 10, 5, 0, 1, 2, 3, 4, 9, 8, 7, 6, 11, 12, 13, 14], [4, 9], [[14, 19], [8, 13]], 33) },
      { id: 'radio-network-6', name: 'La central de radio', layout: network(5, [20, 15, 10, 5, 0, 1, 2, 3, 4, 9, 14, 19, 18, 13, 8, 7, 6, 11, 12, 17, 16, 21, 22, 23, 24], [19, 14, 9], [[17, 22], [20, 21], [2, 7], [5, 6]], 34) },
    ],
  },
};
