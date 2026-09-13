import { expect, it } from 'vitest';
import { chapterCatalog } from '../adventure/chapters/catalog';
import { chispaChapter, chispaScript } from '../adventure/chapters/chispa';
import { checkCatalog, checkChapter } from './validation';
import { chapterSources } from './sources';

it('checks the published catalogue and gathers every responsive artwork file', () => {
  expect(checkCatalog(chapterCatalog)).toEqual([]);
  const report = checkChapter(chispaChapter, chapterCatalog);
  expect(report.errors).toEqual([]);
  expect(report.warnings).toEqual([]);
  expect(new Set(report.artwork.map(item => item.url)).size).toBe(6);
});

it('reports duplicate catalogue IDs, chapter ID mismatches and gaps in the playable prefix', () => {
  expect(checkCatalog([...chapterCatalog, chapterCatalog[0]])).toContain('Invalid chapter catalogue');
  expect(checkCatalog([{ ...chapterCatalog[0], id: 'other' }])).toContain('Invalid chapter catalogue');
  expect(checkCatalog([chapterCatalog[0], chapterCatalog[1], { ...chapterCatalog[2], chapter: { ...chispaChapter, id: 'rayo' } }]).join(';')).toContain('playable chapters must form a prefix');
});

it('rejects invalid metadata, unknown images and broken game configurations', () => {
  const chapter = structuredClone(chispaChapter);
  chapter.version = 0;
  chapter.title = '';
  chapter.scenes['radio-cables'].title = '';
  const scene = chapter.scenes['radio-cables'];
  if (scene.type !== 'pipes') throw new Error('fixture');
  scene.layout.solution = [];
  const errors = checkChapter(chapter, chapterCatalog).errors.join(';');
  expect(errors).toContain('positive integer');
  expect(errors).toContain('title: text cannot be empty');
  expect(errors).toContain('Invalid pipe layout: radio-cables');
});

it('rejects missing responsive artwork and unsafe, remote or route-dependent URLs', () => {
  for (const url of ['', '/adventure/test.webp', 'https://example.com/test.webp', '../adventure/../../secret.webp', '../adventure/%2e%2e/test.webp', '../adventure/test.webp?x=1', '../adventure\\test.webp']) {
    const chapter = structuredClone(chispaChapter);
    chapter.artwork.ship.girl.portrait = url;
    expect(checkChapter(chapter, chapterCatalog).errors.join(';')).toContain('artwork.ship.girl.portrait');
  }
  const chapter = structuredClone(chispaChapter);
  Reflect.deleteProperty(chapter.artwork.ship, 'boy');
  expect(checkChapter(chapter, chapterCatalog).errors.join(';')).toContain('artwork.ship.boy.landscape');
});

it('keeps TODOs as draft warnings but blocks publication, unknown IDs and robot mismatches', () => {
  const draft = { ...structuredClone(chispaChapter), id: 'brote', version: 1, robot: chapterCatalog[1].robot, title: 'TODO: título' };
  expect(checkChapter(draft, chapterCatalog, true).errors).toEqual([]);
  expect(checkChapter(draft, chapterCatalog, true).warnings.join(';')).toContain('replace TODO');
  expect(checkChapter(draft, chapterCatalog).errors.join(';')).toContain('replace TODO');
  expect(checkChapter({ ...draft, id: 'unknown' }, chapterCatalog, true).errors.join(';')).toContain('no matching catalogue entry');
  expect(checkChapter({ ...draft, robot: chispaChapter.robot }, chapterCatalog, true).errors.join(';')).toContain('robot.name');
  expect(checkChapter(chispaChapter, chapterCatalog, true).errors.join(';')).toContain('already published');
});

it('discovers and compiles drafts without registering them or hiding malformed scripts', async () => {
  const script = { ...structuredClone(chispaScript), id: 'brote', robot: chapterCatalog[1].robot };
  const source = chapterSources(chapterCatalog, { '../adventure/drafts/brote.ts': async () => ({ default: script }) }).at(-1)!;
  expect(source).toMatchObject({ id: 'brote', draft: true, label: 'Borrador: Brote' });
  expect((await source.load()).id).toBe('brote');
  expect(chapterCatalog[1].chapter).toBeUndefined();
  const wrongName = chapterSources(chapterCatalog, { '../adventure/drafts/rayo.ts': async () => ({ default: script }) }).at(-1)!;
  await expect(wrongName.load()).rejects.toThrow('filename must match');
  script.intro.pages = [];
  await expect(source.load()).rejects.toThrow('Dialogue phases need at least one page');
});
