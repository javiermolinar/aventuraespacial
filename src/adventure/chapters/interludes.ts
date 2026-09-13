import type { PipeScene } from '../types';
import { waterTankPuzzle } from '../../games/connections/pipes';

/** Reserved for a later chapter. Supply its next scene when adding it to a graph. */
export const waterInterlude: Omit<PipeScene, 'next'> = {
  type: 'pipes', theme: 'water', title: 'Agua para el viaje', image: 'workshop',
  paragraphs: ['—Antes de seguir, llenemos el depósito de agua —dice Chispa—. ¡Estos tubos están girados!'],
  layout: waterTankPuzzle,
};

/** The same rotation challenge, presented as the radio's disconnected cable panel. */
export const radioInterlude: Omit<PipeScene, 'next'> = {
  type: 'pipes', theme: 'radio', title: 'El circuito de la radio', image: 'radio',
  paragraphs: [
    'Chispa abre la tapa con su llave y desconecta la batería. Dentro hay varios cables separados.',
    '—Los conectores unen los extremos de los cables. Gira las piezas para cerrar el circuito: un camino completo de ida y vuelta.',
    '—Cuando esté cerrado, conectaré la batería. Entonces podrá circular la corriente eléctrica y la radio funcionará.',
  ],
  layout: waterTankPuzzle,
};
