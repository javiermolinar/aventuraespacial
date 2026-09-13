import { useEffect, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { ArrowLeft, ArrowRight, Bot, Check, Droplet, Radio, PencilLine, Volume2, VolumeX } from 'lucide-react';
import { levels, loadProgress, saveProgress } from '../game';
import { BackgroundMusic } from '../components/BackgroundMusic';
import { TextEntryDialog } from '../components/TextEntryDialog';
import { playSound } from '../sound';
import { soundtracks } from '../music';
import { chapterCatalog, playableChapter, type ChapterEntry } from './chapters/catalog';
import { ChapterMenu } from './ChapterMenu';
import { chapterUnlocked, completeChapter, loadCampaign, recordChapter, saveCampaign, selectChapter } from './campaign';
import type { Chapter, Character } from './types';
import { earnPart, moveTo, newAdventure, placePart, rotatePipe, type AdventureProgress } from './progress';
import { PipePuzzle } from './PipePuzzle';
import { SceneArt } from './SceneArt';
import { RobotIntroduction } from './RobotIntroduction';
import { adventureMusic } from './music';
import { normalizePlayerName, personalize, playerNameMaxLength } from './personalization';
import { BuildActivity, DialogueActions } from './Activities';
import './adventure.css';

type View = 'home' | 'setup' | 'play';

export default function Adventure({ chapter: chapterOverride, catalog: catalogOverride, entry = 'play' }: {
  chapter?: Chapter; catalog?: readonly ChapterEntry[]; entry?: 'home' | 'play';
}) {
  const catalog = catalogOverride ?? (chapterOverride ? [playableChapter(chapterOverride)] : chapterCatalog);
  const [loaded] = useState(() => loadCampaign(catalog));
  const [campaign, setCampaign] = useState(loaded.campaign);
  const chapter = catalog.find(item => item.id === campaign.activeChapterId)!.chapter!;
  const progress = campaign.chapters[chapter.id] ?? null;
  const setProgress = (update: AdventureProgress | ((previous: AdventureProgress | null) => AdventureProgress | null)) => setCampaign(previous => {
    if (previous.activeChapterId !== chapter.id) return previous;
    const nextProgress = typeof update === 'function' ? update(previous.chapters[chapter.id] ?? null) : update;
    return nextProgress ? recordChapter(previous, catalog, nextProgress) : previous;
  });
  const [view, setView] = useState<View>(() => entry === 'home' ? 'home' : loaded.campaign.chapters[loaded.campaign.activeChapterId] ? 'play' : 'setup');
  const [preferences, setPreferences] = useState(loadProgress);
  const [character, setCharacter] = useState<Character>(loaded.campaign.profile.character);
  const [mathsLevel, setMathsLevel] = useState(loaded.campaign.profile.mathsLevel);
  const [playerName, setPlayerName] = useState(loaded.campaign.profile.playerName);
  const [editingName, setEditingName] = useState(false);
  const [saveFailed, setSaveFailed] = useState(loaded.unavailable);
  const [soundSaveFailed, setSoundSaveFailed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const scene = progress ? chapter.scenes[progress.sceneId] : null;
  const introduction = view !== 'play' || !scene ? undefined : scene.type === 'build'
    ? progress?.placedCount === 6 ? chapter.robot.introduction : undefined
    : scene.robotIntroduction ? { title: scene.title, paragraphs: scene.paragraphs, artwork: scene.robotIntroduction.artwork } : undefined;
  const building = view === 'play' && scene?.type === 'build' && !introduction;
  const piping = view === 'play' && scene?.type === 'pipes';
  const assetPrefix = entry === 'home' ? './' : '../';

  useEffect(() => {
    // Do not overwrite a damaged save or create an empty campaign before the player starts.
    if (Object.keys(campaign.chapters).length) setSaveFailed(!saveCampaign(campaign));
  }, [campaign]);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [chapter.id, progress?.sceneId, view]);

  const toggleSound = () => {
    const next = { ...loadProgress(), sound: !preferences.sound };
    setPreferences(next);
    setSoundSaveFailed(!saveProgress(next));
    playSound('tap', next.sound);
  };
  const next = (id: string) => setProgress(previous => previous ? moveTo(previous, chapter, id) : previous);
  const start = () => { setProgress(newAdventure(chapter, mathsLevel, character, playerName)); setView('play'); };
  const prepare = (id = chapter.id) => {
    const profile = campaign.chapters[id] ?? campaign.profile;
    setMathsLevel(profile.mathsLevel); setCharacter(profile.character); setPlayerName(profile.playerName);
    setCampaign(previous => selectChapter(previous, catalog, id));
    setView('setup');
  };
  const chooseChapter = (id: string) => {
    const selected = catalog.find(item => item.id === id)?.chapter;
    if (!selected || !chapterUnlocked(campaign, catalog, id)) return;
    const saved = campaign.chapters[id];
    if (!saved || (campaign.completed.includes(id) && selected.scenes[saved.sceneId].type === 'ending')) prepare(id);
    else { setCampaign(previous => selectChapter(previous, catalog, id)); setView('play'); }
  };
  const home = () => setView('home');
  const finish = () => { setCampaign(previous => completeChapter(previous, catalog, chapter.id)); setView('home'); };
  const finishedRun = progress && scene?.type === 'ending' && campaign.completed.includes(chapter.id);

  return <MotionConfig reducedMotion="user"><div className={`adventure-experience ${view === 'home' ? 'is-home' : view === 'setup' ? 'is-setup' : introduction ? 'is-introducing' : building ? 'is-building' : piping ? 'is-piping' : 'is-reading'}`}>
    {!introduction && <SceneArt chapter={chapter} character={view === 'setup' ? character : progress?.character ?? character} image={scene && scene.type !== 'build' && view === 'play' ? scene.image : 'ship'} assetPrefix={assetPrefix} />}
    <BackgroundMusic enabled={preferences.sound && view !== 'setup'} src={`${assetPrefix}music/${view === 'home' ? soundtracks.home.file : adventureMusic(scene, Boolean(introduction))}`} />
    <header className="adventure-chrome">
      {view !== 'home' && <button className="chrome-button" onClick={home} aria-label="Volver al inicio"><ArrowLeft size={20} /></button>}
      {view !== 'setup' && <button className="chrome-button" onClick={toggleSound} aria-label={preferences.sound ? 'Desactivar sonido' : 'Activar sonido'} aria-pressed={preferences.sound}>{preferences.sound ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>}
    </header>
    {(saveFailed || soundSaveFailed) && <div className="experience-notices" role="status">
      {saveFailed && <p>No se puede guardar el progreso en este navegador. Puedes jugar, pero los cambios no se conservarán al salir.</p>}
      {soundSaveFailed && <p>No se puede guardar la preferencia de sonido.</p>}
    </div>}
    <main className={building ? 'construction-stage' : piping ? 'pipe-stage' : 'cinematic-stage'}>
      {view === 'home' ? <section className="dialogue-dock home-dock">
        <h1 ref={headingRef} tabIndex={-1}>Una aventura espacial</h1>
        {loaded.reset && !progress && <p className="inline-notice">La partida guardada no es compatible o está dañada. Puedes empezar de nuevo.</p>}
        <div className="home-actions"><button className="primary" onClick={() => chooseChapter(chapter.id)}>{finishedRun ? 'Repetir capítulo' : progress ? 'Continuar aventura' : 'Empezar aventura'}<ArrowRight size={21} /></button>{progress && !finishedRun && <button className="text-button" onClick={() => prepare()}>Reiniciar capítulo</button>}</div>
        <a className="practice-link" href={`${assetPrefix}practice.html`}><Bot size={26} aria-hidden="true" />Practicar mates</a>
        <ChapterMenu catalog={catalog} campaign={campaign} onSelect={chooseChapter} />
      </section> : view === 'setup' ? <section className="dialogue-dock setup-dock" aria-label="Preparar la aventura">
        <h1 ref={headingRef} tabIndex={-1}>¿Quién viaja hoy?</h1>
        {loaded.reset && !progress && <p className="inline-notice">La partida guardada no es compatible o está dañada. Puedes empezar de nuevo.</p>}
        {progress && <p className="inline-notice">Reiniciar este capítulo reemplazará su partida guardada. Los capítulos desbloqueados se conservarán.</p>}
        <button className="name-picker" onClick={() => setEditingName(true)} aria-label={playerName ? `Cambiar nombre: ${playerName}` : 'Escribe tu nombre'}><span>{playerName || 'Escribe tu nombre'}</span><PencilLine size={20} aria-hidden="true" /></button>
        <fieldset className="character-picker"><legend className="sr-only">Elige tu personaje</legend>{(['boy', 'girl'] as const).map(value => <label key={value} className={`character-option ${character === value ? 'selected' : ''}`}><input type="radio" name="character" value={value} checked={character === value} onChange={() => setCharacter(value)} /><span>{value === 'boy' ? 'Niño' : 'Niña'}</span>{character === value && <Check size={17} />}</label>)}</fieldset>
        <details className="maths-choice"><summary>Elegir las cuentas</summary><label className="sr-only" htmlFor="maths-level">Dificultad de matemáticas</label><select id="maths-level" value={mathsLevel} onChange={event => setMathsLevel(Number(event.target.value))}>{levels.map((level, index) => <option key={level.name} value={index}>{level.name}</option>)}</select></details>
        <div className="scene-actions"><button className="primary" onClick={start}>{progress ? 'Comenzar de nuevo' : 'Comenzar'}<ArrowRight size={21} /></button>{progress && <button className="text-button" onClick={home}>Cancelar</button>}</div>
      </section> : scene && progress && <>
        {introduction ? <RobotIntroduction key={progress.sceneId} robot={chapter.robot} introduction={introduction} playerName={progress.playerName} assetPrefix={assetPrefix} onNext={scene.type === 'build' ? () => next(scene.next) : undefined}>
          {scene.type !== 'build' ? <DialogueActions scene={scene} playerName={progress.playerName} onNext={next} onComplete={finish} /> : undefined}
        </RobotIntroduction> : scene.type === 'build' ? <section className="construction-console">
          <h1 ref={headingRef} tabIndex={-1}>{personalize(scene.title, progress.playerName)}</h1>
          <p className="build-instruction">{personalize(scene.instruction, progress.playerName)}</p>
          <BuildActivity key={progress.sceneId} chapter={chapter} scene={scene} progress={progress} sound={preferences.sound}
            onEarn={() => setProgress(previous => previous ? earnPart(previous, chapter) : previous)}
            onPlace={() => { playSound(progress.placedCount === 5 ? 'complete' : 'place', preferences.sound); setProgress(previous => previous ? placePart(previous, chapter) : previous); }}
            onNext={() => next(scene.next)} />
        </section> : scene.type === 'pipes' ? <article className={`pipe-console theme-${scene.theme ?? 'water'}`} key={progress.sceneId}>
          <div className="pipe-story">{scene.theme === 'radio' ? <Radio size={42} aria-hidden="true" /> : <Droplet size={42} aria-hidden="true" />}
            <h1 ref={headingRef} tabIndex={-1}>{personalize(scene.title, progress.playerName)}</h1>
            {scene.paragraphs.map((paragraph, index) => <p key={index}>{personalize(paragraph, progress.playerName)}</p>)}
          </div>
          <PipePuzzle theme={scene.theme} layout={scene.layout} rotations={progress.pipeRotations?.[progress.sceneId] ?? scene.layout.initial} sound={preferences.sound}
            onRotate={(index, turns) => setProgress(previous => previous ? rotatePipe(previous, chapter, index, turns) : previous)} onNext={() => next(scene.next)} />
        </article> : <article className="dialogue-dock reading-dock" key={progress.sceneId} aria-label="Lee la historia">
          <h1 className="sr-only" ref={headingRef} tabIndex={-1}>{personalize(scene.title, progress.playerName)}</h1>
          <div className="story-passage">{scene.paragraphs.map((paragraph, index) => <p key={index}>{personalize(paragraph, progress.playerName)}</p>)}</div>
          <DialogueActions scene={scene} playerName={progress.playerName} onNext={next} onComplete={finish} />
        </article>}
      </>}
    </main>
    {editingName && <TextEntryDialog title="¿Cómo te llamas?" label="Tu nombre" initialValue={playerName} maxLength={playerNameMaxLength} onConfirm={value => { setPlayerName(normalizePlayerName(value)); setEditingName(false); }} onCancel={() => setEditingName(false)} />}
  </div></MotionConfig>;
}
