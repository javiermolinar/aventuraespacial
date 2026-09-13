let context: AudioContext | undefined;

// Short, locally synthesized sounds: no external assets or network requests.
export function playSound(kind: 'tap' | 'exchange' | 'success' | 'place' | 'complete', enabled: boolean) {
  if (!enabled) return;
  try {
    context ??= new AudioContext();
    const audio = context;
    void audio.resume().then(() => {
      const notes = {
        tap: [440], exchange: [392, 523, 659], success: [523, 659], place: [330, 440], complete: [523, 659, 784, 1047],
      }[kind];
      notes.forEach((frequency, index) => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const start = audio.currentTime + index * 0.11;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.09, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.23);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.25);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
    }).catch(() => { /* Audio may be unavailable; the game remains fully playable. */ });
  } catch { /* Some browsers disable audio entirely. */ }
}
