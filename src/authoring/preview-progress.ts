import { levels } from '../game';
import { earnPart, moveTo, newAdventure, placePart, validateProgress, type AdventureProgress } from '../adventure/progress';
import { destinations, validateChapter, type Chapter, type Character } from '../adventure/types';

export type PreviewOptions = { sceneId: string; playerName: string; character: Character; mathsLevel: number };

/** Reach a scene through legal transitions, without reading or writing any save store. */
export function previewProgress(chapter: Chapter, options: PreviewOptions): AdventureProgress {
  const errors = validateChapter(chapter);
  if (errors.length) throw new Error(errors.join('; '));
  if (!Number.isInteger(options.mathsLevel) || !levels[options.mathsLevel]) throw new Error('Unknown maths level');
  if (options.character !== 'boy' && options.character !== 'girl') throw new Error('Unknown character');
  const target = options.sceneId || chapter.start;
  if (!Object.hasOwn(chapter.scenes, target)) throw new Error(`Unknown scene: ${target}`);
  const visited = new Set<string>();
  function pathTo(id: string): string[] | null {
    if (id === target) return [id];
    if (visited.has(id)) return null;
    visited.add(id);
    for (const next of destinations(chapter.scenes[id])) {
      const path = pathTo(next);
      if (path) return [id, ...path];
    }
    return null;
  }
  const path = pathTo(chapter.start);
  if (!path) throw new Error(`Unreachable scene: ${target}`);
  let progress = newAdventure(chapter, options.mathsLevel, options.character, options.playerName);
  for (const next of path.slice(1)) {
    const scene = chapter.scenes[progress.sceneId];
    if (scene.type === 'build') {
      while (progress.placedCount < scene.targetPlacedParts) progress = placePart(earnPart(progress, chapter), chapter);
    }
    // Scripted construction automatically enters its introduction after the last piece.
    if (progress.sceneId !== next) progress = moveTo(progress, chapter, next);
  }
  if (progress.sceneId !== target || !validateProgress(progress, chapter)) throw new Error(`Cannot seed valid progress for ${target}`);
  return progress;
}
