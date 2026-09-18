import { validateChapter, type Chapter, type ComprehensionScene, type Illustration, type PipeScene, type PackingScene, type ResponsiveArtwork, type Scene } from './types';

export type DialogueQuestion = {
  id: string;
  prompt: string;
} & ({
  type?: 'choice';
  skill?: ComprehensionScene['skill'];
  options: { id: string; text: string }[];
  answer: string;
} | {
  type: 'order';
  events: { id: string; text: string }[];
  answer: string[];
});

export type DialoguePage = {
  id: string;
  title: string;
  text: string[];
  image?: Illustration;
  questions?: DialogueQuestion[];
  continueLabel?: string;
};
export type DialoguePhase = { image: Illustration; pages: DialoguePage[] };

/** Ordered phases, with optional middle dialogue; no authored scene destinations. */
export type ChapterScript = {
  id: string;
  version: number;
  title: string;
  subtitle: string;
  summary: Chapter['intro'];
  artwork: Chapter['artwork'];
  robot: Omit<Chapter['robot'], 'introduction'>;
  intro: DialoguePhase;
  maths: { id: string; title: string; instruction: string };
  robotIntroduction: DialoguePhase & { artwork?: ResponsiveArtwork };
  middle?: DialoguePhase;
  game: { id: string; text: string[] } & (Omit<PipeScene, 'next' | 'paragraphs' | 'robotIntroduction'> | Omit<PackingScene, 'next' | 'paragraphs' | 'robotIntroduction'>);
  ending: DialoguePhase & { prompt: string };
};

/** Compile to the existing runtime graph. A question keeps its page's complete passage. */
export function defineChapter(script: ChapterScript): Chapter {
  const entries: [string, Scene][] = [];
  const ids = new Set<string>();
  const add = (id: string, scene: Scene) => {
    if (!id.trim() || ids.has(id)) throw new Error(`Duplicate or empty scene ID: ${id}`);
    ids.add(id);
    entries.push([id, scene]);
  };
  const dialogue = (phase: DialoguePhase, robot = false) => {
    if (!phase.pages.length) throw new Error('Dialogue phases need at least one page');
    for (const page of phase.pages) {
      // ':' is reserved for generated question/ending scene IDs.
      if (!page.id.trim() || page.id.includes(':')) throw new Error(`Invalid page ID: ${page.id}`);
      if (!page.title.trim()) throw new Error(`Empty page title: ${page.id}`);
      const reading = {
        title: page.title, image: page.image ?? phase.image, paragraphs: [...page.text],
        ...(robot ? { robotIntroduction: { artwork: script.robotIntroduction.artwork } } : {}),
      };
      const questions = page.questions ?? [];
      const questionIds = new Set<string>();
      questions.forEach((question, index) => {
        if (!question.id.trim() || question.id.includes(':') || questionIds.has(question.id) || !question.prompt.trim()) throw new Error(`Invalid question: ${page.id}/${question.id}`);
        questionIds.add(question.id);
        const options = question.type === 'order' ? question.events : question.options;
        if (options.some(option => !option.id.trim() || !option.text.trim())) throw new Error(`Empty question option: ${page.id}/${question.id}`);
        // The first question retains the page ID, including existing Chispa save IDs.
        const id = index === 0 ? page.id : `${page.id}:question:${question.id}`;
        if (question.type === 'order') {
          add(id, { ...reading, type: 'sequence', question: question.prompt, events: question.events.map(event => ({ ...event })), correctOrder: [...question.answer], next: '' });
        } else {
          add(id, {
            ...reading, type: 'comprehension', skill: question.skill ?? 'literal', question: question.prompt,
            options: question.options.map(option => ({ id: option.id, label: option.text, correct: option.id === question.answer })), next: '',
          });
        }
      });
      if (!questions.length) add(page.id, {
        ...reading, type: 'story', choices: [{ id: 'continue', label: page.continueLabel ?? 'Continuar', next: '' }],
      });
    }
  };

  dialogue(script.intro);
  const { id: mathsId, ...maths } = script.maths;
  add(mathsId, { ...maths, type: 'build', completion: `¡Has construido a ${script.robot.name}!`, targetPlacedParts: 6, autoAdvance: true, next: '' });
  dialogue(script.robotIntroduction, true);
  if (script.middle) dialogue(script.middle);
  const { id: gameId, text, ...game } = script.game;
  add(gameId, { ...game, paragraphs: [...text], next: '' });
  dialogue(script.ending);

  const [lastId, last] = entries[entries.length - 1];
  if (last.type === 'build') throw new Error('Chapter must end with dialogue');
  const ending = { title: last.title, image: last.image, paragraphs: [...last.paragraphs], type: 'ending' as const, prompt: script.ending.prompt };
  // A final text-only page is the ending itself. Questions get a final completion screen.
  if (last.type === 'story') entries[entries.length - 1] = [lastId, ending];
  else add(`${script.ending.pages.at(-1)!.id}:ending`, ending);

  entries.forEach(([, scene], index) => {
    if (scene.type === 'ending') return;
    const next = entries[index + 1][0];
    if (scene.type === 'story') scene.choices[0].next = next;
    else scene.next = next;
  });
  const chapter: Chapter = {
    id: script.id, version: script.version, title: script.title, subtitle: script.subtitle,
    intro: script.summary, artwork: script.artwork, robot: script.robot,
    start: entries[0][0], scenes: Object.fromEntries(entries),
  };
  const errors = validateChapter(chapter);
  if (errors.length) throw new Error(`Invalid chapter ${script.id}: ${errors.join('; ')}`);
  return chapter;
}
