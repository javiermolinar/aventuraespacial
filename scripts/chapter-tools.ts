import { relative } from 'node:path';
import { chapterCatalog } from '../src/adventure/chapters/catalog';
import { availableChapterSources } from '../src/authoring/sources';
import { checkCatalog, checkChapter } from '../src/authoring/validation';
import { checkArtworkFiles, createDraft } from './chapter-files';

export async function run(command: string, args: string[], root: string): Promise<number> {
  if (command === 'new' && args.length === 1 && !args[0].startsWith('-')) {
    const path = await createDraft(root, args[0], chapterCatalog);
    console.log(`Created ${relative(root, path)} (unpublished).`);
    console.log(`Preview: npm run dev, then /?chapter-preview=${args[0]}`);
    console.log('Replace TODO text/artwork, run npm run chapter:check, and register explicitly when ready.');
    return 0;
  }
  if (command !== 'check' || args.length) {
    console.error('Usage: npm run chapter:check | npm run chapter:new -- <catalogue-id>');
    return 1;
  }
  const catalogueErrors = checkCatalog(chapterCatalog);
  for (const error of catalogueErrors) console.error(`ERROR catalogue: ${error}`);
  let errors = catalogueErrors.length;
  const sources = availableChapterSources();
  for (const source of sources) {
    const label = `${source.draft ? 'draft' : 'published'} ${source.id}`;
    try {
      const chapter = await source.load();
      const report = checkChapter(chapter, chapterCatalog, source.draft);
      report.errors.push(...await checkArtworkFiles(root, report.artwork));
      for (const warning of report.warnings) console.warn(`WARN ${label}: ${warning}`);
      for (const error of report.errors) console.error(`ERROR ${label}: ${error}`);
      errors += report.errors.length;
      if (!report.errors.length) console.log(`OK ${label}: ${Object.keys(chapter.scenes).length} scenes, ${new Set(report.artwork.map(item => item.url)).size} artwork files`);
    } catch (error) { errors++; console.error(`ERROR ${label}: ${(error as Error).message}`); }
  }
  console.log(`Checked ${sources.length} chapters (${sources.filter(source => source.draft).length} drafts); ${errors} errors.`);
  console.log('Content quality and save compatibility still require review; no files or versions were changed.');
  return errors ? 1 : 0;
}
