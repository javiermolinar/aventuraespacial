import { useEffect, useRef, useState } from 'react';
import { defaultOptions, type GenerationResult } from './generator';
import type { Puzzle } from './rules';

/** After the teaching boards, completion offers another certified map.
 * Restarting or choosing a lesson cancels pending work. */
export function usePuzzleGenerator(onPuzzle: (puzzle: Puzzle) => void, revision: number) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const worker = useRef<Worker | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function stop() { worker.current?.terminate(); worker.current = null; if (timer.current) clearTimeout(timer.current); timer.current = null; }
  useEffect(() => { stop(); setBusy(false); setError(''); return stop; }, [revision]);
  function generate() {
    stop(); setBusy(true); setError('');
    try {
      const active = new Worker(new URL('./generator.worker.ts', import.meta.url), { type: 'module' });
      worker.current = active;
      const fail = (reason: string) => { if (worker.current !== active) return; stop(); setBusy(false); setError(reason); };
      active.onmessage = (event: MessageEvent<GenerationResult>) => {
        if (worker.current !== active) return;
        if (event.data.status === 'generated') { stop(); setBusy(false); onPuzzle(event.data.puzzle); }
        else fail('No se ha podido preparar el siguiente reto. Vuelve a intentarlo.');
      };
      active.onerror = () => fail('No se ha podido preparar el siguiente reto. Vuelve a intentarlo.');
      timer.current = setTimeout(() => fail('El siguiente reto está tardando demasiado. Vuelve a intentarlo.'), 15000);
      active.postMessage({ ...defaultOptions, seed: crypto.getRandomValues(new Uint32Array(1))[0].toString(36) });
    } catch { stop(); setBusy(false); setError('No se ha podido preparar el siguiente reto. Puedes repetir los retos.'); }
  }
  return { busy, error, generate };
}
