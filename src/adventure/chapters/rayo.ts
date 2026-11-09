import { defineChapter, type ChapterScript } from '../chapter-script';

export const rayoScript = {
  id: 'rayo',
  version: 1,
  title: 'Alarma en la oscuridad',
  subtitle: 'Capítulo 3 · Rayo y la electricidad',
  summary: {
    title: 'Una alarma. Una nave a oscuras. Un nuevo compañero.',
    description: 'Construye a Rayo con restas de tres cifras sin llevadas y repara el circuito de la nave con resistencias.',
  },
  artwork: {
    ship: {
      boy: {
        landscape: '../adventure/chapters/rayo/emergency-boy-landscape.webp',
        portrait: '../adventure/chapters/rayo/emergency-boy-portrait.webp',
      },
      girl: {
        landscape: '../adventure/chapters/rayo/emergency-girl-landscape.webp',
        portrait: '../adventure/chapters/rayo/emergency-girl-portrait.webp',
      },
    },
    sleep: {
      boy: {
        landscape: '../adventure/chapters/rayo/sleep-boy-landscape.webp',
        portrait: '../adventure/chapters/rayo/sleep-boy-portrait.webp',
      },
      girl: {
        landscape: '../adventure/chapters/rayo/sleep-girl-landscape.webp',
        portrait: '../adventure/chapters/rayo/sleep-girl-portrait.webp',
      },
    },
  },
  robot: { name: 'Rayo', design: 'bolt', color: '#efc775' },
  intro: {
    image: 'ship',
    pages: [
      {
        id: 'alarm', title: 'Una alarma en mitad de la noche', ambience: 'alarm',
        text: [
          '¡UUUUIII! ¡UUUUIII! Te despierta en mitad de la noche una alarma. Resuena por toda la nave y no puedes pararla. ¡Los oídos te van a explotar!',
          'Buscas el interruptor. Clic. Nada. No hay luz, solo el resplandor rojo de las luces de emergencia. Las sombras parecen enormes.',
          'Apartas la manta. El suelo está frío y te late muy deprisa el corazón. A tientas, con una mano en la pared, te acercas a la cabina de mando.',
        ],
        continueLabel: 'Llegar a la cabina',
      },
      {
        id: 'damage', title: 'El mensaje del ordenador', ambience: 'alarm',
        text: [
          'La pantalla del ordenador es la única que sigue encendida. Muestra una señal de peligro.',
          '—{{name}}, un meteorito ha golpeado la nave —dice el ordenador—. El impacto ha dañado el sistema de electricidad. Por eso se han apagado las luces y suena la alarma.',
          'Detrás de ti se oye un golpe. ¡CLONC! Te das la vuelta de un salto.',
          '—¡Soy yo! —dice Brote, que ha caído de culo al suelo al tropezar con una silla. Chispa aparece a su lado con una linterna. Qué alivio escuchar sus voces.',
          '—Debemos construir a Rayo. Es el experto en electrónica —dice Chispa.',
        ],
        questions: [{
          id: 'power-failure', prompt: '¿Por qué se han apagado las luces de la nave?',
          options: [
            { id: 'night', text: 'Porque el ordenador las apaga cada noche.' },
            { id: 'meteorite', text: 'Porque un meteorito ha dañado el sistema de electricidad.' },
            { id: 'brote', text: 'Porque Brote ha tropezado con una silla.' },
          ],
          answer: 'meteorite',
        }],
      },
      {
        id: 'workshop', title: 'Un plano bajo la linterna',
        text: [
          '—Necesitamos a Rayo, nuestro especialista en electricidad —dice Chispa—. Su plano está en el taller.',
          'Brote alumbra el pasillo. Tú sigues muy cerca de tus compañeros, sin mirar las sombras de las esquinas.',
          'Al cerrar la puerta del taller, la alarma se oye más lejos. La máquina de piezas tiene una batería de reserva y todavía funciona.',
          '—Resuelve seis restas de tres cifras sin llevadas —explica el ordenador—. Con cada cuenta podremos fabricar una pieza de Rayo.',
        ],
        continueLabel: 'Construir a Rayo',
      },
    ],
  },
  maths: {
    id: 'build-start', title: 'Construye a Rayo', level: 13,
    instruction: 'Resuelve las seis restas de tres cifras sin llevadas y coloca todas las piezas de Rayo.',
  },
  robotIntroduction: {
    image: 'ship',
    artwork: {
      boy: {
        landscape: '../adventure/chapters/rayo/rayo-introduction-boy-landscape.webp',
        portrait: '../adventure/chapters/rayo/rayo-introduction-boy-portrait.webp',
      },
      girl: {
        landscape: '../adventure/chapters/rayo/rayo-introduction-girl-landscape.webp',
        portrait: '../adventure/chapters/rayo/rayo-introduction-girl-portrait.webp',
      },
    },
    pages: [{
      id: 'robot-introduction', title: 'Rayo y las resistencias',
      text: [
        '—Hola, soy Rayo, experto en electrónica.',
        'Rayo se conecta al terminal y al momento responde.',
        '—Ya veo, se ha estropeado el circuito que mantiene la corriente. Debemos arreglarlo. Para ello necesitamos resistencias.',
        '—Esto es una resistencia. Es una pieza que dificulta el paso de la corriente eléctrica para que no se quemen los componentes. Nos ayuda a controlar la corriente que pasa por un circuito.',
        '—Ayúdame a colocarla, {{name}}.',
      ],
      continueLabel: 'Reparar el circuito',
    }],
  },
  game: {
    id: 'power-board', type: 'resistors', level: 1, image: 'ship',
    title: 'Que vuelva la luz',
    text: [
      'Rayo ha desconectado la batería. En la placa hay tres huecos y tres piezas: un puente, una resistencia de −1 y otra de −3.',
      'La batería envía cinco chispas. Coloca las piezas para que lleguen exactamente dos a la bombilla. Fíjate en los caminos: el hueco de abajo no llega a ella.',
      'Cuando todo esté colocado, pulsa Probar. Rayo se encargará de conectar la batería para la prueba.',
    ],
  },
  ending: {
    image: 'sleep',
    pages: [{
      id: 'lights-back', title: '¡Se hizo la luz!', ambience: 'calm',
      text: [
        'Rayo termina de ajustar el circuito y cierra la tapa. Las luces de la nave se encienden, una tras otra. La molesta alarma se calla por fin.',
        '—Ya está, {{name}}. El sistema de electricidad vuelve a funcionar —dice Rayo.',
        'Te frotas los ojos. —¡Qué sueño! —dices—. No me despertéis en tres días —comentas a tus amigos robóticos.',
        'Te acuestas en tu cama y te tapas hasta arriba. ¡Dulces sueños!',
      ],
      questions: [{
        id: 'resistance-meaning', prompt: '¿Qué es una resistencia?',
        options: [
          { id: 'source', text: 'Una batería que envía corriente eléctrica.' },
          { id: 'resistance', text: 'Una pieza que dificulta el paso de la corriente eléctrica.' },
          { id: 'alarm', text: 'Una alarma que avisa cuando hay una avería.' },
        ],
        answer: 'resistance',
      }],
    }],
  },
} satisfies ChapterScript;

export default rayoScript;
export const rayoChapter = defineChapter(rayoScript);
