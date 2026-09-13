import { levels } from '../game';
import { generateRound } from '../games/robot-lab/operations';
import { resultOf, type Operation } from '../lib/maths';
import { destinations, type Chapter, type Character } from './types';
import { normalizePlayerName, playerNameMaxLength } from './personalization';
import { chispaV1Chapter, chispaV2Chapter, chispaV3Chapter, chispaV5Chapter, migrateChispaV1, migrateChispaV2, migrateChispaV3, migrateChispaV4, migrateChispaV5 } from './chapters/chispa-migration';
import { chispaV4Chapter } from './chapters/chispa-v4';
import { pipeFlow, validRotations } from './pipes';

export const adventureStorageKey = 'matefaciles:adventure:v1';
export type AdventureProgress = {
  chapterId: string; chapterVersion: number; sceneId: string;
  history: string[]; mathsLevel: number; character: Character; playerName: string;
  operations: Operation[]; placedCount: number; ready: boolean;
  pipeRotations?: Record<string, number[]>;
};

export function newAdventure(chapter: Chapter, mathsLevel: number, character: Character = 'boy', playerName = ''): AdventureProgress {
  const name = normalizePlayerName(playerName);
  if (name.length > playerNameMaxLength) throw new RangeError('Player name is too long');
  return {
    chapterId: chapter.id, chapterVersion: chapter.version, sceneId: chapter.start,
    history: [], mathsLevel, character, playerName: name, operations: generateRound(mathsLevel, 6), placedCount: 0, ready: false,
  };
}

function validOperation(value: unknown): value is Operation {
  if (!value || typeof value !== 'object') return false;
  const op = value as Operation;
  return Number.isInteger(op.a) && Number.isInteger(op.b) && op.a >= op.b && op.b >= 0 && op.a < 100 &&
    (op.operator === '+' || op.operator === '−') && resultOf(op) >= 0 && resultOf(op) < 100;
}

export function validateProgress(value: unknown, chapter: Chapter): value is AdventureProgress {
  if (!value || typeof value !== 'object') return false;
  const p = value as AdventureProgress;
  if (p.chapterId !== chapter.id || p.chapterVersion !== chapter.version || !Number.isInteger(p.mathsLevel) || !levels[p.mathsLevel] ||
    !Array.isArray(p.operations) || p.operations.length !== 6 || !p.operations.every(validOperation) ||
    !Number.isInteger(p.placedCount) || typeof p.ready !== 'boolean' || !Array.isArray(p.history) || p.history.length > Object.keys(chapter.scenes).length ||
    typeof p.sceneId !== 'string' || (p.character !== 'boy' && p.character !== 'girl') ||
    typeof p.playerName !== 'string' || p.playerName.length > playerNameMaxLength || normalizePlayerName(p.playerName) !== p.playerName) return false;
  if (p.pipeRotations !== undefined) {
    if (!p.pipeRotations || typeof p.pipeRotations !== 'object' || Array.isArray(p.pipeRotations)) return false;
    for (const [id, rotations] of Object.entries(p.pipeRotations)) {
      if (!Object.hasOwn(chapter.scenes, id)) return false;
      const scene = chapter.scenes[id];
      if (scene.type !== 'pipes' || !validRotations(rotations, scene.layout.tiles.length) || (id !== p.sceneId && !p.history.includes(id))) return false;
    }
  }
  let expected = [chapter.start];
  let minimum = 0;
  const seen = new Set<string>();
  for (const id of p.history) {
    if (typeof id !== 'string' || !expected.includes(id) || !Object.hasOwn(chapter.scenes, id) || seen.has(id)) return false;
    seen.add(id);
    const scene = chapter.scenes[id];
    if (scene.type === 'build') minimum = scene.targetPlacedParts;
    expected = destinations(scene);
  }
  if (!expected.includes(p.sceneId) || !Object.hasOwn(chapter.scenes, p.sceneId) || seen.has(p.sceneId)) return false;
  const scene = chapter.scenes[p.sceneId];
  const maximum = scene.type === 'build' ? scene.targetPlacedParts : minimum;
  return p.placedCount >= minimum && p.placedCount <= maximum && (!p.ready || (scene.type === 'build' && p.placedCount < maximum));
}

