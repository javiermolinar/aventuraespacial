// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { chapterCatalog } from '../adventure/chapters/catalog';
import { chispaChapter } from '../adventure/chapters/chispa';
import { campaignStorageKey, newCampaign, recordChapter } from '../adventure/campaign';
import { adventureStorageKey, newAdventure } from '../adventure/progress';
import { preloadHomeArtwork } from './home-artwork';

let entries: Map<string, string>;
let writes: ReturnType<typeof vi.fn>;
beforeEach(() => {
  entries = new Map();
  writes = vi.fn();
  vi.stubGlobal('localStorage', { getItem: (key: string) => entries.get(key) ?? null, setItem: writes });
});
afterEach(() => {
  document.querySelectorAll('link[id^="home-artwork-"]').forEach(link => link.remove());
  vi.unstubAllGlobals();
});

function expectHints(character: 'boy' | 'girl') {
  const links = [...document.querySelectorAll<HTMLLinkElement>('link[id^="home-artwork-"]')];
  expect(links).toHaveLength(2);
  for (const orientation of ['portrait', 'landscape'] as const) {
    const link = document.getElementById(`home-artwork-${orientation}`) as HTMLLinkElement;
    expect(link.rel).toBe('preload');
    expect(link.as).toBe('image');
    expect(link.media).toBe(`(orientation: ${orientation})`);
    expect(link.getAttribute('href')).toBe(chispaChapter.artwork.ship[character][orientation].replace('../', './'));
  }
  expect(writes).not.toHaveBeenCalled();
}

it('preloads responsive default artwork without creating a save or duplicate hints', () => {
  preloadHomeArtwork(chapterCatalog);
  preloadHomeArtwork(chapterCatalog);
  expectHints('boy');
});

it('uses the active chapter character, not a different campaign profile', () => {
  const campaign = recordChapter(newCampaign(chapterCatalog), chapterCatalog, newAdventure(chispaChapter, 0, 'girl', 'Ada'));
  campaign.profile.character = 'boy';
  entries.set(campaignStorageKey, JSON.stringify(campaign));
  preloadHomeArtwork(chapterCatalog);
  expectHints('girl');
});

it('honours legacy saves through the existing validation and migration path', () => {
  entries.set(adventureStorageKey, JSON.stringify(newAdventure(chispaChapter, 0, 'girl', 'Ada')));
  preloadHomeArtwork(chapterCatalog);
  expectHints('girl');
});

it('does not trust a corrupt campaign or fall back to its stale legacy character', () => {
  entries.set(campaignStorageKey, '{broken');
  entries.set(adventureStorageKey, JSON.stringify(newAdventure(chispaChapter, 0, 'girl', 'Ada')));
  preloadHomeArtwork(chapterCatalog);
  expectHints('boy');
});

it('uses default artwork when storage cannot be read', () => {
  vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: writes });
  preloadHomeArtwork(chapterCatalog);
  expectHints('boy');
});
