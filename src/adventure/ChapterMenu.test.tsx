// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Adventure from './Adventure';
import { ChapterMenu } from './ChapterMenu';
import { chapterCatalog, playableChapter } from './chapters/catalog';
import { chispaChapter as chapter } from './chapters/chispa';
import { campaignStorageKey, completeChapter, newCampaign, recordChapter, saveCampaign } from './campaign';
import { earnPart, moveTo, newAdventure, placePart, saveAdventure } from './progress';
import { destinations } from './types';

beforeEach(() => {
  const entries = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => entries.set(key, value) });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-motion'), addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function ending() {
  let p = newAdventure(chapter, 0, 'girl', 'Lucía');
  while (chapter.scenes[p.sceneId].type !== 'ending') {
    const scene = chapter.scenes[p.sceneId];
    if (scene.type === 'build') while (p.placedCount < 6) p = placePart(earnPart(p, chapter), chapter);
    else p = moveTo(p, chapter, destinations(scene)[0]);
  }
  return p;
}

it('shows seven cards but no locked robot names, titles or illustrations, including accessible labels', () => {
  const onSelect = vi.fn();
  const { container } = render(<ChapterMenu catalog={chapterCatalog} campaign={newCampaign(chapterCatalog)} onSelect={onSelect} />);
  expect(screen.getAllByRole('button')).toHaveLength(7);
  for (const entry of chapterCatalog.slice(1)) expect(container.innerHTML).not.toContain(entry.robot.name);
  const locked = screen.getByRole('button', { name: 'Capítulo 2. Bloqueado. Completa el capítulo 1.' });
  expect((locked as HTMLButtonElement).disabled).toBe(true);
  expect(locked.querySelector('.chapter-robot')).toBeNull();
  fireEvent.click(locked);
  expect(onSelect).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /Capítulo 1\. Chispa/ }));
  expect(onSelect).toHaveBeenCalledWith(chapter.id);
});

it('reveals only Brote after explicit completion, and keeps its unwritten chapter disabled', () => {
  let campaign = recordChapter(newCampaign(chapterCatalog), chapterCatalog, ending());
  campaign = completeChapter(campaign, chapterCatalog, chapter.id);
  const { container } = render(<ChapterMenu catalog={chapterCatalog} campaign={campaign} onSelect={vi.fn()} />);
  expect((screen.getByRole('button', { name: 'Capítulo 2. Brote. Próximamente.' }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText('Completado')).toBeTruthy();
  for (const entry of chapterCatalog.slice(2)) expect(container.innerHTML).not.toContain(entry.robot.name);
});

it('does not complete a chapter through Home; finishing and replaying preserve the unlock after reload', () => {
  saveAdventure(ending());
  render(<Adventure />);
  fireEvent.click(screen.getByRole('button', { name: 'Volver al inicio' }));
  expect(screen.queryByText('Brote')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Continuar aventura' }));
  fireEvent.click(screen.getByRole('button', { name: 'Terminar capítulo' }));
  expect(screen.getByText('Brote')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Repetir capítulo' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.getByText('Brote')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Repetir capítulo' }));
  fireEvent.click(screen.getByRole('button', { name: 'Comenzar de nuevo' }));
  const saved = JSON.parse(localStorage.getItem(campaignStorageKey)!);
  expect(saved.completed).toEqual([chapter.id]);
  expect(saved.chapters[chapter.id]).toMatchObject({ sceneId: 'message', placedCount: 0, character: 'girl', playerName: 'Lucía' });
  cleanup();
  render(<Adventure entry="home" />);
  expect(screen.getByText('Brote')).toBeTruthy();
});

it('selects another released chapter without discarding the first chapter replay or its pending reward', () => {
  const second = { ...chapter, id: 'brote', title: 'El jardín de Brote', robot: chapterCatalog[1].robot };
  const catalog = [playableChapter(chapter), playableChapter(second), chapterCatalog[2]];
  let campaign = recordChapter(newCampaign(catalog), catalog, ending());
  campaign = completeChapter(campaign, catalog, chapter.id);
  let replay = newAdventure(chapter, 3, 'girl', 'Lucía');
  for (const id of ['plan', 'workshop', 'build-start']) replay = moveTo(replay, chapter, id);
  replay = earnPart(replay, chapter);
  campaign = recordChapter(campaign, catalog, replay);
  saveCampaign(campaign);
  render(<Adventure catalog={catalog} entry="home" />);
  fireEvent.click(screen.getByRole('button', { name: /Capítulo 2\. Brote/ }));
  expect(screen.getByRole('button', { name: 'Cambiar nombre: Lucía' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Comenzar' }));
  let saved = JSON.parse(localStorage.getItem(campaignStorageKey)!);
  expect(saved.chapters[chapter.id]).toEqual(replay);
  expect(saved.chapters.brote).toMatchObject({ chapterId: 'brote', sceneId: 'message', character: 'girl', playerName: 'Lucía', mathsLevel: 3 });
  fireEvent.click(screen.getByRole('button', { name: 'Volver al inicio' }));
  fireEvent.click(within(screen.getByRole('region', { name: 'Elige un capítulo' })).getByRole('button', { name: /Capítulo 1\. Chispa/ }));
  expect(screen.getByRole('button', { name: 'Arrastrar la cabeza' })).toBeTruthy();
  saved = JSON.parse(localStorage.getItem(campaignStorageKey)!);
  expect(saved.activeChapterId).toBe(chapter.id);
  expect(saved.chapters.brote.sceneId).toBe('message');
});
