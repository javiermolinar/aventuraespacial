import { lazy } from 'react';
import { ArrowLeft, House, Volume2, VolumeX } from 'lucide-react';
import { BackgroundMusic } from '../components/BackgroundMusic';
import { DeferredContent } from '../components/DeferredContent';
import { soundtracks } from '../music';
import { useSoundPreference } from '../services/useSoundPreference';
import { SceneArt } from '../adventure/SceneArt';
import { adventureMusic } from '../adventure/music';
import { useAdventureController, type AdventureOptions } from '../adventure/useAdventureController';
import { AdventureHome } from './AdventureHome';
import '../adventure/adventure.css';

const NarrativeView = lazy(() => import('../adventure/NarrativeView'));
const AdventureSetupDialog = lazy(() => import('../adventure/AdventureSetupDialog').then(module => ({ default: module.AdventureSetupDialog })));

/** Site shell stays mounted while narrative and game screens load on demand. */
export default function AdventureSite(options: AdventureOptions) {
  const story = useAdventureController(options);
  const sound = useSoundPreference();
  const { chapter, campaign, progress, view, scene, displayedScene, introduction, displayedIntroduction, building, piping, setupChapterId, setupProfile, reviewScene } = story;
  const assetPrefix = options.entry === 'home' ? './' : '../';

  return <div className={`adventure-experience ${view === 'home' ? 'is-home' : displayedIntroduction ? 'is-introducing' : building ? 'is-building' : piping ? 'is-piping' : 'is-reading'}`}>
    {!displayedIntroduction && <SceneArt chapter={chapter} character={progress?.character ?? campaign.profile.character} image={displayedScene && displayedScene.type !== 'build' && view === 'play' ? displayedScene.image : 'ship'} assetPrefix={assetPrefix} />}
    <BackgroundMusic enabled={sound.enabled && !setupChapterId} src={`${assetPrefix}music/${view === 'home' ? soundtracks.home.file : adventureMusic(displayedScene, displayedIntroduction)}`} />
    <header className="adventure-chrome">
      {view !== 'home' && <nav className="adventure-navigation" aria-label="Navegación de la aventura">
        <button className="chrome-button" disabled={!story.previousId} onClick={story.back} aria-label="Volver atrás" title="Volver atrás"><ArrowLeft size={20} /></button>
        <button className="chrome-button" onClick={story.home} aria-label="Volver al inicio" title="Volver al inicio"><House size={20} /></button>
      </nav>}
      <button className="chrome-button" onClick={sound.toggle} aria-label={sound.enabled ? 'Desactivar sonido' : 'Activar sonido'} aria-pressed={sound.enabled}>{sound.enabled ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
    </header>
    {(story.saveFailed || sound.saveFailed) && <div className="experience-notices" role="status">
      {story.saveFailed && <p>No se puede guardar el progreso en este navegador. Puedes jugar, pero los cambios no se conservarán al salir.</p>}
      {sound.saveFailed && <p>No se puede guardar la preferencia de sonido.</p>}
    </div>}
    <main className={building ? 'construction-stage' : piping ? 'pipe-stage' : 'cinematic-stage'}>
      {view === 'home' ? <AdventureHome catalog={story.catalog} campaign={campaign} hasProgress={Boolean(progress)} finishedRun={story.finishedRun}
        reset={story.reset} setupOpen={Boolean(setupChapterId)} practiceHref={`${assetPrefix}practice.html`}
        onContinue={() => story.chooseChapter(chapter.id)} onRestart={() => story.prepare()} onSelect={story.chooseChapter} /> : scene && progress && <DeferredContent key={chapter.id}>
        <NarrativeView chapter={chapter} progress={progress} scene={scene} introduction={introduction} reviewId={story.reviewId} reviewScene={reviewScene}
          assetPrefix={assetPrefix} sound={sound.enabled} onNext={story.next} onComplete={story.finish} onReviewNext={story.reviewNext}
          onEarn={story.earn} onPlace={story.place} onRotate={story.rotate} />
      </DeferredContent>}
    </main>
    {setupChapterId && <DeferredContent key={setupChapterId}><AdventureSetupDialog initialName={setupProfile.playerName}
      initialCharacter={Object.keys(campaign.chapters).length ? setupProfile.character : null} replacing={Boolean(campaign.chapters[setupChapterId])}
      onStart={story.start} onCancel={story.cancelSetup} /></DeferredContent>}
  </div>;
}
