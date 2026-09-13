import { defineChapter, type ChapterScript } from '../chapter-script';
import { radioInterlude } from './interludes';

export const chispaScript = {
  id: 'chispa-radio',
  version: 6,
  title: 'Una voz entre las estrellas',
  subtitle: 'Capítulo 1 · Chispa y la radio',
  summary: {
    title: 'Una radio. Una compañera. Un camino a casa.',
    description: 'Lee los mensajes y construye a Chispa con tus cuentas. Así podréis hablar con tus padres.',
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
  robot: { name: 'Chispa', design: 'spark', color: '#b5a3e8' },

  intro: {
    image: 'ship',
    pages: [
      {
        id: 'message', title: 'Un mensaje para ti',
        text: [
          'De vuelta del colegio estelar, tu nave ha aterrizado en el planeta equivocado. «¿Dónde estoy?», te preguntas.',
          'La radio suena y escuchas la voz de tus padres:',
          '—{{name}}, ¿dónde estás? Te estamos esperando para comer.',
          '—Estoy en un planeta que no conozco —respondes.',
          '—¿Y a qué esperas para volver? Dile al ordenador de a bordo que ponga rumbo a la estación Luna.',
          '—Vale…',
          '¡Ups! La radio hace un ruido extraño y no puedes terminar la frase. ¡Está rota!',
        ],
        questions: [{
          id: 'parents-location', prompt: '«¿Dónde me esperaban papá y mamá?», te preguntas.',
          options: [
            { id: 'ship', text: 'En tu pequeña nave.' },
            { id: 'station', text: 'En la estación Luna.' },
            { id: 'workshop', text: 'En el taller de robots.' },
          ],
          answer: 'station',
        }],
      },
      {
        id: 'plan', title: 'Mejor en compañía',
        text: [
          '—La radio no funciona. Detecto un problema eléctrico —dice el ordenador—. Necesitamos a Chispa, pero debemos montarla.',
          'La nave está a salvo en el muelle de este planeta desconocido. Entras en el taller para construir a Chispa.',
        ],
        continueLabel: 'Entrar al taller',
      },
      {
        id: 'workshop', title: 'Hora de trabajar', image: 'workshop',
        text: [
          'En el taller hay una máquina para fabricar piezas de robots. A su lado encuentras el plano de Chispa.',
          '—Cada cuenta resuelta prepara una pieza —dice el ordenador—. Después, colócala sobre la plataforma.',
          'Construye a Chispa. Cuando esté lista, podréis hablar y buscar cómo arreglar la radio.',
        ],
        continueLabel: 'Construir a Chispa.',
      },
    ],
  },

  maths: {
    id: 'build-start', title: 'Una nueva compañera',
    instruction: 'Resuelve las seis cuentas y coloca todas las piezas de Chispa.',
  },

  robotIntroduction: {
    image: 'workshop',
    artwork: {
      landscape: '../adventure/chapters/chispa-radio/chispa-mechanic-landscape.webp',
      portrait: '../adventure/chapters/chispa-radio/chispa-mechanic-portrait.webp',
    },
    pages: [{
      id: 'robot-introduction', title: 'Chispa',
      text: [
        '—¡Hola, {{name}}! Soy Chispa, una robot mecánica. Arreglo lo que está roto para que vuelva a funcionar.',
        'En mi caja de herramientas guardo lo que necesito para trabajar. La radio parece tener un problema eléctrico. Necesito tu ayuda para conectar los cables y que vuelva a circular la corriente.',
      ],
      continueLabel: 'Arreglar la radio.',
    }],
  },

  game: {
    id: 'radio-cables', type: 'pipes', theme: 'radio', image: 'radio',
    title: radioInterlude.title, text: radioInterlude.paragraphs, layout: radioInterlude.layout,
  },

  ending: {
    image: 'radio',
    pages: [
      {
        id: 'repair', title: 'Ahora sí nos escuchan',
        text: [
          'Con los conectores en su sitio, Chispa deja la batería conectada y cierra la tapa. La corriente recorre el circuito y se enciende la luz de la radio.',
          'Pulsas el botón y dices: «¡Hola!».',
          '—¡Ahora te oímos, {{name}}! —responden tus padres—. ¿Quién está contigo?',
          '—Soy Chispa. Vamos a preparar el viaje a la estación Luna.',
        ],
        continueLabel: 'Contar lo que ha pasado.',
      },
      {
        id: 'recap', title: 'Una historia para contar',
        text: [
          'Tus padres quieren conocer la aventura desde el principio.',
          'Primero escuchaste su mensaje. Después construiste a Chispa. Con su cuerpo terminado, Chispa pudo caminar hasta la radio y repararla.',
        ],
        questions: [{
          id: 'story-order', type: 'order', prompt: 'Toca las frases en el orden en que ocurrió todo.',
          events: [
            { id: 'repair', text: 'Chispa reparó la radio.' },
            { id: 'message', text: 'Escuché el mensaje de mis padres.' },
            { id: 'build', text: 'Construí a Chispa.' },
          ],
          answer: ['message', 'build', 'repair'],
        }],
      },
      {
        id: 'ending', title: 'Ya no viajas a solas',
        text: [
          '—Gracias por contárnoslo, {{name}}. Nos alegra conocer a Chispa —dicen tus padres—. Os esperamos en la estación Luna.',
          'Chispa se sienta a tu lado. La radio funciona y ya tienes a tu primera compañera de viaje.',
          'Por hoy, la nave puede descansar. El camino a casa continuará en otra aventura.',
        ],
      },
    ],
    prompt: 'Cuéntale a alguien cómo ayudaste a Chispa.',
  },
} satisfies ChapterScript;

export const chispaChapter = defineChapter(chispaScript);
