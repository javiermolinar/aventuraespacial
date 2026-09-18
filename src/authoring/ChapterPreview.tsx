import { useEffect, useState } from 'react';
import { levels } from '../game';
import { chapterCatalog } from '../adventure/chapters/catalog';
import { earnPart, moveTo, placePart, rotatePipe, updatePacking, type AdventureProgress } from '../adventure/progress';
import { playerNameMaxLength } from '../adventure/personalization';
import type { Chapter, Character } from '../adventure/types';
import NarrativeView from '../adventure/NarrativeView';
import { SceneArt } from '../adventure/SceneArt';
import { adventureMusic } from '../adventure/music';
import { BackgroundMusic } from '../components/BackgroundMusic';
import { DeferredContent } from '../components/DeferredContent';
import { availableChapterSources } from './sources';
import { checkChapter } from './validation';
import { previewProgress, type PreviewOptions } from './preview-progress';
import '../adventure/adventure.css';
import './chapter-preview.css';

const sources = availableChapterSources();

function PreviewScene({ chapter, options, onRestart }: { chapter: Chapter; options: PreviewOptions; onRestart: () => void }) {
  const [seed] = useState(() => {
    try { return { progress: previewProgress(chapter, options), error: '' }; }
    catch (error) { return { progress: null, error: (error as Error).message }; }
  });
  return seed.progress ? <PreviewRun chapter={chapter} initialProgress={seed.progress} onRestart={onRestart} /> : <p className="loading-panel" role="alert">{seed.error}</p>;
}

/** A separate development host for the real renderer, with no persistence services. */
function PreviewRun({ chapter, initialProgress, onRestart }: { chapter: Chapter; initialProgress: AdventureProgress; onRestart: () => void }) {
  const [progress, setProgress] = useState(initialProgress);
  const [sound, setSound] = useState(false);
  const [completed, setCompleted] = useState(false);
  const scene = chapter.scenes[progress.sceneId];
  const introduction = scene.type === 'build'
    ? progress.placedCount === 6 ? chapter.robot.introduction : undefined
    : scene.robotIntroduction ? { title: scene.title, paragraphs: scene.paragraphs, artwork: scene.robotIntroduction.artwork } : undefined;
  const building = scene.type === 'build' && !introduction && !completed;
  const piping = scene.type === 'pipes' && !completed;
  const packing = scene.type === 'packing' && !completed;
  return <div className={`adventure-experience chapter-preview-screen ${completed ? 'is-reading' : introduction ? 'is-introducing' : building ? 'is-building' : piping ? 'is-piping' : packing ? 'is-packing' : 'is-reading'}`}>
    {!introduction && <SceneArt chapter={chapter} character={progress.character} image={scene.type === 'build' ? 'workshop' : scene.image} assetPrefix="./" />}
    <BackgroundMusic enabled={sound} src={`./music/${adventureMusic(scene, Boolean(introduction))}`} />
    <header className="adventure-chrome">
      <span className="preview-position">Escena actual: <code>{progress.sceneId}</code></span>
      <button className="chrome-button" aria-pressed={sound} onClick={() => setSound(previous => !previous)}>{sound ? 'Desactivar sonido' : 'Activar sonido'}</button>
    </header>
    <main className={building ? 'construction-stage' : piping ? 'pipe-stage' : packing ? 'packing-stage' : 'cinematic-stage'}>
      {completed ? <section className="dialogue-dock"><h1>Capítulo terminado (sin guardar)</h1><button className="primary" onClick={onRestart}>Reiniciar escena</button></section> : <NarrativeView
        chapter={chapter} scene={scene} progress={progress} introduction={introduction} sound={sound} assetPrefix="./"
        reviewId={null} reviewScene={null} onReviewNext={() => {}}
        onNext={id => setProgress(previous => moveTo(previous, chapter, id))} onComplete={() => setCompleted(true)}
        onEarn={() => setProgress(previous => earnPart(previous, chapter))} onPlace={() => setProgress(previous => placePart(previous, chapter))}
        onPackingChange={state => setProgress(previous => updatePacking(previous, chapter, state))}
        onRotate={(index, turns) => setProgress(previous => rotatePipe(previous, chapter, index, turns))} />}
    </main>
  </div>;
}

