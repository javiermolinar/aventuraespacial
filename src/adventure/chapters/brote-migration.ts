import type { Chapter } from '../types';

/** Reconstruct the old graph and puzzle needed to validate version 1/2 saves. */
export function previousBroteChapter(chapter: Chapter, version: 1 | 2): Chapter {
  const game = chapter.scenes['supply-boxes'];
  const snack = chapter.scenes.snack;
  if (game.type !== 'packing' || snack.type !== 'ending') throw new Error('Unexpected Brote chapter structure');
  return {
    ...chapter, version,
    scenes: {
      ...chapter.scenes,
      'supply-boxes': { ...game, puzzleIndex: version === 1 ? 0 : 4 },
      snack: { ...snack, type: 'story', choices: [{ id: 'continue', label: 'Continuar', next: 'recap' }] },
      recap: {
        type: 'sequence', title: 'Una ayuda a tiempo', image: 'ship',
        paragraphs: ['Primero buscaste comida. Después construiste a Brote. Por último ordenasteis las cajas.'],
        question: '¿En qué orden pasó todo?',
        events: [{ id: 'sort', text: 'Ordenar las cajas.' }, { id: 'search', text: 'Buscar comida.' }, { id: 'build', text: 'Construir a Brote.' }],
        correctOrder: ['search', 'build', 'sort'], next: 'ending',
      },
      ending: { ...snack, title: 'Seguimos hacia casa' },
    },
  };
}
