import { defineChapter, type ChapterScript } from '../chapter-script';
import { chispaScript } from './chispa';

export const broteScript = {
  id: 'brote',
  version: 2,
  title: 'Un bocado entre las estrellas',
  subtitle: 'Capítulo 2 · Brote y las cajas',
  summary: {
    title: 'Una barriga vacía y unas cajas demasiado altas.',
    description: 'Construye a Brote y ordena las cajas para encontrar comida durante el viaje a la estación Luna.',
  },
  artwork: {
    ...chispaScript.artwork,
    journey: {
      boy: {
        landscape: '../adventure/chapters/brote/journey-boy-landscape.webp',
        portrait: '../adventure/chapters/brote/journey-boy-portrait.webp',
      },
      girl: {
        landscape: '../adventure/chapters/brote/journey-girl-landscape.webp',
        portrait: '../adventure/chapters/brote/journey-girl-portrait.webp',
      },
    },
    storage: {
      boy: {
        landscape: '../adventure/chapters/brote/storage-boy-landscape.webp',
        portrait: '../adventure/chapters/brote/storage-boy-portrait.webp',
      },
      girl: {
        landscape: '../adventure/chapters/brote/storage-girl-landscape.webp',
        portrait: '../adventure/chapters/brote/storage-girl-portrait.webp',
      },
    },
  },
  robot: { name: 'Brote', design: 'sprout', color: '#87b99d' },
  intro: {
    image: 'ship',
    pages: [
      {
        id: 'hungry', title: 'La barriga protesta', image: 'journey',
        text: [
          'La nave despega del planeta desconocido. Chispa se sienta a tu lado y el ordenador pone rumbo a la estación Luna, donde os esperan tus padres.',
          'De pronto, tu barriga hace un ruido más fuerte que la radio. ¡Tienes muchísima hambre!',
          '—Todavía queda un rato de viaje, {{name}} —dice Chispa—. Vamos a buscar algo para comer.',
        ],
        continueLabel: 'Buscar comida',
      },
      {
        id: 'supplies', title: 'La caja de las manzanas', image: 'storage',
        text: [
          'En la cocina solo queda una jarra de agua. Bebes un poco y miras en el almacén de la nave.',
          'En la estantería más alta ves una caja con una manzana dibujada. Delante hay otras cajas que te impiden abrirla.',
          '—¡Ahí está la comida! —dices—. Pero no llego.',
          '—No te subas a las cajas —avisa Chispa—. Podrían caerse. Necesitamos a alguien que pueda bajarlas con cuidado.',
        ],
        questions: [{
          id: 'food-location', prompt: '¿Dónde está la caja de comida?',
          options: [
            { id: 'kitchen', text: 'Junto a la jarra de agua.' },
            { id: 'shelf', text: 'En la estantería más alta del almacén.' },
            { id: 'seat', text: 'Debajo del asiento de Chispa.' },
          ],
          answer: 'shelf',
        }],
      },
      {
        id: 'workshop', title: 'Un robot para el almacén', image: 'workshop',
        text: [
          '—Brote se encarga de las provisiones —explica el ordenador—. Tiene brazos fuertes para bajar cajas y guardarlas en su sitio.',
          'Chispa encuentra su plano en el taller. La máquina de piezas está lista para trabajar otra vez.',
          '—Tú resuelves las cuentas y yo te acompaño —dice Chispa—. ¡Vamos a construir a Brote!',
        ],
        continueLabel: 'Construir a Brote',
      },
    ],
  },
  maths: {
    id: 'build-start', title: 'Un nuevo compañero',
    instruction: 'Resuelve las seis cuentas y coloca todas las piezas de Brote.',
  },
  robotIntroduction: {
    image: 'workshop',
    pages: [{
      id: 'robot-introduction', title: 'Brote',
      text: [
        '—¡Hola, {{name}}! Soy Brote. Cuido las provisiones para que no falte comida durante los viajes.',
        '—¡Pues mi barriga necesita tu ayuda! —respondes.',
        'Brote mira la estantería y apoya bien los pies. Después baja las cajas, una a una, mientras tú y Chispa esperáis a un lado.',
        '—Ahora vamos a ordenarlas en el compartimento del suelo. Si encajamos todas, podremos abrir la caja de comida sin que nada estorbe.',
      ],
      continueLabel: 'Ordenar las cajas',
    }],
  },
  game: {
    id: 'supply-boxes', type: 'packing', puzzleIndex: 4, image: 'ship',
    title: 'Cada caja en su sitio',
    text: [
      'Brote ya ha bajado las cajas. Cada pieza de color representa un grupo de cajas que va unido.',
      'Ayúdale a encajar todos los grupos en el compartimento, sin que se monten unos sobre otros ni queden huecos. Puedes girarlos para que quepan.',
    ],
  },
  ending: {
    image: 'ship',
    pages: [
      {
        id: 'snack', title: 'Por fin, un bocado',
        text: [
          'Brote termina de asegurar las cajas en el compartimento. Ahora la tapa de la caja de comida se abre sin tropezar con nada.',
          'Dentro hay manzanas y pan. Te lavas las manos, lavas una manzana y te sientas a comer con un trozo de pan.',
          '—¡Eso está mejor! —dices. Tu barriga ya no protesta.',
          'Chispa enciende la radio. Les cuentas a tus padres que Brote os acompaña y que ya has tomado un bocado.',
        ],
      },
      {
        id: 'recap', title: 'Una ayuda a tiempo',
        text: [
          'Primero buscaste comida y encontraste una caja demasiado alta. Después construiste a Brote. Por último, Brote bajó las cajas y las dejasteis ordenadas para poder comer.',
        ],
        questions: [{
          id: 'story-order', type: 'order', prompt: '¿En qué orden pasó todo?',
          events: [
            { id: 'sort', text: 'Brote bajó las cajas y las dejamos ordenadas.' },
            { id: 'search', text: 'Busqué comida y encontré una caja demasiado alta.' },
            { id: 'build', text: 'Construí a Brote.' },
          ],
          answer: ['search', 'build', 'sort'],
        }],
      },
      {
        id: 'ending', title: 'Seguimos hacia casa',
        text: [
          '—Guardaremos el resto para otro momento —dice Brote, cerrando la caja de comida.',
          'Vuelves a tu asiento con Chispa y Brote. Ya no tienes hambre y ahora sois tres a bordo.',
          'Por la ventana ves las estrellas. La estación Luna aún está lejos, pero la nave sigue su camino a casa.',
        ],
      },
    ],
    prompt: 'Cuéntale a alguien por qué necesitabas a Brote y cómo te ayudó con las cajas.',
  },
} satisfies ChapterScript;

export default broteScript;
export const broteChapter = defineChapter(broteScript);
