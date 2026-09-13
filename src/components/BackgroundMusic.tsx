import { useEffect, useRef } from 'react';

/** Music starts only after interaction, pauses in hidden tabs, and shares the sound toggle. */
export function BackgroundMusic({ enabled, src = '../music/carefree.mp3' }: { enabled: boolean; src?: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const interacted = useRef(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.12;
    const sync = () => {
      if (!enabled || document.hidden) { audio.pause(); return; }
      if (interacted.current) void audio.play().catch(() => { /* Retry on the next gesture if the browser blocks playback. */ });
    };
    const onInteraction = () => { interacted.current = true; sync(); };
    document.addEventListener('pointerdown', onInteraction);
    document.addEventListener('keydown', onInteraction);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => {
      document.removeEventListener('pointerdown', onInteraction);
      document.removeEventListener('keydown', onInteraction);
      document.removeEventListener('visibilitychange', sync);
      audio.pause();
    };
  }, [enabled, src]);

  return <audio ref={audioRef} src={src} loop preload="none" data-testid="background-music" />;
}
