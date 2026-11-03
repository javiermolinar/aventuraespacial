import { connectionGames, type ConnectionLevel } from './levels';
import { neighbour, openings, type ConnectionTheme, type Direction, type PipeKind, type PipeLayout } from './pipes';

export const advancedDifficulties = ['Avanzado', 'Avanzado', 'Experto', 'Experto', 'Maestro', 'Maestro'];

/**
 * A column-wise spanning snake, with extra edges chosen deterministically.
 * Every cell is used; extra edges create cycles and four-way junctions.
 * Reflecting the rows gives the cable game its own topology, not a recolour.
 */
function advancedNetwork(size: number, goalCount: number, loopCount: number, seed: number, reflected: boolean): PipeLayout {
  const transform = (index: number) => reflected ? (size - 1 - Math.floor(index / size)) * size + index % size : index;
  const path = Array.from({ length: size ** 2 }, (_, step) => {
    const column = Math.floor(step / size), offset = step % size;
    return transform((column % 2 ? size - 1 - offset : offset) * size + column);
  });
  const source = { index: path[0], side: 3 as const };
  const last = path.at(-1)!;
  const goalIndices = [last, ...Array.from({ length: size }, (_, row) => transform(row * size + size - 1)).filter(index => index !== last)].slice(0, goalCount);
  const goals = goalIndices.map(index => ({ index, side: 1 as const }));
  const ports: Direction[][] = Array.from({ length: size ** 2 }, () => []);
  ports[source.index].push(source.side);
  goals.forEach(goal => ports[goal.index].push(goal.side));
  const join = (a: number, b: number) => {
    const side = ([0, 1, 2, 3] as Direction[]).find(direction => neighbour(a, direction, size) === b);
    if (side === undefined) throw new Error('Non-adjacent network cells');
    ports[a].push(side);
    ports[b].push((side + 2) % 4 as Direction);
  };
  path.slice(1).forEach((index, step) => join(path[step], index));

  // Introduce one four-way hub in every advanced board before adding loops.
  const hub = transform(Math.floor(size / 2) * size + Math.floor(size / 2));
  join(hub - 1, hub);
  join(hub, hub + 1);

  let state = seed;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32; };
  const candidates = ports.flatMap((sides, index) => ([1, 2] as Direction[]).flatMap(side => {
    const next = neighbour(index, side, size);
    return next !== null && !sides.includes(side) ? [{ a: index, b: next, order: random() }] : [];
  })).sort((a, b) => a.order - b.order);
  candidates.slice(0, loopCount - 2).forEach(({ a, b }) => join(a, b));

  const tiles: PipeKind[] = ports.map(sides => sides.length === 4 ? 'cross' : sides.length === 3 ? 'tee' : (sides[0] + 2) % 4 === sides[1] ? 'straight' : 'elbow');
  const solution = tiles.map((kind, index) => {
    const rotation = [0, 1, 2, 3].find(turn => {
      const sides = openings(kind, turn);
      return sides.length === ports[index].length && sides.every(side => ports[index].includes(side));
    });
    if (rotation === undefined) throw new Error(`Invalid advanced network piece at ${index}`);
    return rotation;
  });
  return { size, tiles, solution,
    initial: solution.map((rotation, index) => tiles[index] === 'cross' ? rotation : (rotation + (tiles[index] === 'straight' ? 1 : 1 + Math.floor(random() * 3))) % 4),
    source, goal: goals[0], extraGoals: goals.slice(1), network: true };
}

const configurations = [
  { size: 5, goals: 3, loops: 4 },
  { size: 5, goals: 4, loops: 7 },
  { size: 6, goals: 4, loops: 7 },
  { size: 6, goals: 5, loops: 10 },
  { size: 6, goals: 6, loops: 12 },
  { size: 6, goals: 6, loops: 15 },
];
const names = {
  water: ['Cruce de corrientes', 'Los cuatro depósitos', 'La gran canalización', 'El laberinto del agua', 'Seis depósitos', 'La ciudad del agua'],
  radio: ['Cruce de señales', 'Las cuatro emisoras', 'La gran antena', 'El laberinto de cables', 'Seis frecuencias', 'La ciudad de la radio'],
};

export const advancedConnectionGames = Object.fromEntries((['water', 'radio'] as const).map(theme => [theme, {
  title: connectionGames[theme].title,
  description: 'Redes de 5 × 5 y 6 × 6, hasta seis destinos y cruces de cuatro vías.',
  levels: configurations.map(({ size, goals, loops }, index): ConnectionLevel => ({
    id: `${theme}-advanced-v1-${index + 1}`,
    name: names[theme][index],
    layout: advancedNetwork(size, goals, loops, 100 + index * 17 + (theme === 'radio' ? 59 : 0), theme === 'radio'),
  })),
}])) as Record<ConnectionTheme, { title: string; description: string; levels: ConnectionLevel[] }>;
