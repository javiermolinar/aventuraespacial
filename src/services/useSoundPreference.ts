import { useState } from 'react';
import { loadProgress, saveProgress } from '../game';
import { playSound } from '../sound';

/** Sound shares the existing practice preferences store, not the campaign save. */
export function useSoundPreference() {
  const [preferences, setPreferences] = useState(loadProgress);
  const [saveFailed, setSaveFailed] = useState(false);
  const toggle = () => {
    const next = { ...loadProgress(), sound: !preferences.sound };
    setPreferences(next);
    setSaveFailed(!saveProgress(next));
    playSound('tap', next.sound);
  };
  return { enabled: preferences.sound, saveFailed, toggle };
}
