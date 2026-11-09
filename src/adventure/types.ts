import { puzzles } from '../games/shape-box/puzzle';
import type { RobotDesign } from '../games/robot-lab/design';
import { validPipeLayout, type PipeLayout, type ConnectionTheme } from '../games/connections/pipes';
import { levels } from '../game';
import type { LevelId as ResistorLevel } from '../games/resistor-board/game';

export type Character = 'boy' | 'girl';
export type Illustration = 'ship' | 'workshop' | 'radio' | 'journey' | 'storage' | 'sleep';
export type ResponsiveArtwork = { landscape: string; portrait: string };
export type CharacterArtwork = Record<Character, ResponsiveArtwork>;
export type IntroductionArtwork = ResponsiveArtwork | CharacterArtwork;
export type RobotIntroduction = {
  title: string;
  paragraphs: string[];
  artwork?: IntroductionArtwork;
};
type Reading = {
  title: string; image: Illustration; paragraphs: string[];
  ambience?: 'alarm' | 'calm';
  robotIntroduction?: { artwork?: IntroductionArtwork };
};
export type StoryScene = Reading & {
  type: 'story';
  choices: { id: string; label: string; next: string }[];
};
export type ComprehensionScene = Reading & {
  type: 'comprehension';
  skill: 'literal' | 'inference';
  question: string;
  options: { id: string; label: string; correct: boolean }[];
  next: string;
};
export type BuildScene = {
  type: 'build'; title: string; instruction: string; completion: string;
  targetPlacedParts: number; next: string;
  /** Scripted chapters enter their explicit robot introduction after the sixth placement. */
  autoAdvance?: boolean;
};
export type SequenceScene = Reading & {
  type: 'sequence'; question: string;
  // Display order is authored separately from the correct chronology.
  events: { id: string; text: string }[];
  correctOrder: string[];
  next: string;
};
export type PipeScene = Reading & { type: 'pipes'; theme?: ConnectionTheme; layout: PipeLayout; next: string };
export type PackingScene = Reading & { type: 'packing'; puzzleIndex: number; next: string };
export type ResistorScene = Reading & { type: 'resistors'; level: ResistorLevel; next: string };
export type EndingScene = Reading & { type: 'ending'; prompt?: string };
export type Scene = StoryScene | ComprehensionScene | BuildScene | SequenceScene | PipeScene | PackingScene | ResistorScene | EndingScene;
export type ReadingScene = Exclude<Scene, { type: 'build' | 'pipes' | 'packing' | 'resistors' }>;
export type Chapter = {
  id: string; version: number; title: string; subtitle: string;
  intro: { title: string; description: string };
  /** An authored difficulty overrides the player's practice level for this chapter. */
  mathsLevel?: number;
  artwork: { ship: CharacterArtwork } & Partial<Record<Exclude<Illustration, 'ship'>, CharacterArtwork>>;
  robot: { name: string; design: RobotDesign; color: string; introduction?: RobotIntroduction };
  start: string;
  scenes: Record<string, Scene>;
};

export function destinations(scene: Scene): string[] {
  if (scene.type === 'ending') return [];
  return scene.type === 'story' ? scene.choices.map(choice => choice.next) : [scene.next];
}

/** Chapters are small acyclic graphs. Catch broken content during tests/build-time authoring. */
export function validateChapter(chapter: Chapter): string[] {
  const errors: string[] = [];
  if (chapter.mathsLevel !== undefined && (!Number.isInteger(chapter.mathsLevel) || !levels[chapter.mathsLevel])) errors.push('Invalid chapter maths level');
  const seen = new Set<string>();
  const visiting = new Set<string>();
  const unique = (ids: string[]) => new Set(ids).size === ids.length;
  function visit(id: string, previousTarget: number) {
    const scene = Object.hasOwn(chapter.scenes, id) ? chapter.scenes[id] : undefined;
    if (!scene) { errors.push(`Missing scene: ${id}`); return; }
    if (visiting.has(id)) { errors.push(`Cycle at: ${id}`); return; }
    seen.add(id);
    visiting.add(id);
    if (scene.type !== 'build' && (!scene.paragraphs.length || scene.paragraphs.some(paragraph => !paragraph.trim()))) errors.push(`Empty passage: ${id}`);
    if (scene.type === 'build') {
      if (scene.targetPlacedParts !== 6 || previousTarget !== 0) errors.push(`Invalid build target: ${id}`);
      previousTarget = scene.targetPlacedParts;
    }
    if (scene.type === 'comprehension' && (scene.options.length < 2 || !unique(scene.options.map(option => option.id)) || scene.options.filter(option => option.correct).length !== 1)) errors.push(`Invalid answers: ${id}`);
    if (scene.type === 'story' && (!scene.choices.length || !unique(scene.choices.map(choice => choice.id)))) errors.push(`Invalid choices: ${id}`);
    if (scene.type === 'sequence') {
      const ids = scene.events.map(event => event.id);
      if (ids.length < 2 || !unique(ids) || !unique(scene.correctOrder) || scene.correctOrder.length !== ids.length || scene.correctOrder.some(event => !ids.includes(event))) errors.push(`Invalid sequence: ${id}`);
    }
    if (scene.type === 'pipes') {
      const validTheme = scene.theme === undefined || scene.theme === 'water' || scene.theme === 'radio';
      // The radio's fixed return lead runs outside a left-to-right cable panel.
      const validTerminals = scene.theme !== 'radio' || (scene.layout.source.side === 3 && scene.layout.goal.side === 1);
      if (!validTheme || !validTerminals || !validPipeLayout(scene.layout)) errors.push(`Invalid pipe layout: ${id}`);
    }
    if (scene.type === 'packing' && (!Number.isInteger(scene.puzzleIndex) || !puzzles[scene.puzzleIndex])) errors.push(`Invalid packing puzzle: ${id}`);
    if (scene.type === 'resistors' && (!Number.isInteger(scene.level) || scene.level < 1 || scene.level > 7)) errors.push(`Invalid resistor level: ${id}`);
    if (scene.type === 'ending' && previousTarget !== 6) errors.push(`Incomplete robot at ending: ${id}`);
    for (const next of destinations(scene)) visit(next, previousTarget);
    visiting.delete(id);
  }
  visit(chapter.start, 0);
  for (const id of Object.keys(chapter.scenes)) if (!seen.has(id)) errors.push(`Unreachable scene: ${id}`);
  if (!Object.values(chapter.scenes).some(scene => scene.type === 'ending')) errors.push('Missing ending');
  return [...new Set(errors)];
}
