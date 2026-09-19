import { cellIndex, type Puzzle, type RobotKind } from './rules';

function authored(id: string, name: string, size: number, rats: string[], walls: string[], start: string, robots: RobotKind[]): Puzzle {
  return { id, name, size, rats: rats.map(c => cellIndex(c, size)), walls: walls.map(c => cellIndex(c, size)), start: cellIndex(start, size), robots };
}

/** Authored progression from introductory geometry to a constrained final mission. */
export const lessons: Puzzle[] = [
  authored('first-lines', 'Sigue las líneas', 5, ['C1', 'C5', 'A2', 'E2'], [], 'C3', ['row', 'column']),
  authored('crossing-clues', 'Cruces y diagonales', 5, ['D1', 'D2', 'A3', 'B3', 'E4', 'B5'], [], 'B4', ['row', 'column', 'diagonal']),
  authored('hidden-walls', 'Al otro lado del muro', 7, ['B2', 'D2', 'B4', 'F4', 'D6', 'F6', 'A4', 'D1', 'G7', 'C7'], ['E4', 'F5', 'B6'], 'D4', ['row', 'column', 'diagonal']),
  authored('row-team', 'Tres robots de filas', 5, ['A1', 'E1', 'A3', 'E3', 'A5', 'E5'], ['B2', 'D4'], 'C3', ['row', 'row', 'row']),
  authored('last-patrol', 'La última patrulla', 7, ['C7', 'D6', 'D2', 'C3', 'G3', 'A6', 'G7', 'G5', 'E5', 'B4', 'G6', 'E6'], ['G2', 'C5', 'E7', 'F1'], 'D4', ['row', 'row', 'column', 'diagonal']),
];
