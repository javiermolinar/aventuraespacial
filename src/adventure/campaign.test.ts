import { afterEach, describe, expect, it, vi } from 'vitest';
import { chapterCatalog, playableChapter, validateCatalog } from './chapters/catalog';
import { chispaChapter as chapter } from './chapters/chispa';
import { broteChapter as second } from './chapters/brote';
import { chispaV5Chapter } from './chapters/chispa-migration';
import { campaignStorageKey, chapterStatus, completeChapter, loadCampaign, newCampaign, recordChapter, restoreCampaign, saveCampaign, selectChapter } from './campaign';
import { adventureStorageKey, earnPart, moveTo, newAdventure, placePart, rotatePipe } from './progress';
import { destinations, type Chapter } from './types';

const released = [playableChapter(chapter), playableChapter(second), chapterCatalog[2]];
function storage() {
  const entries = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => entries.set(key, value) });
  return entries;
}
function toScene(chapter: Chapter, target: string) {
  let p = newAdventure(chapter, 3, 'girl', 'Lucía');
  while (p.sceneId !== target) {
    const scene = chapter.scenes[p.sceneId];
    if (scene.type === 'build' && p.placedCount < 6) {
      while (p.placedCount < 6) p = placePart(earnPart(p, chapter), chapter);
    } else p = moveTo(p, chapter, destinations(scene)[0]);
  }
  return p;
}
afterEach(() => vi.unstubAllGlobals());

it('starts with only Chispa available and rejects invalid catalogues', () => {
  const campaign = newCampaign(chapterCatalog);
  expect(chapterCatalog.map(entry => chapterStatus(campaign, chapterCatalog, entry.id))).toEqual(['available', ...Array(6).fill('locked')]);
  expect(() => validateCatalog([])).toThrow();
  expect(() => validateCatalog([chapterCatalog[2]])).toThrow();
  expect(() => validateCatalog([chapterCatalog[0], chapterCatalog[0]])).toThrow();
  expect(selectChapter(campaign, chapterCatalog, 'brote')).toBe(campaign);
  expect(selectChapter(campaign, chapterCatalog, 'missing')).toBe(campaign);
});

it('only explicit ending completion reveals the next card, without making unwritten content playable', () => {
  const fresh = newCampaign(chapterCatalog);
  const build = recordChapter(fresh, chapterCatalog, toScene(chapter, 'build-start'));
  expect(completeChapter(build, chapterCatalog, chapter.id)).toBe(build);
  const atEnding = recordChapter(build, chapterCatalog, toScene(chapter, 'ending'));
  expect(chapterStatus(atEnding, chapterCatalog, 'brote')).toBe('locked');
  const finished = completeChapter(atEnding, chapterCatalog, chapter.id);
  expect(chapterStatus(finished, chapterCatalog, chapter.id)).toBe('completed');
  expect(chapterStatus(finished, chapterCatalog, 'brote')).toBe('available');
  const upcoming = [chapterCatalog[0], { id: second.id, robot: second.robot }, chapterCatalog[2]];
  expect(chapterStatus(finished, upcoming, 'brote')).toBe('upcoming');
  expect(selectChapter(finished, upcoming, 'brote')).toBe(finished);
  expect(chapterStatus(finished, chapterCatalog, 'rayo')).toBe('locked');
  expect(selectChapter(finished, chapterCatalog, 'brote').activeChapterId).toBe('brote');
  expect(completeChapter(finished, chapterCatalog, chapter.id)).toBe(finished);
  expect(chapterStatus(finished, released, 'brote')).toBe('available');
});

it('preserves independent chapter saves and unlocks during replay, selection and reload', () => {
  storage();
  let campaign = recordChapter(newCampaign(released), released, toScene(chapter, 'ending'));
  campaign = completeChapter(campaign, released, chapter.id);
  const secondReady = earnPart(toScene(second, 'build-start'), second);
  campaign = recordChapter(campaign, released, secondReady);
  const replay = newAdventure(chapter, 5, 'boy', 'Antonio');
  campaign = recordChapter(campaign, released, replay);
  expect(campaign.completed).toEqual([chapter.id]);
  expect(campaign.chapters.brote).toEqual(secondReady);
  expect(campaign.profile).toEqual({ mathsLevel: 5, character: 'boy', playerName: 'Antonio' });
  campaign = selectChapter(campaign, released, 'brote');
  expect(campaign.chapters[chapter.id]).toEqual(replay);
  expect(saveCampaign(campaign)).toBe(true);
  expect(loadCampaign(released)).toEqual({ campaign, unavailable: false, reset: false });
  campaign = recordChapter(campaign, released, toScene(second, 'ending'));
  campaign = completeChapter(campaign, released, 'brote');
  expect(campaign.completed).toEqual([chapter.id, 'brote']);
  expect(chapterStatus(campaign, released, 'rayo')).toBe('upcoming');
});

