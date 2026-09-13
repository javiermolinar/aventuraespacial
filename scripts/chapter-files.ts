import { mkdir, readdir, realpath, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import type { ChapterEntry } from '../src/adventure/chapters/catalog';
import type { ArtworkReference } from '../src/authoring/validation';

/** Check exact spelling even on macOS, and reject symlinks escaping public/. */
export async function checkArtworkFiles(root: string, artwork: ArtworkReference[]): Promise<string[]> {
  const errors: string[] = [];
  const publicRoot = await realpath(join(root, 'public'));
  for (const url of new Set(artwork.map(item => item.url))) {
    const field = artwork.find(item => item.url === url)!.field;
    try {
      if (!url.startsWith('../')) throw new Error('not a public-relative image');
      const segments = url.slice(3).split('/');
      if (segments.some(segment => !segment || segment === '.' || segment === '..' || segment.includes('\\'))) throw new Error('unsafe path');
      let file = publicRoot;
      for (const segment of segments) {
        if (!(await readdir(file)).includes(segment)) throw new Error('missing file or wrong letter case');
        file = join(file, segment);
      }
      const actual = await realpath(file);
      const inside = relative(publicRoot, actual);
      if (inside.startsWith('..') || isAbsolute(inside)) throw new Error('image escapes public/');
      const info = await stat(actual);
      if (!info.isFile() || info.size === 0) throw new Error('not a nonempty file');
    } catch (error) { errors.push(`${field}: ${url}: ${(error as Error).message}`); }
  }
  return errors;
}

export function draftTemplate(entry: ChapterEntry): string {
  const quote = JSON.stringify;
  const literal = (value: unknown) => JSON.stringify(value, null, 2).replace(/\n/g, '\n  ');
  const artwork = { ship: {
    boy: { landscape: '../adventure/ship.svg', portrait: '../adventure/ship.svg' },
    girl: { landscape: '../adventure/ship.svg', portrait: '../adventure/ship.svg' },
  } };
  return `// Unpublished draft. Replace TODO text and placeholder artwork before registration.
// Moving this file from drafts/ to chapters/ keeps these imports valid.
import type { ChapterScript } from '../chapter-script';
import { waterTankPuzzle } from '../../games/connections/pipes';

export default {
  id: ${quote(entry.id)},
  version: 1,
  title: ${quote(`TODO: título del capítulo de ${entry.robot.name}`)},
  subtitle: ${quote(`TODO: subtítulo de ${entry.robot.name}`)},
  summary: { title: 'TODO: resumen', description: 'TODO: descripción del capítulo' },
  robot: ${literal(entry.robot)},
  artwork: ${literal(artwork)},
  intro: {
    image: 'ship',
    pages: [{ id: 'intro', title: 'TODO: presentación', text: ['TODO: presenta el problema a {{name}}.'] }],
  },
  maths: { id: 'build', title: 'TODO: construcción', instruction: 'TODO: explica por qué hay que construir el robot.' },
  robotIntroduction: {
    image: 'workshop',
    pages: [{ id: 'robot-introduction', title: ${quote(entry.robot.name)}, text: ['TODO: presenta el trabajo del robot.'] }],
  },
  // Optional: add middle dialogue before the game.
  game: {
    id: 'connections', type: 'pipes', theme: 'water', image: 'workshop',
    title: 'TODO: juego de conexiones', text: ['TODO: explica el objetivo del juego.'],
    layout: waterTankPuzzle,
  },
  ending: {
    image: 'ship',
    pages: [{ id: 'ending', title: 'TODO: desenlace', text: ['TODO: cuenta cómo se resolvió el problema.'] }],
    prompt: 'TODO: invita a contar la historia.',
  },
} satisfies ChapterScript;
`;
}

export async function createDraft(root: string, id: string, catalog: readonly ChapterEntry[]): Promise<string> {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error('Use a lowercase catalogue ID, for example brote');
  const entry = catalog.find(entry => entry.id === id);
  if (!entry) throw new Error(`Unknown catalogue ID: ${id}. Available: ${catalog.filter(entry => !entry.chapter).map(entry => entry.id).join(', ')}`);
  if (entry.chapter) throw new Error(`${id} is already playable; this command never edits published chapters or versions`);
  const publishedPath = resolve(root, 'src/adventure/chapters', `${id}.ts`);
  try { await stat(publishedPath); throw new Error(`Refusing to shadow existing source: ${publishedPath}`); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const path = resolve(root, 'src/adventure/drafts', `${id}.ts`);
  await mkdir(dirname(path), { recursive: true });
  try { await writeFile(path, draftTemplate(entry), { flag: 'wx' }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error(`Draft already exists: ${path}. Nothing overwritten.`);
    throw error;
  }
  return path;
}
