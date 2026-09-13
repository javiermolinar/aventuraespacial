import type { Chapter } from '../types';
import { radioInterlude } from './interludes';

/** Frozen pre-script chapter, used only to validate and migrate v1–v4 saves. */
export const chispaV4Chapter: Chapter = {
  id: 'chispa-radio',
  version: 4,
  title: 'Una voz entre las estrellas',
  subtitle: 'Capítulo 1 · Chispa y la radio',
  intro: {
    title: 'Una radio. Una compañera. Un camino a casa.',
    description: 'Lee los mensajes, toma decisiones y construye a Chispa con tus cuentas. Así podréis hablar con tus padres.',
  },
  artwork: {
    ship: {
      boy: {
        landscape: '../adventure/chapters/chispa-radio/cockpit-boy-landscape.webp',
        portrait: '../adventure/chapters/chispa-radio/cockpit-boy-portrait.webp',
      },
      girl: {
        landscape: '../adventure/chapters/chispa-radio/cockpit-girl-landscape.webp',
        portrait: '../adventure/chapters/chispa-radio/cockpit-girl-portrait.webp',
      },
    },
  },
  robot: {
    name: 'Chispa', design: 'spark', color: '#b5a3e8',
    introduction: {
      title: 'Robot mecánica',
      paragraphs: [
        '—¡Hola, {{name}}! Soy Chispa, una robot mecánica. Busco lo que falla en las máquinas y lo reparo para que vuelvan a funcionar.',
        'En mi caja de herramientas guardo lo que necesito para trabajar. Con una llave puedo girar los tornillos que sujetan las piezas de una máquina.',
        'Tu radio necesita una reparación. ¿Me ayudas a encontrar mi llave? Después iremos a arreglarla juntos.',
      ],
      artwork: {
        landscape: '../adventure/chapters/chispa-radio/chispa-mechanic-landscape.webp',
        portrait: '../adventure/chapters/chispa-radio/chispa-mechanic-portrait.webp',
      },
    },
  },
  start: 'message',
  scenes: {
    message: {
      type: 'comprehension', title: 'Un mensaje para ti', image: 'ship', skill: 'literal',
      paragraphs: [
        'Tu pequeña nave ha tomado un camino equivocado. Ahora descansa en un muelle tranquilo. El ordenador enciende la radio y escuchas a tus padres:',
        '—Estamos bien, en la estación Luna. Te esperamos aquí, {{name}}. El ordenador te ayudará a llegar.',
        'Pulsas el botón para responder, pero tu voz no sale por la radio.',
      ],
      question: '¿Dónde te esperan tus padres?',
      options: [
        { id: 'ship', label: 'En tu pequeña nave.', correct: false },
        { id: 'station', label: 'En la estación Luna.', correct: true },
        { id: 'workshop', label: 'En el taller de robots.', correct: false },
      ],
      next: 'plan',
    },
    plan: {
      type: 'story', title: 'Una nave, dos caminos', image: 'ship',
      paragraphs: [
        '—Podemos escuchar, pero no podemos responder —explica el ordenador—. Chispa sabe reparar radios. Sus piezas están en el taller.',
        'Antes de entrar, puedes mirar por la ventana. La nave está a salvo en el muelle. No hay prisa.',
      ],
      choices: [
        { id: 'window', label: 'Mirar por la ventana.', next: 'window' },
        { id: 'workshop', label: 'Ir directamente al taller.', next: 'workshop' },
      ],
    },
    window: {
      type: 'story', title: 'Un vecino muy curioso', image: 'ship',
      paragraphs: [
        'Al otro lado del cristal, un pequeño robot limpia las ventanas del muelle. Te saluda con su esponja y dibuja una cara sonriente en el jabón.',
        'Le devuelves el saludo. Cuando Chispa esté lista, tu nave también tendrá una compañera.',
      ],
      choices: [{ id: 'go', label: 'Entrar en el taller.', next: 'workshop' }],
    },
    workshop: {
      type: 'story', title: 'El taller de Chispa', image: 'workshop',
      paragraphs: [
        'En el taller hay una máquina que fabrica piezas de robot. A su lado encuentras el plano de Chispa.',
        '—Cada cuenta resuelta prepara una pieza —dice el ordenador—. Después, colócala sobre su silueta.',
        'Construye a Chispa entera: la cabeza, el cuerpo, los dos brazos y las dos piernas. Cuando esté lista, podréis hablar y buscar la llave de la radio.',
      ],
      choices: [{ id: 'build', label: 'Construir a Chispa.', next: 'build-start' }],
    },
    'build-start': {
      type: 'build', title: 'Una nueva compañera',
      instruction: 'Resuelve las seis cuentas y coloca todas las piezas de Chispa.',
      targetPlacedParts: 6, completion: 'Tu compañera está lista para ayudarte con la radio.', next: 'tool',
    },
    tool: {
      type: 'comprehension', title: 'La llave escondida', image: 'workshop', skill: 'inference',
      paragraphs: [
        'Chispa señala un armario del taller. Allí guarda sus herramientas.',
        '—Mira, {{name}}. Guardé mi llave en una caja seca que no tiene estrellas.',
        'Lees las etiquetas del armario: la caja azul está mojada; la amarilla está seca y tiene estrellas; la verde está seca y tiene lunas.',
      ],
      question: '¿En qué caja buscarías la llave?',
      options: [
        { id: 'yellow', label: 'En la caja amarilla.', correct: false },
        { id: 'blue', label: 'En la caja azul.', correct: false },
        { id: 'green', label: 'En la caja verde.', correct: true },
      ],
      next: 'hello',
    },
    hello: {
      type: 'story', title: 'El primer saludo', image: 'workshop',
      paragraphs: [
        'Encuentras la llave en la caja verde y se la das a Chispa. Tu compañera la sujeta y da sus primeros pasos.',
        '—¡Todo funciona! Ya puedo caminar hasta la radio y repararla.',
        'Antes de seguir, Chispa te ofrece su mano. ¿Cómo quieres saludar a tu nueva compañera?',
      ],
      choices: [
        { id: 'high-five', label: '¡Choca esos cinco!', next: 'high-five' },
        { id: 'wave', label: 'Saludar moviendo la mano.', next: 'wave' },
      ],
    },
    'high-five': {
      type: 'story', title: '¡Chocamos esos cinco!', image: 'workshop',
      paragraphs: ['Tu mano toca la de Chispa. Suena un pequeño «clin».', '—¡Mi primer saludo! —dice—. Lo guardaré en mi memoria. Ahora, vamos a la radio.'],
      choices: [{ id: 'radio', label: 'Ir a la radio con Chispa.', next: 'radio-cables' }],
    },
    wave: {
      type: 'story', title: 'Un saludo de ida y vuelta', image: 'workshop',
      paragraphs: ['Mueves la mano de un lado a otro. Chispa te imita y casi se da en la antena.', '—Tendré que practicar —dice riendo—. Ahora, vamos a la radio.'],
      choices: [{ id: 'radio', label: 'Ir a la radio con Chispa.', next: 'radio-cables' }],
    },
    'radio-cables': { ...radioInterlude, next: 'repair' },
    repair: {
      type: 'story', title: 'Ahora sí nos escuchan', image: 'radio',
      paragraphs: [
        'Con los conectores en su sitio, Chispa deja la batería conectada y cierra la tapa. La corriente recorre el circuito y se enciende la luz de la radio.',
        'Pulsas el botón y dices: «¡Hola!».',
        '—¡Ahora te oímos, {{name}}! —responden tus padres—. ¿Quién está contigo?',
        '—Soy Chispa. Vamos a preparar el viaje a la estación Luna.',
      ],
      choices: [{ id: 'tell', label: 'Contar lo que ha pasado.', next: 'recap' }],
    },
    recap: {
      type: 'sequence', title: 'Una historia para contar', image: 'radio',
      paragraphs: [
        'Tus padres quieren conocer la aventura desde el principio.',
        'Primero escuchaste su mensaje. Después construiste a Chispa. Con su cuerpo terminado, Chispa pudo caminar hasta la radio y repararla.',
      ],
      question: 'Toca las frases en el orden en que ocurrió todo.',
      events: [
        { id: 'repair', text: 'Chispa reparó la radio.' },
        { id: 'message', text: 'Escuché el mensaje de mis padres.' },
        { id: 'build', text: 'Construí a Chispa.' },
      ],
      correctOrder: ['message', 'build', 'repair'],
      next: 'ending',
    },
    ending: {
      type: 'ending', title: 'Ya no viajas a solas', image: 'radio',
      paragraphs: [
        '—Gracias por contárnoslo, {{name}}. Nos alegra conocer a Chispa —dicen tus padres—. Os esperamos en la estación Luna.',
        'Chispa se sienta a tu lado. La radio funciona y ya tienes a tu primera compañera de viaje.',
        'Por hoy, la nave puede descansar. El camino a casa continuará en otra aventura.',
      ],
      prompt: 'Cuéntale a alguien cómo ayudaste a Chispa.',
    },
  },
};
