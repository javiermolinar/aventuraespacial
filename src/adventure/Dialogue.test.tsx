// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Adventure from './Adventure';
import { defineChapter, type ChapterScript } from './chapter-script';
import { chispaScript } from './chapters/chispa';
import { earnPart, moveTo, newAdventure, placePart, saveAdventure } from './progress';
import { campaignStorageKey } from './campaign';

beforeEach(() => {
  const entries = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => entries.set(key, value) });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.stubGlobal('matchMedia', () => ({ matches: true, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('keeps the passage across questions, resets answer state, and resumes the current question', () => {
  const script: ChapterScript = structuredClone(chispaScript);
  script.intro.pages[0].questions!.push({
    id: 'radio', prompt: '¿Funciona la radio?',
    options: [{ id: 'yes', text: 'Sí.' }, { id: 'no', text: 'No.' }], answer: 'no',
  });
  const chapter = defineChapter(script);
  saveAdventure(newAdventure(chapter, 0, 'girl', 'Lucía'));
  render(<Adventure chapter={chapter} />);
  fireEvent.click(screen.getByRole('button', { name: 'En la estación Luna.' }));
  expect(screen.queryByRole('heading', { name: '¿Funciona la radio?' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  expect(screen.getByRole('heading', { name: '¿Funciona la radio?' })).toBeTruthy();
  expect(screen.getByText(/Lucía, ¿dónde estás\?/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Continuar' })).toBeNull();
  const saved = localStorage.getItem(campaignStorageKey);
  expect(JSON.parse(saved!).chapters[chapter.id].sceneId).toBe('message:question:radio');
  fireEvent.click(screen.getByRole('button', { name: 'No.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Volver atrás' }));
  expect((screen.getByRole('button', { name: 'Volver atrás' }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByRole('button', { name: 'No.' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  expect(screen.getByRole('button', { name: 'No.' }).className).toContain('is-correct');
  expect(localStorage.getItem(campaignStorageKey)).toBe(saved);
  cleanup();
  render(<Adventure chapter={chapter} />);
  expect(screen.getByRole('heading', { name: '¿Funciona la radio?' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'No.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  expect(screen.getByRole('button', { name: 'Entrar al taller' })).toBeTruthy();
});

it('can go back and forward with blocked storage without resetting the run', () => {
  const chapter = defineChapter(chispaScript);
  saveAdventure(moveTo(newAdventure(chapter, 0, 'girl', 'Lucía'), chapter, 'plan'));
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  render(<Adventure chapter={chapter} />);
  fireEvent.click(screen.getByRole('button', { name: 'Volver atrás' }));
  expect(screen.getByRole('heading', { name: 'Un mensaje para ti' })).toBe(document.activeElement);
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  expect(screen.getByRole('heading', { name: 'Mejor en compañía' })).toBe(document.activeElement);
  fireEvent.click(screen.getByRole('button', { name: 'Entrar al taller' }));
  expect(screen.getByRole('heading', { name: 'Hora de trabajar' })).toBe(document.activeElement);
});

it('uses the same question actions in illustrated robot dialogue, then advances to another page', () => {
  const script: ChapterScript = structuredClone(chispaScript);
  script.robotIntroduction.pages[0].questions = [{
    id: 'job', prompt: '¿Qué hace Chispa?',
    options: [{ id: 'repair', text: 'Repara máquinas.' }, { id: 'cook', text: 'Cocina.' }], answer: 'repair',
  }];
  script.robotIntroduction.pages.push({ id: 'tools', title: 'Mis herramientas', text: ['¡Gracias, {{name}}!'] });
  const chapter = defineChapter(script);
  let p = newAdventure(chapter, 0, 'girl', 'Lucía');
  for (const id of ['plan', 'workshop', 'build-start']) p = moveTo(p, chapter, id);
  for (let i = 0; i < 6; i++) p = placePart(earnPart(p, chapter), chapter);
  saveAdventure(p);
  const { container } = render(<Adventure chapter={chapter} />);
  expect(screen.getByRole('heading', { name: 'Chispa' })).toBe(document.activeElement);
  expect(container.querySelector('.robot-introduction-backdrop picture')).not.toBeNull();
  expect(screen.queryByRole('button', { name: 'Arreglar la radio.' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Repara máquinas.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  expect(screen.getByRole('heading', { name: 'Chispa Mis herramientas' })).toBe(document.activeElement);
  expect(screen.getByText('¡Gracias, Lucía!')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  expect(screen.getByRole('heading', { name: 'El circuito de la radio' })).toBe(document.activeElement);
});
