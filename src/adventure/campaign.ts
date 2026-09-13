import { levels } from '../game';
import { validateCatalog, type ChapterEntry } from './chapters/catalog';
import { loadAdventure, restoreAdventure, validateProgress, type AdventureProgress } from './progress';
import { normalizePlayerName, playerNameMaxLength } from './personalization';
import type { Character } from './types';

export const campaignStorageKey = 'matefaciles:campaign:v1';
export type CampaignProfile = { character: Character; playerName: string; mathsLevel: number };
export type CampaignProgress = {
  version: 1;
  activeChapterId: string;
  profile: CampaignProfile;
  completed: string[];
  chapters: Record<string, AdventureProgress>;
};
export type ChapterStatus = 'locked' | 'upcoming' | 'available' | 'started' | 'completed';
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));

export function newCampaign(catalog: readonly ChapterEntry[]): CampaignProgress {
  validateCatalog(catalog);
  return { version: 1, activeChapterId: catalog[0].id, profile: { character: 'boy', playerName: '', mathsLevel: 0 }, completed: [], chapters: {} };
}

export function chapterUnlocked(campaign: CampaignProgress, catalog: readonly ChapterEntry[], id: string): boolean {
  const index = catalog.findIndex(entry => entry.id === id);
  return index >= 0 && (index === 0 || campaign.completed.includes(catalog[index - 1].id));
}

export function chapterStatus(campaign: CampaignProgress, catalog: readonly ChapterEntry[], id: string): ChapterStatus {
  if (!chapterUnlocked(campaign, catalog, id)) return 'locked';
  if (!catalog.find(entry => entry.id === id)?.chapter) return 'upcoming';
  if (campaign.completed.includes(id)) return 'completed';
  return Object.hasOwn(campaign.chapters, id) ? 'started' : 'available';
}

export function selectChapter(campaign: CampaignProgress, catalog: readonly ChapterEntry[], id: string): CampaignProgress {
  if (!chapterUnlocked(campaign, catalog, id) || !catalog.find(entry => entry.id === id)?.chapter || campaign.activeChapterId === id) return campaign;
  return { ...campaign, activeChapterId: id };
}

/** Recording a replay replaces only that chapter's run, never its completion or other saves. */
export function recordChapter(campaign: CampaignProgress, catalog: readonly ChapterEntry[], progress: AdventureProgress): CampaignProgress {
  const chapter = catalog.find(entry => entry.id === progress.chapterId)?.chapter;
  if (!chapter || !chapterUnlocked(campaign, catalog, chapter.id) || !validateProgress(progress, chapter)) return campaign;
  return {
    ...campaign, activeChapterId: chapter.id,
    profile: { character: progress.character, playerName: progress.playerName, mathsLevel: progress.mathsLevel },
    chapters: { ...campaign.chapters, [chapter.id]: progress },
  };
}

/** Only the dedicated final-chapter action calls this; visiting the ending or pressing Home does not. */
export function completeChapter(campaign: CampaignProgress, catalog: readonly ChapterEntry[], id: string): CampaignProgress {
  const chapter = catalog.find(entry => entry.id === id)?.chapter;
  const progress = campaign.chapters[id];
  if (!chapter || id !== campaign.activeChapterId || campaign.completed.includes(id) || !chapterUnlocked(campaign, catalog, id) ||
    !validateProgress(progress, chapter) || chapter.scenes[progress.sceneId].type !== 'ending') return campaign;
  return { ...campaign, completed: [...campaign.completed, id] };
}

/** Campaign structure and each chapter record are validated before any unlock is trusted. */
export function restoreCampaign(value: unknown, catalog: readonly ChapterEntry[]): CampaignProgress | null {
  if (!record(value) || value.version !== 1 || typeof value.activeChapterId !== 'string' || !record(value.profile) || !record(value.chapters) || !Array.isArray(value.completed)) return null;
  const profile = value.profile;
  const savedChapters = value.chapters;
  if ((profile.character !== 'boy' && profile.character !== 'girl') || typeof profile.playerName !== 'string' ||
    profile.playerName.length > playerNameMaxLength || normalizePlayerName(profile.playerName) !== profile.playerName ||
    typeof profile.mathsLevel !== 'number' || !Number.isInteger(profile.mathsLevel) || !levels[profile.mathsLevel]) return null;
  // Completions must be the playable prefix, in order. Replayed chapters may currently be at their start.
  if (value.completed.length > catalog.length || value.completed.some((id, index) => id !== catalog[index].id || !catalog[index].chapter || !Object.hasOwn(savedChapters, id))) return null;
  const campaign: CampaignProgress = {
    version: 1, activeChapterId: value.activeChapterId,
    profile: { character: profile.character, playerName: profile.playerName, mathsLevel: profile.mathsLevel },
    completed: [...value.completed], chapters: {},
  };
  if (!catalog.find(entry => entry.id === campaign.activeChapterId)?.chapter || !chapterUnlocked(campaign, catalog, campaign.activeChapterId)) return null;
  for (const [id, saved] of Object.entries(savedChapters)) {
    const chapter = catalog.find(entry => entry.id === id)?.chapter;
    if (!chapter || !chapterUnlocked(campaign, catalog, id)) return null;
    const progress = restoreAdventure(saved, chapter);
    if (!progress) return null;
    campaign.chapters[id] = progress;
  }
  return campaign;
}

export type LoadedCampaign = { campaign: CampaignProgress; unavailable: boolean; reset: boolean };
export function loadCampaign(catalog: readonly ChapterEntry[]): LoadedCampaign {
  const fresh = newCampaign(catalog);
  let raw: string | null;
  try { raw = localStorage.getItem(campaignStorageKey); }
  catch { return { campaign: fresh, unavailable: true, reset: false }; }
  if (raw !== null) {
    try {
      const restored = restoreCampaign(JSON.parse(raw), catalog);
      return { campaign: restored ?? fresh, unavailable: false, reset: !restored };
    } catch { return { campaign: fresh, unavailable: false, reset: true }; }
  }
  // The old key represented only the first chapter. Preserve it as a read-only migration source.
  const legacy = loadAdventure(catalog[0].chapter!);
  return { campaign: legacy.progress ? recordChapter(fresh, catalog, legacy.progress) : fresh, unavailable: legacy.unavailable, reset: legacy.reset };
}

export function saveCampaign(campaign: CampaignProgress): boolean {
  try { localStorage.setItem(campaignStorageKey, JSON.stringify(campaign)); return true; }
  catch { return false; }
}
