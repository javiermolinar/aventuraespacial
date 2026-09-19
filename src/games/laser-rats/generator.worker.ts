import { generatePuzzle, type GeneratorOptions } from './generator';

self.onmessage = (event: MessageEvent<GeneratorOptions>) => {
  try { self.postMessage(generatePuzzle(event.data)); }
  catch { self.postMessage({ status: 'not-found', reason: 'No se ha podido preparar el tablero. Puedes intentarlo otra vez.', attempts: 0 }); }
};
