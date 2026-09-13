import { defineChapter, type ChapterScript } from '../adventure/chapter-script';
import { chapterCatalog, type ChapterEntry } from '../adventure/chapters/catalog';
import type { Chapter } from '../adventure/types';

export type ChapterSource = { id: string; label: string; draft: boolean; load: () => Promise<Chapter> };
export type DraftModules = Record<string, () => Promise<{ default: ChapterScript }>>;

/** Draft discovery is only imported by development tooling, never the playable catalogue. */
export function chapterSources(catalog: readonly ChapterEntry[], drafts: DraftModules): ChapterSource[] {
  return [
    ...catalog.filter(entry => entry.chapter).map(entry => ({ id: entry.id, label: entry.robot.name, draft: false, load: async () => entry.chapter! })),
    ...Object.entries(drafts).filter(([path]) => !/\.(?:test|d)\.ts$/.test(path)).sort(([a], [b]) => a.localeCompare(b)).map(([path, load]) => {
      const id = path.split('/').at(-1)!.replace(/\.ts$/, '');
      return {
        id, label: `Borrador: ${catalog.find(entry => entry.id === id)?.robot.name ?? id}`, draft: true,
        load: async () => {
          const module = await load();
          if (!module.default) throw new Error(`${path}: export a default ChapterScript`);
          const chapter = defineChapter(module.default);
          if (chapter.id !== id) throw new Error(`${path}: filename must match chapter ID ${chapter.id}`);
          return chapter;
        },
      };
    }),
  ];
}

export function availableChapterSources() {
  // Filter test/declaration files above, not with negative globs: Vite 6 does not
  // reliably invalidate a negative glob when a draft is added to a running server.
  return chapterSources(chapterCatalog, import.meta.glob<{ default: ChapterScript }>('../adventure/drafts/*.ts'));
}