it('rejects writes to locked chapters and invalid progress, without touching another run', () => {
  const campaign = newCampaign(released);
  expect(recordChapter(campaign, released, newAdventure(second, 0))).toBe(campaign);
  expect(recordChapter(campaign, released, { ...newAdventure(chapter, 0), placedCount: 9 })).toBe(campaign);
  expect(completeChapter(campaign, released, 'brote')).toBe(campaign);
});

describe('migration and validation', () => {
  it('imports a legacy save with its pending piece, profile and operands, without touching practice or the old record', () => {
    const entries = storage();
    const oldChapter = chispaV5Chapter();
    const old = earnPart(toScene(oldChapter, 'build-start'), oldChapter);
    entries.set(adventureStorageKey, JSON.stringify(old));
    entries.set('little-robot-lab:v1', '{"completed":{"1":4},"sound":true}');
    const loaded = loadCampaign(chapterCatalog);
    expect(loaded.reset).toBe(false);
    expect(loaded.campaign.chapters[chapter.id]).toEqual({ ...old, chapterVersion: 6 });
    expect(loaded.campaign.completed).toEqual([]);
    expect(saveCampaign(loaded.campaign)).toBe(true);
    expect(entries.get(adventureStorageKey)).toBe(JSON.stringify(old));
    expect(entries.get('little-robot-lab:v1')).toBe('{"completed":{"1":4},"sound":true}');
    // Once a campaign exists, the stale single-chapter key must never overwrite it.
    entries.set(adventureStorageKey, JSON.stringify(newAdventure(chapter, 0)));
    expect(loadCampaign(chapterCatalog).campaign).toEqual(loaded.campaign);
  });

  it('preserves legacy cable rotations and does not infer completion from an ending save', () => {
    const entries = storage();
    const pipes = rotatePipe(toScene(chapter, 'radio-cables'), chapter, 1);
    entries.set(adventureStorageKey, JSON.stringify(pipes));
    expect(loadCampaign(chapterCatalog).campaign.chapters[chapter.id]).toEqual(pipes);
    entries.set(adventureStorageKey, JSON.stringify(toScene(chapter, 'ending')));
    expect(loadCampaign(chapterCatalog).campaign.completed).toEqual([]);
  });

  it('also migrates old chapter versions inside a campaign record', () => {
    const oldChapter = chispaV5Chapter();
    const campaign = newCampaign(chapterCatalog);
    const old = toScene(oldChapter, 'tool');
    campaign.chapters[chapter.id] = old;
    const restored = restoreCampaign(campaign, chapterCatalog)!;
    expect(restored.chapters[chapter.id]).toMatchObject({ chapterVersion: 6, sceneId: 'radio-cables', placedCount: 6 });
    expect(restored.chapters[chapter.id].history).not.toContain('tool');
  });

  it('rejects damaged campaigns, impossible unlocks, inaccessible active chapters and broken saves', () => {
    const valid = recordChapter(newCampaign(chapterCatalog), chapterCatalog, newAdventure(chapter, 0));
    const invalid = [
      null, [], {}, { ...valid, version: 99 }, { ...valid, activeChapterId: 'brote' }, { ...valid, activeChapterId: '__proto__' },
      { ...valid, chapters: [] }, { ...valid, completed: [chapter.id, chapter.id] }, { ...valid, completed: ['brote'] },
      { ...valid, completed: [chapter.id, 'brote'] }, { ...valid, completed: [chapter.id], chapters: {} },
      { ...valid, chapters: { brote: newAdventure(second, 0) } },
      { ...valid, chapters: { [chapter.id]: { ...valid.chapters[chapter.id], history: ['missing'] } } },
      { ...valid, profile: { ...valid.profile, playerName: ' Ana ' } }, { ...valid, profile: { ...valid.profile, playerName: null } },
      { ...valid, profile: { ...valid.profile, mathsLevel: -1 } }, { ...valid, profile: { ...valid.profile, character: 'unknown' } },
    ];
    for (const value of invalid) expect(restoreCampaign(value, chapterCatalog)).toBeNull();
  });

  it('distinguishes corrupt storage from unavailable storage, with no fallback to a stale legacy save', () => {
    const entries = storage();
    entries.set(adventureStorageKey, JSON.stringify(newAdventure(chapter, 0)));
    entries.set(campaignStorageKey, '{bad');
    expect(loadCampaign(chapterCatalog)).toMatchObject({ reset: true, unavailable: false, campaign: { chapters: {} } });
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } });
    expect(loadCampaign(chapterCatalog)).toMatchObject({ reset: false, unavailable: true });
    let campaign = newCampaign(chapterCatalog);
    campaign = recordChapter(campaign, chapterCatalog, toScene(chapter, 'ending'));
    campaign = completeChapter(campaign, chapterCatalog, chapter.id);
    expect(saveCampaign(campaign)).toBe(false);
    expect(chapterStatus(campaign, chapterCatalog, 'brote')).toBe('available');
  });
});
