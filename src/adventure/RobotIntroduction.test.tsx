// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RobotIntroduction } from './RobotIntroduction';
import { chispaChapter, chispaScript } from './chapters/chispa';

const robot = chispaChapter.robot;
const page = chispaScript.robotIntroduction.pages[0];
const introduction = { title: page.title, paragraphs: page.text };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function show(artwork?: { landscape: string; portrait: string }, assetPrefix: './' | '../' = './') {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const onNext = vi.fn();
  const view = render(<RobotIntroduction robot={robot} introduction={{ ...introduction, artwork }} playerName="Lucía" assetPrefix={assetPrefix} onNext={onNext} />);
  return { ...view, onNext };
}

it('introduces Chispa with the existing robot, personalised passage and explicit continuation', () => {
  const { onNext, container } = show();
  expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Chispa' }));
  expect(screen.getByText(/¡Hola, Lucía!/)).toBeTruthy();
  expect(screen.getByText(/caja de herramientas/)).toBeTruthy();
  expect(screen.getByRole('img', { name: 'Robot terminado' })).toBeTruthy();
  expect(container.querySelector('picture')).toBeNull();
  expect(onNext).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Seguir la historia' }));
  expect(onNext).toHaveBeenCalledOnce();
});

it.each(['./', '../'] as const)('supports separate portrait and landscape artwork under the %s entry', assetPrefix => {
  const { container } = show({ landscape: '../adventure/chispa-landscape.webp', portrait: '../adventure/chispa-portrait.webp' }, assetPrefix);
  expect(container.querySelector('source')?.getAttribute('media')).toBe('(orientation: portrait)');
  expect(container.querySelector('source')?.getAttribute('srcset')).toBe(`${assetPrefix}adventure/chispa-portrait.webp`);
  expect(container.querySelector('img')?.getAttribute('src')).toBe(`${assetPrefix}adventure/chispa-landscape.webp`);
  expect(screen.queryByRole('img', { name: 'Robot terminado' })).toBeNull();
});

it('falls back to the existing robot after image failure without blocking the story', () => {
  const { container, onNext } = show({ landscape: '../missing.webp', portrait: '../missing-mobile.webp' });
  fireEvent.error(container.querySelector('img')!);
  expect(screen.getByRole('status').textContent).toContain('Puedes seguir leyendo');
  expect(screen.getByRole('img', { name: 'Robot terminado' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Seguir la historia' }));
  expect(onNext).toHaveBeenCalledOnce();
});
