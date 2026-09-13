// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BackgroundMusic } from './BackgroundMusic';

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('requires interaction, stays quiet and loops, and pauses when disabled', () => {
  const { rerender } = render(<BackgroundMusic enabled={false} src="./music/wallpaper.mp3" />);
  const audio = screen.getByTestId('background-music') as HTMLAudioElement;
  expect(audio.volume).toBe(0.12);
  expect(audio.loop).toBe(true);
  expect(audio.preload).toBe('none');
  fireEvent.pointerDown(document);
  expect(audio.play).not.toHaveBeenCalled();
  rerender(<BackgroundMusic enabled src="./music/wallpaper.mp3" />);
  expect(audio.play).toHaveBeenCalledOnce();
  rerender(<BackgroundMusic enabled={false} src="./music/wallpaper.mp3" />);
  expect(audio.pause).toHaveBeenCalled();
});

it('starts a changed track without a second gesture, but does not restart unchanged tracks', () => {
  const { rerender, unmount } = render(<BackgroundMusic enabled src="./music/wallpaper.mp3" />);
  const audio = screen.getByTestId('background-music') as HTMLAudioElement;
  expect(audio.play).not.toHaveBeenCalled();
  fireEvent.keyDown(document, { key: 'Tab' });
  expect(audio.play).toHaveBeenCalledOnce();
  rerender(<BackgroundMusic enabled src="./music/dream-culture.mp3" />);
  expect(audio.getAttribute('src')).toBe('./music/dream-culture.mp3');
  expect(audio.play).toHaveBeenCalledTimes(2);
  rerender(<BackgroundMusic enabled src="./music/dream-culture.mp3" />);
  expect(audio.play).toHaveBeenCalledTimes(2);
  unmount();
  fireEvent.pointerDown(document);
  expect(audio.play).toHaveBeenCalledTimes(2);
});

it('pauses in hidden tabs and resumes the current track when visible', () => {
  const hidden = vi.spyOn(document, 'hidden', 'get');
  const { rerender } = render(<BackgroundMusic enabled src="./music/wallpaper.mp3" />);
  fireEvent.pointerDown(document);
  const play = vi.mocked(HTMLMediaElement.prototype.play);
  play.mockClear();
  hidden.mockReturnValue(true);
  fireEvent(document, new Event('visibilitychange'));
  rerender(<BackgroundMusic enabled src="./music/cipher.mp3" />);
  expect(play).not.toHaveBeenCalled();
  hidden.mockReturnValue(false);
  fireEvent(document, new Event('visibilitychange'));
  expect(play).toHaveBeenCalledOnce();
});

it('handles rejected playback and retries after another interaction', async () => {
  const play = vi.mocked(HTMLMediaElement.prototype.play);
  play.mockRejectedValueOnce(new Error('Autoplay blocked'));
  render(<BackgroundMusic enabled />);
  fireEvent.pointerDown(document);
  await Promise.resolve();
  fireEvent.keyDown(document, { key: 'Tab' });
  expect(play).toHaveBeenCalledTimes(2);
});
