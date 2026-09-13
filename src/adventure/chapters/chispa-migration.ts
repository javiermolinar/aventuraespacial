import type { AdventureProgress } from '../progress';
import { destinations, type Chapter } from '../types';
import { chispaV4Chapter as chapter } from './chispa-v4';
import { waterInterlude } from './interludes';

/** The v3 water puzzle used exactly the same layout as the radio cable puzzle. */
export function chispaV3Chapter(): Chapter {
  const scenes = { ...chapter.scenes };
  delete scenes['radio-cables'];
  scenes['water-pipes'] = { ...waterInterlude, next: 'repair' };
  for (const id of ['high-five', 'wave']) {
    const scene = scenes[id];
    if (scene.type !== 'story') throw new Error('Unexpected Chispa greeting structure');
    scenes[id] = { ...scene, choices: scene.choices.map(choice => ({ ...choice, next: 'water-pipes' })) };
  }
  return { ...chapter, version: 3, scenes };
}

/** Reconstruct the graph before the optional pipe interlude. */
export function chispaV2Chapter(): Chapter {
  const scenes = { ...chispaV3Chapter().scenes };
  delete scenes['water-pipes'];
  for (const id of ['high-five', 'wave']) {
    const scene = scenes[id];
    if (scene.type !== 'story') throw new Error('Unexpected Chispa greeting structure');
    scenes[id] = { ...scene, choices: scene.choices.map(choice => ({ ...choice, next: 'repair' })) };
  }
  return { ...chapter, version: 2, scenes };
}

/** Reconstruct only the v1 graph/build limits needed to validate old saves. */
export function chispaV1Chapter(): Chapter {
  const scenes = { ...chispaV2Chapter().scenes };
  const build = scenes['build-start'];
  if (build.type !== 'build' || scenes.tool.type !== 'comprehension') throw new Error('Unexpected Chispa chapter structure');
  scenes['build-start'] = { ...build, targetPlacedParts: 2 };
  scenes.tool = { ...scenes.tool, next: 'build-arms' };
  scenes['build-arms'] = { ...build, targetPlacedParts: 4, next: 'hello' };
  scenes['build-legs'] = { ...build, targetPlacedParts: 6, next: 'repair' };
  for (const id of ['high-five', 'wave']) {
    const scene = scenes[id];
    if (scene.type !== 'story') throw new Error('Unexpected Chispa greeting structure');
    scenes[id] = { ...scene, choices: [{ id: 'legs', label: 'Terminar de construir a Chispa.', next: 'build-legs' }] };
  }
  return { ...chapter, version: 1, scenes };
}

/** Reconstruct the v5 linear graph, including the removed key search and greeting. */
export function chispaV5Chapter(): Chapter {
  const scenes = { ...chapter.scenes };
  for (const id of ['window', 'high-five', 'wave']) delete scenes[id];
  const plan = scenes.plan;
  const hello = scenes.hello;
  const build = scenes['build-start'];
  const introduction = chapter.robot.introduction!;
  if (plan.type !== 'story' || hello.type !== 'story' || build.type !== 'build') throw new Error('Unexpected Chispa v4 structure');
  scenes.plan = { ...plan, choices: [{ id: 'continue', label: 'Entrar al taller', next: 'workshop' }] };
  scenes.hello = { ...hello, choices: [{ id: 'continue', label: 'Ir a la radio con Chispa.', next: 'radio-cables' }] };
  scenes['build-start'] = { ...build, autoAdvance: true, next: 'robot-introduction' };
  scenes['robot-introduction'] = {
    type: 'story', title: introduction.title, paragraphs: introduction.paragraphs, image: 'workshop',
    robotIntroduction: { artwork: introduction.artwork },
    choices: [{ id: 'continue', label: 'Seguir la historia', next: 'tool' }],
  };
  return { ...chapter, version: 5, scenes };
}

/** Call only on a validated v5 save. Removed middle pages now open the game. */
export function migrateChispaV5(progress: AdventureProgress): AdventureProgress {
  const removed = (id: string) => id === 'tool' || id === 'hello';
  return {
    ...progress, chapterVersion: 6,
    sceneId: removed(progress.sceneId) ? 'radio-cables' : progress.sceneId,
    history: progress.history.filter(id => !removed(id)),
  };
}

/** Call only on a validated v4 save. Removed branches rejoin without replaying maths. */
export function migrateChispaV4(progress: AdventureProgress, current: Chapter): AdventureProgress {
  const sceneId = progress.sceneId === 'window' ? 'workshop'
    : ['high-five', 'wave', 'tool', 'hello'].includes(progress.sceneId) ? 'radio-cables'
    : progress.sceneId === 'build-start' && progress.placedCount === 6 ? 'robot-introduction'
    : progress.sceneId;
  // The new chapter is linear. Rebuild its canonical prefix, retaining the current activity.
  const history: string[] = [];
  let id = current.start;
  while (id !== sceneId) {
    if (!current.scenes[id] || history.includes(id)) throw new Error(`Cannot migrate Chispa scene: ${sceneId}`);
    history.push(id);
    const next = destinations(current.scenes[id]);
    if (next.length !== 1) throw new Error(`Cannot migrate Chispa scene: ${sceneId}`);
    id = next[0];
  }
  return { ...progress, chapterVersion: current.version, sceneId, history };
}

/** Rename only the interlude; preserve rotations, completion, identity and maths. */
export function migrateChispaV3(progress: AdventureProgress): AdventureProgress {
  const rename = (id: string) => id === 'water-pipes' ? 'radio-cables' : id;
  return {
    ...progress, chapterVersion: 4, sceneId: rename(progress.sceneId), history: progress.history.map(rename),
    ...(progress.pipeRotations === undefined ? {} : { pipeRotations: Object.fromEntries(Object.entries(progress.pipeRotations).map(([id, rotations]) => [rename(id), rotations])) }),
  };
}

/** Saves already past the new optional interlude keep their scene and skip it. */
export function migrateChispaV2(progress: AdventureProgress): AdventureProgress {
  const history = [...progress.history];
  const repairIndex = history.indexOf('repair');
  if (repairIndex >= 0) history.splice(repairIndex, 0, 'water-pipes');
  else if (progress.sceneId === 'repair') history.push('water-pipes');
  return { ...progress, chapterVersion: 3, history };
}

/** Call only after validating against the v1 graph. Never grant or discard pieces. */
export function migrateChispaV1(progress: AdventureProgress): AdventureProgress {
  const buildIndex = progress.history.indexOf('build-start');
  const unfinished = progress.placedCount < 6 && (buildIndex >= 0 || progress.sceneId === 'build-start');
  if (unfinished || progress.sceneId === 'build-legs') {
    // Finish the same six-operation round, then replay the post-build conversation.
    return { ...progress, chapterVersion: 2, sceneId: 'build-start', history: progress.history.slice(0, buildIndex < 0 ? progress.history.length : buildIndex) };
  }
  return { ...progress, chapterVersion: 2, history: progress.history.filter(id => id !== 'build-arms' && id !== 'build-legs') };
}
