import type { Chapter } from '../types';
import { chispaChapter } from './chispa';
import { broteChapter } from './brote';

export type ChapterEntry = {
  id: string;
  robot: Pick<Chapter['robot'], 'name' | 'design' | 'color'>;
  /** Omit until a final story title is authored; the revealed card uses the robot name. */
  title?: string;
  chapter?: Chapter;
};

export function playableChapter(chapter: Chapter): ChapterEntry {
  return { id: chapter.id, title: chapter.title, robot: chapter.robot, chapter };
}

/** Story order is independent of maths-practice levels. Future entries contain no playable placeholder story. */
export const chapterCatalog: readonly ChapterEntry[] = [
  playableChapter(chispaChapter),
  playableChapter(broteChapter),
  { id: 'rayo', robot: { name: 'Rayo', design: 'bolt', color: '#efc775' } },
  { id: 'tuerca', robot: { name: 'Tuerca', design: 'gear', color: '#d6a3bd' } },
  { id: 'burbuja', robot: { name: 'Burbuja', design: 'bubble', color: '#8fc1ce' } },
  { id: 'cosmo', robot: { name: 'Cosmo', design: 'space', color: '#e9a188' } },
  { id: 'pixel', robot: { name: 'Pixel', design: 'pixel', color: '#b3bd78' } },
];

export function validateCatalog(catalog: readonly ChapterEntry[]): void {
  const ids = catalog.map(entry => entry.id);
  if (!catalog[0]?.chapter || new Set(ids).size !== ids.length || ids.some(id => !/^[a-z0-9][a-z0-9-]*$/.test(id)) ||
    catalog.some(entry => entry.chapter && entry.chapter.id !== entry.id)) throw new Error('Invalid chapter catalogue');
}
