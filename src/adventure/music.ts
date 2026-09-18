import { soundtracks } from '../music';
import type { Scene } from './types';

/** Keep one track across reading pages; change music only when the activity changes. */
export function adventureMusic(scene: Scene | null, introducingRobot = false): string {
  if (introducingRobot || (scene && scene.type !== 'build' && scene.robotIntroduction) || scene?.type === 'ending') return soundtracks.robot.file;
  if (scene?.type === 'build') return soundtracks.maths.file;
  if (scene?.type === 'pipes' || scene?.type === 'packing') return soundtracks.game.file;
  return soundtracks.story.file;
}
