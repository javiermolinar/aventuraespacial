import { afterEach, beforeEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { chapterCatalog } from '../src/adventure/chapters/catalog';
import { defineChapter, type ChapterScript } from '../src/adventure/chapter-script';
import { waterTankPuzzle } from '../src/games/connections/pipes';
import { checkChapter } from '../src/authoring/validation';
import { checkArtworkFiles, createDraft } from './chapter-files';

let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'chapter-tools-')); await mkdir(join(root, 'public')); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

it('creates a typed compilable draft, leaving the catalogue and existing files untouched', async () => {
  const catalog = structuredClone(chapterCatalog);
  const path = await createDraft(root, 'brote', catalog);
  const source = await readFile(path, 'utf8');
  expect(path).toBe(join(root, 'src/adventure/drafts/brote.ts'));
  expect(source).toContain('satisfies ChapterScript');
  expect(source).toContain('version: 1');
  // Execute only our generated template; no chapter code or browser storage is loaded.
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exported: { default?: ChapterScript } = {};
  runInNewContext(compiled, { exports: exported, require: (id: string) => {
    if (id !== '../../games/connections/pipes') throw new Error(`Unexpected import: ${id}`);
    return { waterTankPuzzle };
  } });
  const draft = defineChapter(exported.default!);
  expect(draft.id).toBe('brote');
  expect(checkChapter(draft, catalog, true).errors).toEqual([]);
  expect(checkChapter(draft, catalog, true).warnings.length).toBeGreaterThan(0);
  expect(catalog).toEqual(chapterCatalog);
  await expect(createDraft(root, 'brote', catalog)).rejects.toThrow('Nothing overwritten');
  expect(await readFile(path, 'utf8')).toBe(source);
});

it('refuses traversal, unknown IDs, published chapters and unregistered existing sources', async () => {
  await expect(createDraft(root, '../brote', chapterCatalog)).rejects.toThrow('lowercase');
  await expect(createDraft(root, 'unknown', chapterCatalog)).rejects.toThrow('Unknown catalogue');
  await expect(createDraft(root, 'chispa-radio', chapterCatalog)).rejects.toThrow('already playable');
  await mkdir(join(root, 'src/adventure/chapters'), { recursive: true });
  await writeFile(join(root, 'src/adventure/chapters/brote.ts'), 'preserve me');
  await expect(createDraft(root, 'brote', chapterCatalog)).rejects.toThrow('Refusing to shadow');
  expect(await readFile(join(root, 'src/adventure/chapters/brote.ts'), 'utf8')).toBe('preserve me');
});

it('checks artwork existence, exact case, empty files and symlinks escaping public', async () => {
  await mkdir(join(root, 'public/art'));
  await writeFile(join(root, 'public/art/portrait.svg'), '<svg/>');
  await writeFile(join(root, 'public/art/empty.svg'), '');
  await writeFile(join(root, 'outside.svg'), '<svg/>');
  await symlink(join(root, 'outside.svg'), join(root, 'public/art/escape.svg'));
  const check = (url: string) => checkArtworkFiles(root, [{ field: 'artwork.ship.boy.portrait', url }]);
  expect(await check('../art/portrait.svg')).toEqual([]);
  expect((await check('../art/Portrait.svg')).join(';')).toContain('wrong letter case');
  expect((await check('../art/missing.svg')).join(';')).toContain('missing file');
  expect((await check('../art/empty.svg')).join(';')).toContain('nonempty file');
  expect((await check('../art/escape.svg')).join(';')).toContain('escapes public');
  expect((await check('../../outside.svg')).join(';')).toContain('unsafe path');
});
