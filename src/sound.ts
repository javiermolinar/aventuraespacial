let context: AudioContext | undefined;

// Short, locally synthesized sounds: no external assets or network requests.
export function playSound(kind: 'tap' | 'exchange' | 'success' | 'place' | 'complete' | 'scan' | 'rat' | 'laser', enabled: boolean, delay = 0) {
  if (!enabled) return;
  try {
    context ??= new AudioContext();
    const audio = context;
    void audio.resume().then(() => {
      const notes = {
        tap: [440], exchange: [392, 523, 659], success: [523, 659], place: [330, 440], complete: [523, 659, 784, 1047],
        scan: [740, 1047], rat: [659, 440, 554], laser: [980],
      }[kind];
      notes.forEach((frequency, index) => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const start = audio.currentTime + delay + index * 0.11;
        oscillator.type = kind === 'laser' || kind === 'rat' ? 'triangle' : 'sine';
        oscillator.frequency.setValueAtTime(frequency, start);
        if (kind === 'laser') oscillator.frequency.exponentialRampToValueAtTime(120, start + 0.21);
        if (kind === 'rat') oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.2, start + 0.16);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(kind === 'scan' ? 0.045 : kind === 'laser' || kind === 'rat' ? 0.075 : 0.09, start + 0.015);
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
