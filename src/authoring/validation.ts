import { validateCatalog, type ChapterEntry } from '../adventure/chapters/catalog';
import { validateChapter, type Chapter, type ResponsiveArtwork } from '../adventure/types';

export type ArtworkReference = { field: string; url: string };
export type ChapterReport = { errors: string[]; warnings: string[]; artwork: ArtworkReference[] };
const chapterId = /^[a-z0-9][a-z0-9-]*$/;

export function checkCatalog(catalog: readonly ChapterEntry[]): string[] {
  const errors: string[] = [];
  try { validateCatalog(catalog); } catch (error) { errors.push((error as Error).message); }
  let upcoming = false;
  for (const entry of catalog) {
    if (!entry.chapter) upcoming = true;
    else if (upcoming) errors.push(`${entry.id}: playable chapters must form a prefix; an earlier chapter is still upcoming`);
    if (!entry.robot.name.trim()) errors.push(`${entry.id}: missing robot name`);
  }
  return errors;
}

/** Browser-safe authoring checks; the CLI additionally checks files on disk. */
export function checkChapter(chapter: Chapter, catalog: readonly ChapterEntry[], draft = false): ChapterReport {
  const errors = validateChapter(chapter);
  const warnings: string[] = [];
  const artwork: ArtworkReference[] = [];
  const entry = catalog.find(entry => entry.id === chapter.id);
  if (!chapterId.test(chapter.id)) errors.push('Chapter ID must be a lowercase slug');
  if (!Number.isSafeInteger(chapter.version) || chapter.version < 1) errors.push('Chapter version must be a positive integer');
  if (!entry) errors.push(`${chapter.id}: no matching catalogue entry`);
  else {
    if (draft && entry.chapter) errors.push(`${chapter.id}: already published; remove or move the draft instead of shadowing it`);
    for (const key of ['name', 'design', 'color'] as const) {
      if (chapter.robot[key] !== entry.robot[key]) errors.push(`robot.${key}: does not match catalogue entry ${chapter.id}`);
    }
  }
  const text = (field: string, value: string) => {
    if (!value.trim()) errors.push(`${field}: text cannot be empty`);
    if (/\bTODO\b/.test(value)) (draft ? warnings : errors).push(`${field}: replace TODO text before publication`);
  };
  text('title', chapter.title);
  text('subtitle', chapter.subtitle);
  text('summary.title', chapter.intro.title);
  text('summary.description', chapter.intro.description);
  const pair = (field: string, value: ResponsiveArtwork) => {
    for (const orientation of ['landscape', 'portrait'] as const) {
      const url = value?.[orientation];
      if (typeof url !== 'string' || !/^\.\.\/(?:[a-z0-9][a-z0-9._-]*\/)*[a-z0-9][a-z0-9._-]*\.(?:webp|png|jpe?g|svg|avif)$/i.test(url)) {
        errors.push(`${field}.${orientation}: use a local ../ path to an image in public/, without traversal, query strings or fragments`);
      } else artwork.push({ field: `${field}.${orientation}`, url });
    }
  };
  if (!chapter.artwork.ship) errors.push('artwork.ship: required for both characters');
  for (const [location, characters] of Object.entries(chapter.artwork)) {
    if (!['ship', 'workshop', 'radio', 'journey', 'storage'].includes(location)) errors.push(`Unknown artwork location: ${location}`);
    for (const character of ['boy', 'girl'] as const) pair(`artwork.${location}.${character}`, characters[character]);
  }
  if (chapter.robot.introduction) {
    const introduction = chapter.robot.introduction;
    text('robot.introduction.title', introduction.title);
    introduction.paragraphs.forEach((paragraph, index) => text(`robot.introduction.paragraphs.${index}`, paragraph));
    if (introduction.artwork) pair('robot.introduction.artwork', introduction.artwork);
  }
  for (const [id, scene] of Object.entries(chapter.scenes)) {
    text(`${id}.title`, scene.title);
    if (scene.type === 'build') {
      text(`${id}.instruction`, scene.instruction);
      text(`${id}.completion`, scene.completion);
      continue;
    }
    if (!['ship', 'workshop', 'radio', 'journey', 'storage'].includes(scene.image)) errors.push(`${id}: unknown image ${scene.image}`);
    scene.paragraphs.forEach((paragraph, index) => text(`${id}.paragraphs.${index}`, paragraph));
    if (scene.robotIntroduction?.artwork) pair(`${id}.artwork`, scene.robotIntroduction.artwork);
    if (scene.type === 'story') scene.choices.forEach(choice => text(`${id}.choices.${choice.id}`, choice.label));
    if (scene.type === 'comprehension') {
      text(`${id}.question`, scene.question);
      scene.options.forEach(option => text(`${id}.options.${option.id}`, option.label));
    }
    if (scene.type === 'sequence') {
      text(`${id}.question`, scene.question);
      scene.events.forEach(event => text(`${id}.events.${event.id}`, event.text));
    }
    if (scene.type === 'ending' && scene.prompt !== undefined) text(`${id}.prompt`, scene.prompt);
  }
  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)], artwork };
}
