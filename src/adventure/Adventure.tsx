import { useEffect, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { ArrowLeft, ArrowRight, Droplet, House, Radio, Volume2, VolumeX } from 'lucide-react';
import { loadProgress, saveProgress } from '../game';
import { BackgroundMusic } from '../components/BackgroundMusic';
import { AdventureSetupDialog } from './AdventureSetupDialog';
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
import { StoryReview, type ReadingScene } from './StoryReview';
import { adventureMusic } from './music';
import { personalize } from './personalization';
import { BuildActivity, DialogueActions } from './Activities';
import './adventure.css';

type View = 'home' | 'play';

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
  const [view, setView] = useState<View>(() => entry === 'play' && progress ? 'play' : 'home');
  const [setupChapterId, setSetupChapterId] = useState<string | null>(() => entry === 'play' && !progress ? chapter.id : null);
  const setupProfile = setupChapterId ? campaign.chapters[setupChapterId] ?? campaign.profile : campaign.profile;
  const [preferences, setPreferences] = useState(loadProgress);
  const [saveFailed, setSaveFailed] = useState(loaded.unavailable);
  const [soundSaveFailed, setSoundSaveFailed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const liveSceneRef = useRef<HTMLDivElement>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const readingHistory = progress?.history.filter(id => !['build', 'pipes'].includes(chapter.scenes[id].type)) ?? [];
  const reviewIndex = reviewId === null ? -1 : readingHistory.indexOf(reviewId);
  const reviewScene = reviewIndex < 0 ? null : chapter.scenes[reviewId!] as ReadingScene;
  const previousId = readingHistory[(reviewScene ? reviewIndex : readingHistory.length) - 1];
  const scene = progress ? chapter.scenes[progress.sceneId] : null;
  const displayedScene = reviewScene ?? scene;
  const introduction = view !== 'play' || !scene ? undefined : scene.type === 'build'
    ? progress?.placedCount === 6 ? chapter.robot.introduction : undefined
    : scene.robotIntroduction ? { title: scene.title, paragraphs: scene.paragraphs, artwork: scene.robotIntroduction.artwork } : undefined;
  const displayedIntroduction = reviewScene ? Boolean(reviewScene.robotIntroduction) : Boolean(introduction);
  const building = view === 'play' && !reviewScene && scene?.type === 'build' && !introduction;
  const piping = view === 'play' && !reviewScene && scene?.type === 'pipes';
  const assetPrefix = entry === 'home' ? './' : '../';

  useEffect(() => {
    // Do not overwrite a damaged save or create an empty campaign before the player starts.
    if (Object.keys(campaign.chapters).length) setSaveFailed(!saveCampaign(campaign));
  }, [campaign]);
  useEffect(() => {
    if (setupChapterId || reviewScene) return;
    const heading = view === 'play' ? liveSceneRef.current?.querySelector('h1') : headingRef.current;
    heading?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [chapter.id, progress?.sceneId, view, reviewId]);

  const toggleSound = () => {
    const next = { ...loadProgress(), sound: !preferences.sound };
    setPreferences(next);
    setSoundSaveFailed(!saveProgress(next));
    playSound('tap', next.sound);
  };
  const next = (id: string) => setProgress(previous => previous ? moveTo(previous, chapter, id) : previous);
  const start = (name: string, character: Character) => {
    const selected = catalog.find(item => item.id === setupChapterId)?.chapter;
    if (!selected || !chapterUnlocked(campaign, catalog, selected.id)) return;
    setCampaign(previous => recordChapter(previous, catalog, newAdventure(selected, setupProfile.mathsLevel, character, name)));
    setSetupChapterId(null);
    setView('play');
  };
  const prepare = (id = chapter.id) => setSetupChapterId(id);
  const chooseChapter = (id: string) => {
    const selected = catalog.find(item => item.id === id)?.chapter;
    if (!selected || !chapterUnlocked(campaign, catalog, id)) return;
    const saved = campaign.chapters[id];
    if (!saved || (campaign.completed.includes(id) && selected.scenes[saved.sceneId].type === 'ending')) prepare(id);
    else { setCampaign(previous => selectChapter(previous, catalog, id)); setView('play'); }
  };
  const home = () => { setReviewId(null); setView('home'); };
  const reviewNext = () => setReviewId(readingHistory[reviewIndex + 1] ?? null);
  const finish = () => { setCampaign(previous => completeChapter(previous, catalog, chapter.id)); setView('home'); };
  const finishedRun = progress && scene?.type === 'ending' && campaign.completed.includes(chapter.id);

  return <MotionConfig reducedMotion="user"><div className={`adventure-experience ${view === 'home' ? 'is-home' : displayedIntroduction ? 'is-introducing' : building ? 'is-building' : piping ? 'is-piping' : 'is-reading'}`}>
    {!displayedIntroduction && <SceneArt chapter={chapter} character={progress?.character ?? campaign.profile.character} image={displayedScene && displayedScene.type !== 'build' && view === 'play' ? displayedScene.image : 'ship'} assetPrefix={assetPrefix} />}
    <BackgroundMusic enabled={preferences.sound && !setupChapterId} src={`${assetPrefix}music/${view === 'home' ? soundtracks.home.file : adventureMusic(displayedScene, displayedIntroduction)}`} />
    <header className="adventure-chrome">
      {view !== 'home' && <nav className="adventure-navigation" aria-label="Navegación de la aventura">
        <button className="chrome-button" disabled={!previousId} onClick={() => setReviewId(previousId)} aria-label="Volver atrás" title="Volver atrás"><ArrowLeft size={20} /></button>
        <button className="chrome-button" onClick={home} aria-label="Volver al inicio" title="Volver al inicio"><House size={20} /></button>
      </nav>}
      <button className="chrome-button" onClick={toggleSound} aria-label={preferences.sound ? 'Desactivar sonido' : 'Activar sonido'} aria-pressed={preferences.sound}>{preferences.sound ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
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
        <ChapterMenu catalog={catalog} campaign={campaign} onSelect={chooseChapter} practiceHref={`${assetPrefix}practice.html`} />
      </section> : scene && progress && <>
        <div className="live-scene" ref={liveSceneRef} hidden={Boolean(reviewScene)} inert={Boolean(reviewScene)}>
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
        </div>
        {reviewScene && <StoryReview key={reviewId} chapter={chapter} scene={reviewScene} playerName={progress.playerName} assetPrefix={assetPrefix} onNext={reviewNext} />}
      </>}
    </main>
    {setupChapterId && <AdventureSetupDialog key={setupChapterId} initialName={setupProfile.playerName}
      initialCharacter={Object.keys(campaign.chapters).length ? setupProfile.character : null} replacing={Boolean(campaign.chapters[setupChapterId])}
      onStart={start} onCancel={() => setSetupChapterId(null)} />}
  </div></MotionConfig>;
}