export type LoadedAdventure = { progress: AdventureProgress | null; unavailable: boolean; reset: boolean };
export function loadAdventure(chapter: Chapter): LoadedAdventure {
  let raw: string | null;
  try { raw = localStorage.getItem(adventureStorageKey); }
  catch { return { progress: null, unavailable: true, reset: false }; }
  if (!raw) return { progress: null, unavailable: false, reset: false };
  try {
    const progress = restoreAdventure(JSON.parse(raw), chapter);
    return { progress, unavailable: false, reset: !progress };
  } catch { return { progress: null, unavailable: false, reset: true }; }
}

/** Validate/migrate a record without reading or writing storage (also used by campaign saves). */
export function restoreAdventure(parsed: unknown, chapter: Chapter): AdventureProgress | null {
  try {
    // Old saves may lack a character/name or contain a paragraph cursor. The whole
    // current scene is visible now; discard only the obsolete cursor.
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const { beat: _legacyBeat, ...value } = { character: 'boy', playerName: '', beat: undefined, ...parsed };
      if (validateProgress(value, chapter)) return value;
      if (chapter.id === 'chispa-radio' && chapter.version === 6) {
        if (validateProgress(value, chispaV5Chapter())) {
          const migrated = migrateChispaV5(value);
          if (validateProgress(migrated, chapter)) return migrated;
        }
        const previous = chispaV2Chapter();
        const waterChapter = chispaV3Chapter();
        let v4 = validateProgress(value, chispaV4Chapter) ? value : null;
        if (!v4) {
          let v3 = validateProgress(value, waterChapter) ? value : null;
          if (!v3) {
            const v2 = validateProgress(value, previous) ? value : validateProgress(value, chispaV1Chapter()) ? migrateChispaV1(value) : null;
            if (v2 && validateProgress(v2, previous)) v3 = migrateChispaV2(v2);
          }
          if (v3 && validateProgress(v3, waterChapter)) v4 = migrateChispaV3(v3);
        }
        if (v4 && validateProgress(v4, chispaV4Chapter)) {
          const migrated = migrateChispaV4(v4, chapter);
          if (validateProgress(migrated, chapter)) return migrated;
        }
      }
    }
  } catch { /* Invalid saves are never allowed to break play. */ }
  return null;
}

export function saveAdventure(progress: AdventureProgress): boolean {
  try { localStorage.setItem(adventureStorageKey, JSON.stringify(progress)); return true; }
  catch { return false; }
}

/** Called after activity success, an optional minigame skip, or an unrestricted story choice. */
export function moveTo(progress: AdventureProgress, chapter: Chapter, next: string): AdventureProgress {
  const scene = chapter.scenes[progress.sceneId];
  if (!destinations(scene).includes(next) || (scene.type === 'build' && progress.placedCount !== scene.targetPlacedParts)) return progress;
  return { ...progress, sceneId: next, history: [...progress.history, progress.sceneId], ready: false };
}

export function rotatePipe(progress: AdventureProgress, chapter: Chapter, index: number, turns = 1): AdventureProgress {
  const scene = chapter.scenes[progress.sceneId];
  if (scene.type !== 'pipes' || !Number.isInteger(index) || index < 0 || index >= scene.layout.tiles.length || !Number.isInteger(turns)) return progress;
  const rotations = progress.pipeRotations?.[progress.sceneId] ?? scene.layout.initial;
  if (pipeFlow(scene.layout, rotations).solved || turns % 4 === 0) return progress;
  const next = rotations.map((rotation, tile) => tile === index ? ((rotation + turns) % 4 + 4) % 4 : rotation);
  return { ...progress, pipeRotations: { ...progress.pipeRotations, [progress.sceneId]: next } };
}

export function earnPart(progress: AdventureProgress, chapter: Chapter): AdventureProgress {
  const scene = chapter.scenes[progress.sceneId];
  return scene.type === 'build' && progress.placedCount < scene.targetPlacedParts ? { ...progress, ready: true } : progress;
}

export function placePart(progress: AdventureProgress, chapter: Chapter): AdventureProgress {
  const scene = chapter.scenes[progress.sceneId];
  if (scene.type !== 'build' || !progress.ready || progress.placedCount >= scene.targetPlacedParts) return progress;
  const placed = { ...progress, ready: false, placedCount: progress.placedCount + 1 };
  return scene.autoAdvance && placed.placedCount === scene.targetPlacedParts ? moveTo(placed, chapter, scene.next) : placed;
}