export default function ChapterPreview() {
  const [query] = useState(() => new URLSearchParams(window.location.search));
  const [chapterId, setChapterId] = useState(query.get('chapter-preview') || sources[0]?.id || '');
  const [options, setOptions] = useState<PreviewOptions>({
    sceneId: query.get('scene') ?? '', playerName: query.get('name') ?? 'Lucía',
    character: (query.get('character') ?? 'girl') as Character, mathsLevel: Number(query.get('level') ?? 0),
  });
  // Keep edits separate from the running scene so typing never remounts it or steals focus.
  const [controls, setControls] = useState(options);
  const [loaded, setLoaded] = useState<{ chapter: Chapter; warnings: string[] } | null>(null);
  const [error, setError] = useState('');
  const [restart, setRestart] = useState(0);
  useEffect(() => {
    let current = true;
    setLoaded(null);
    setError('');
    const matches = sources.filter(source => source.id === chapterId);
    const source = matches[0];
    if (!source) { setError(`Unknown chapter: ${chapterId}`); return; }
    if (matches.length > 1) { setError(`${chapterId}: both a published chapter and a draft exist. Move or remove the draft.`); return; }
    void source.load().then(chapter => {
      const report = checkChapter(chapter, chapterCatalog, source.draft);
      if (report.errors.length) throw new Error(report.errors.join('; '));
      if (current) setLoaded({ chapter, warnings: report.warnings });
    }).catch(error => { if (current) setError(String(error.message ?? error)); });
    return () => { current = false; };
  }, [chapterId]);
  useEffect(() => {
    const url = new URL(window.location.href);
    url.search = new URLSearchParams({ 'chapter-preview': chapterId, scene: options.sceneId, name: options.playerName, character: options.character, level: String(options.mathsLevel) }).toString();
    window.history.replaceState(null, '', url);
  }, [chapterId, options]);
  const reset = () => setRestart(previous => previous + 1);

  return <>
    <aside className="chapter-preview-controls" aria-label="Herramientas de capítulos">
      <h1>Vista previa de capítulos</h1>
      <p>Solo desarrollo. No se leen ni se escriben partidas, desbloqueos ni preferencias. Elige una escena y pulsa «Aplicar y reiniciar». Cambiar de capítulo o recargar también reinicia la prueba.</p>
      <form className="preview-fields" onSubmit={event => { event.preventDefault(); setOptions({ ...controls }); reset(); }}>
        <label>Capítulo<select value={chapterId} onChange={event => { setChapterId(event.target.value); const next = { ...controls, sceneId: '' }; setControls(next); setOptions(next); }}>
          {!sources.some(source => source.id === chapterId) && <option value={chapterId}>{chapterId || 'Sin capítulos'}</option>}
          {sources.map(source => <option key={`${source.draft}:${source.id}`} value={source.id}>{source.label} · {source.id}</option>)}
        </select></label>
        <label>Escena<select value={controls.sceneId} onChange={event => setControls(previous => ({ ...previous, sceneId: event.target.value }))} disabled={!loaded}>
          <option value="">Inicio del capítulo</option>
          {controls.sceneId && loaded && !Object.hasOwn(loaded.chapter.scenes, controls.sceneId) && <option value={controls.sceneId}>Desconocida: {controls.sceneId}</option>}
          {loaded && Object.entries(loaded.chapter.scenes).map(([id, scene]) => <option key={id} value={id}>{id} · {scene.type} · {scene.title}</option>)}
        </select></label>
        <label>Nombre<input value={controls.playerName} maxLength={playerNameMaxLength} onChange={event => setControls(previous => ({ ...previous, playerName: event.target.value }))} /></label>
        <label>Personaje<select value={controls.character} onChange={event => setControls(previous => ({ ...previous, character: event.target.value as Character }))}><option value="girl">Niña</option><option value="boy">Niño</option></select></label>
        <label>Nivel de mates<select value={controls.mathsLevel} onChange={event => setControls(previous => ({ ...previous, mathsLevel: Number(event.target.value) }))}>{levels.map((level, index) => <option key={index} value={index}>{index + 1}. {level.name}</option>)}</select></label>
        <button className="secondary" type="submit">Aplicar y reiniciar</button>
        <a href="./index.html">Salir de la vista previa</a>
      </form>
      {loaded && loaded.warnings.length > 0 && <details><summary>Texto de borrador pendiente ({loaded.warnings.length})</summary><ul>{loaded.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></details>}
      {error && <p role="alert">{error}</p>}
    </aside>
    {loaded ? <DeferredContent key={`${chapterId}:${JSON.stringify(options)}:${restart}`}><PreviewScene chapter={loaded.chapter} options={options} onRestart={reset} /></DeferredContent> : !error && <p role="status">Cargando capítulo…</p>}
  </>;
}
