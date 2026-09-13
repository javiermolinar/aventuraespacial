import { describe, expect, it } from 'vitest';
import { defineChapter, type ChapterScript } from './chapter-script';
import { chispaScript } from './chapters/chispa';
import { destinations, validateChapter } from './types';
import { earnPart, moveTo, newAdventure, placePart, validateProgress } from './progress';

const script = (): ChapterScript => structuredClone(chispaScript);

describe('chapter scripts', () => {
  it('compiles the six phases in order without changing authored content', () => {
    const source = script();
    const before = structuredClone(source);
    const chapter = defineChapter(source);
    expect(source).toEqual(before);
    expect(validateChapter(chapter)).toEqual([]);
    expect(Object.keys(chapter.scenes)).toEqual([
      'message', 'plan', 'workshop', 'build-start', 'robot-introduction',
      'radio-cables', 'repair', 'recap', 'ending',
    ]);
    expect(chapter.scenes['build-start']).toMatchObject({ type: 'build', targetPlacedParts: 6, next: 'robot-introduction' });
    expect(chapter.scenes['robot-introduction']).toMatchObject({ robotIntroduction: { artwork: source.robotIntroduction.artwork } });
    const ids = Object.keys(chapter.scenes);
    ids.forEach((id, index) => expect(destinations(chapter.scenes[id])).toEqual(ids.slice(index + 1, index + 2)));
  });

  it('goes directly to the game when middle is omitted, but still supports middle dialogue', () => {
    const source = script();
    expect(destinations(defineChapter(source).scenes['robot-introduction'])).toEqual(['radio-cables']);
    source.middle = { image: 'workshop', pages: [{ id: 'prepare', title: 'Preparación', text: ['Vamos a la radio.'] }] };
    const chapter = defineChapter(source);
    expect(destinations(chapter.scenes['robot-introduction'])).toEqual(['prepare']);
    expect(destinations(chapter.scenes.prepare)).toEqual(['radio-cables']);
  });

  it('defaults text-only pages to Continue and inherits or overrides phase artwork', () => {
    const source = script();
    source.intro.pages = [{ id: 'intro', title: 'Hello', text: ['Hello, {{name}}.'] }];
    const chapter = defineChapter(source);
    expect(chapter.scenes.intro).toMatchObject({
      type: 'story', image: 'ship', paragraphs: ['Hello, {{name}}.'],
      choices: [{ id: 'continue', label: 'Continuar', next: 'build-start' }],
    });
    expect(defineChapter(script()).scenes.workshop).toMatchObject({ image: 'workshop' });
  });

  it('compiles mixed questions sequentially with the full passage and stable generated IDs', () => {
    const source = script();
    const page = source.intro.pages[0];
    page.questions!.push({ id: 'chronology', type: 'order', prompt: 'What happened first?', events: [{ id: 'b', text: 'Second' }, { id: 'a', text: 'First' }], answer: ['a', 'b'] });
    const chapter = defineChapter(source);
    expect(chapter.scenes.message).toMatchObject({ next: 'message:question:chronology' });
    expect(chapter.scenes['message:question:chronology']).toMatchObject({
      type: 'sequence', paragraphs: page.text, correctOrder: ['a', 'b'], next: 'plan',
    });
    const p = moveTo(newAdventure(chapter, 0), chapter, 'message:question:chronology');
    expect(validateProgress(p, chapter)).toBe(true);
    expect(chapter.scenes.message).toMatchObject({ options: [
      { id: 'ship', correct: false }, { id: 'station', correct: true }, { id: 'workshop', correct: false },
    ] });
  });

  it('supports multiple robot dialogue pages, questions and final-page questions', () => {
    const source = script();
    source.robotIntroduction.pages[0].questions = structuredClone(source.intro.pages[0].questions);
    source.robotIntroduction.pages.push({ id: 'robot-tools', title: 'Tools', text: ['My tools.'] });
    source.ending.pages.at(-1)!.questions = structuredClone(source.intro.pages[0].questions);
    const chapter = defineChapter(source);
    expect(chapter.scenes['robot-introduction']).toMatchObject({ type: 'comprehension', next: 'robot-tools' });
    expect(chapter.scenes['robot-tools']).toMatchObject({ robotIntroduction: { artwork: source.robotIntroduction.artwork }, choices: [{ next: 'radio-cables' }] });
    expect(chapter.scenes.ending).toMatchObject({ type: 'comprehension', next: 'ending:ending' });
    expect(chapter.scenes['ending:ending']).toMatchObject({ type: 'ending', prompt: source.ending.prompt });
    expect(validateChapter(chapter)).toEqual([]);
  });

  it('enters the introduction only after six placements, preserving a resumable state', () => {
    const chapter = defineChapter(script());
    let p = newAdventure(chapter, 0);
    for (const id of ['plan', 'workshop', 'build-start']) p = moveTo(p, chapter, id);
    for (let i = 0; i < 6; i++) {
      expect(p.sceneId).toBe('build-start');
      expect(moveTo(p, chapter, 'robot-introduction')).toBe(p);
      p = placePart(earnPart(p, chapter), chapter);
      expect(validateProgress(p, chapter)).toBe(true);
    }
    expect(p.sceneId).toBe('robot-introduction');
    expect(placePart(p, chapter)).toBe(p);
    expect(p.history.at(-1)).toBe('build-start');
  });

  it.each(['intro', 'robotIntroduction', 'middle', 'ending'] as const)('rejects an empty %s phase', phase => {
    const source = script();
    if (phase === 'middle') source.middle = { image: 'workshop', pages: [] };
    else source[phase].pages = [];
    expect(() => defineChapter(source)).toThrow('at least one page');
  });

  it('rejects duplicate IDs rather than silently overwriting a scene', () => {
    const source = script();
    source.intro.pages[1].id = 'message';
    expect(() => defineChapter(source)).toThrow('Duplicate or empty scene ID: message');
    source.intro.pages[1].id = 'build-start';
    expect(() => defineChapter(source)).toThrow('Duplicate or empty scene ID: build-start');
    source.intro.pages[1].id = 'reserved:id';
    expect(() => defineChapter(source)).toThrow('Invalid page ID');
  });

  it('rejects empty passages, duplicate questions, unknown answers and invalid orderings', () => {
    const empty = script();
    empty.intro.pages[0].text = [' '];
    expect(() => defineChapter(empty)).toThrow('Empty passage: message');
    const duplicate = script();
    duplicate.intro.pages[0].questions!.push(duplicate.intro.pages[0].questions![0]);
    expect(() => defineChapter(duplicate)).toThrow('Invalid question: message/parents-location');
    const unknown = script();
    unknown.intro.pages[0].questions![0].answer = 'unknown';
    expect(() => defineChapter(unknown)).toThrow('Invalid answers: message');
    const order = script();
    order.ending.pages[1].questions![0].answer = ['build', 'build', 'repair'];
    expect(() => defineChapter(order)).toThrow('Invalid sequence: recap');
    const options = script();
    const question = options.intro.pages[0].questions![0];
    if (question.type !== 'order') question.options[0].id = 'station';
    expect(() => defineChapter(options)).toThrow('Invalid answers: message');
  });
});
