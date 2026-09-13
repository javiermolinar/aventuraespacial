import { useEffect, useState } from 'react';
import { chapterCatalog, playableChapter, type ChapterEntry } from './chapters/catalog';
import { chapterUnlocked, completeChapter, loadCampaign, recordChapter, saveCampaign, selectChapter } from './campaign';
import { earnPart, moveTo, newAdventure, placePart, rotatePipe, type AdventureProgress } from './progress';
import type { Chapter, Character, ReadingScene } from './types';

export type AdventureOptions = { chapter?: Chapter; catalog?: readonly ChapterEntry[]; entry?: 'home' | 'play' };

/** Owns the campaign and transient navigation, never game rendering or local answer drafts. */
export function useAdventureController({ chapter: chapterOverride, catalog: catalogOverride, entry = 'play' }: AdventureOptions) {
  const catalog = catalogOverride ?? (chapterOverride ? [playableChapter(chapterOverride)] : chapterCatalog);
  const [loaded] = useState(() => loadCampaign(catalog));
  const [campaign, setCampaign] = useState(loaded.campaign);
  const chapter = catalog.find(item => item.id === campaign.activeChapterId)!.chapter!;
  const progress = campaign.chapters[chapter.id] ?? null;
  const [view, setView] = useState<'home' | 'play'>(() => entry === 'play' && progress ? 'play' : 'home');
  const [setupChapterId, setSetupChapterId] = useState<string | null>(() => entry === 'play' && !progress ? chapter.id : null);
  const [saveFailed, setSaveFailed] = useState(loaded.unavailable);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const setupProfile = setupChapterId ? campaign.chapters[setupChapterId] ?? campaign.profile : campaign.profile;
  const readingHistory = progress?.history.filter(id => !['build', 'pipes'].includes(chapter.scenes[id].type)) ?? [];
  const reviewIndex = reviewId === null ? -1 : readingHistory.indexOf(reviewId);
  const reviewScene = reviewIndex < 0 ? null : chapter.scenes[reviewId!] as ReadingScene;
  const previousId = readingHistory[(reviewScene ? reviewIndex : readingHistory.length) - 1];
  const scene = progress ? chapter.scenes[progress.sceneId] : null;
  const displayedScene = reviewScene ?? scene;
  const introduction = view !== 'play' || !scene ? undefined : scene.type === 'build'
    ? progress?.placedCount === 6 ? chapter.robot.introduction : undefined
    : scene.robotIntroduction ? { title: scene.title, paragraphs: scene.paragraphs, artwork: scene.robotIntroduction.artwork } : undefined;
  const displayedIntroduction = reviewScene ? Boolean(reviewScene.robotIntroduction) : Boolean(introduction);
  const building = view === 'play' && !reviewScene && scene?.type === 'build' && !introduction;
  const piping = view === 'play' && !reviewScene && scene?.type === 'pipes';
  const finishedRun = Boolean(progress && scene?.type === 'ending' && campaign.completed.includes(chapter.id));

  useEffect(() => {
    // Do not overwrite a damaged save or create an empty campaign before the player starts.
    if (Object.keys(campaign.chapters).length) setSaveFailed(!saveCampaign(campaign));
  }, [campaign]);

  const updateProgress = (update: (previous: AdventureProgress) => AdventureProgress) => setCampaign(previous => {
    const saved = previous.chapters[chapter.id];
    if (previous.activeChapterId !== chapter.id || !saved) return previous;
    return recordChapter(previous, catalog, update(saved));
  });
  const prepare = (id = chapter.id) => setSetupChapterId(id);
  const chooseChapter = (id: string) => {
    const selected = catalog.find(item => item.id === id)?.chapter;
    if (!selected || !chapterUnlocked(campaign, catalog, id)) return;
    const saved = campaign.chapters[id];
    if (!saved || (campaign.completed.includes(id) && selected.scenes[saved.sceneId].type === 'ending')) prepare(id);
    else { setCampaign(previous => selectChapter(previous, catalog, id)); setView('play'); }
  };
  const start = (name: string, character: Character) => {
    const selected = catalog.find(item => item.id === setupChapterId)?.chapter;
    if (!selected || !chapterUnlocked(campaign, catalog, selected.id)) return;
    setCampaign(previous => recordChapter(previous, catalog, newAdventure(selected, setupProfile.mathsLevel, character, name)));
    setSetupChapterId(null);
    setView('play');
  };

  return {
    catalog, campaign, chapter, progress, view, scene, displayedScene, introduction, displayedIntroduction,
    building, piping, finishedRun, setupChapterId, setupProfile, saveFailed, reset: loaded.reset,
    reviewId, reviewScene, previousId,
    chooseChapter, prepare, start,
    cancelSetup: () => setSetupChapterId(null),
    home: () => { setReviewId(null); setView('home'); },
    back: () => { if (previousId) setReviewId(previousId); },
    reviewNext: () => setReviewId(readingHistory[reviewIndex + 1] ?? null),
    next: (id: string) => updateProgress(previous => moveTo(previous, chapter, id)),
    finish: () => { setCampaign(previous => completeChapter(previous, catalog, chapter.id)); setView('home'); },
    earn: () => updateProgress(previous => earnPart(previous, chapter)),
    place: () => updateProgress(previous => placePart(previous, chapter)),
    rotate: (index: number, turns: number) => updateProgress(previous => rotatePipe(previous, chapter, index, turns)),
  };
}
