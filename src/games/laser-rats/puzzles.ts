import { cellIndex, type Puzzle, type RobotKind } from './rules';

function authored(id: string, name: string, size: number, rats: string[], walls: string[], start: string, robots: RobotKind[]): Puzzle {
  return { id, name, size, rats: rats.map(c => cellIndex(c, size)), walls: walls.map(c => cellIndex(c, size)), start: cellIndex(start, size), robots };
}

/** Authored progression from introductory geometry to a constrained final mission. */
export const lessons: Puzzle[] = [
  authored('first-lines', 'Sigue las líneas', 5, ['C1', 'C5', 'A2', 'E2'], [], 'A4', ['row', 'column']),
  authored('crossing-clues', 'Cruces y diagonales', 5, ['D1', 'D2', 'A3', 'B3', 'E4', 'B5'], [], 'A1', ['row', 'column', 'diagonal']),
  authored('hidden-walls', 'Al otro lado del muro', 7, ['B2', 'D2', 'B4', 'F4', 'D6', 'F6', 'A4', 'D1', 'G7', 'C7'], ['E4', 'F5', 'B6'], 'D4', ['row', 'column', 'diagonal']),
  authored('row-team', 'Tres robots de filas', 5, ['A1', 'E1', 'A3', 'E3', 'A5', 'E5'], ['B2', 'D4'], 'C3', ['row', 'row', 'row']),
  authored('open-a-path', 'Abre camino', 5, ['E5', 'D2', 'B5', 'C3', 'D5', 'B4', 'E1', 'E2'], ['E4', 'A2', 'A4', 'D4'], 'C5', ['row', 'column', 'diagonal']),
  // One useful opening shot, then fresh clues lead to a simple two-robot finish.
  authored('follow-the-clues', 'Paso a paso', 5, ['A1', 'C1', 'E1', 'C2', 'E2', 'D4', 'D5'], ['A2', 'B3', 'C4', 'E4'], 'B1', ['row', 'column', 'diagonal']),
  // Walls enclose the occupied C3–C5 column: clear C4 before placing its robot.
  authored('recovered-ground', 'Terreno recuperado', 6, ['D1', 'E2', 'C3', 'B4', 'C4', 'F4', 'C5', 'D5'], ['C2', 'A3', 'B3', 'A5', 'B5', 'C6'], 'A4', ['row', 'column', 'diagonal']),
  // The final five rats are all deducible before choosing the last two shots.
  authored('plan-two-shots', 'Piensa dos jugadas', 6, ['A2', 'B3', 'D3', 'B4', 'F5', 'B6', 'C6', 'D6', 'F6'], ['F3', 'A5', 'B5', 'C5', 'D5'], 'E6', ['row', 'column', 'diagonal']),
  authored('last-patrol', 'La última patrulla', 7, ['A6', 'G1', 'C6', 'F4', 'B4', 'G4', 'E2', 'D3', 'D4', 'D7', 'E1', 'G2'], ['E3', 'G5', 'D1', 'F6'], 'F1', ['row', 'row', 'column', 'diagonal']),
];
