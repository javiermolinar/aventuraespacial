import { loadCampaign } from '../adventure/campaign';
import type { ChapterEntry } from '../adventure/chapters/catalog';

/** Resolve the same validated save and establishing shot as the homepage, without React. */
export function preloadHomeArtwork(catalog: readonly ChapterEntry[]) {
  const { campaign } = loadCampaign(catalog);
  const chapter = catalog.find(entry => entry.id === campaign.activeChapterId)!.chapter!;
  const character = campaign.chapters[chapter.id]?.character ?? campaign.profile.character;
  const artwork = chapter.artwork.ship[character];
  for (const orientation of ['portrait', 'landscape'] as const) {
    const id = `home-artwork-${orientation}`;
    if (document.getElementById(id)) continue;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'preload';
    link.as = 'image';
    link.media = `(orientation: ${orientation})`;
    link.fetchPriority = 'high';
    // Authored paths are relative to games/adventure.html; this entry is at the site root.
    link.href = artwork[orientation].replace('../', './');
    document.head.append(link);
  }
}
