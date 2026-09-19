import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Clock3, RotateCcw } from 'lucide-react';
import { SiteShell } from '../../components/SiteShell';
import { AnalogClock } from '../../components/clocks/AnalogClock';
import { DigitalClock } from '../../components/clocks/DigitalClock';
import { digitalTime, spokenTime } from '../../components/clocks/time';
import { useSoundPreference } from '../../services/useSoundPreference';
import { playSound } from '../../sound';
import { cookingResult, createMenu, menus, type Recipe } from './recipes';
import { ChefArt, DishArt } from './KitchenArt';
import { ClockHint, DayPeriod } from './ClockHint';
import { DayTimelines } from './DayTimelines';
import { TimePassage } from './TimePassage';
import './time-chef.css';

const dishIcons = { toast: '🍞', pancakes: '🥞', cake: '🍰', soup: '🥣' };

function answerAdvice(answer: number, target: number) {
  if (answer % 720 === target % 720) return 'Las agujas están bien. Mira la mitad del día: la receta es a ' + spokenTime(target).toLowerCase() + '.';
  if (Math.floor(answer / 60) === Math.floor(target / 60)) return 'Mira los minutos: has puesto ' + answer % 60 + ' y la receta pide ' + target % 60 + '.';
  return 'Has puesto ' + digitalTime(answer) + '. La receta es a ' + spokenTime(target).toLowerCase() + '.';
}

export function RecipeRound({ recipe, sound, onNext, last, guided = false }: {
  recipe: Recipe; sound: boolean; onNext: () => void; last: boolean; guided?: boolean;
}) {
  const mode = recipe.clock;
  const [answer, setAnswer] = useState(6 * 60);
  const [result, setResult] = useState<ReturnType<typeof cookingResult> | null>(null);
  const [animating, setAnimating] = useState(false);
  const action = useRef<HTMLButtonElement>(null);
  const minuteStep = recipe.target % 5 === 0 ? 5 : 1;
  useEffect(() => {
    if (result) action.current?.focus({ preventScroll: true });
  }, [result]);
  const finish = useCallback(() => {
    const next = cookingResult(answer, recipe.target);
    setResult(next);
    setAnimating(false);
    playSound(next === 'perfect' ? 'success' : 'tap', sound);
  }, [answer, recipe.target, sound]);
  const failed = result === 'early' || result === 'burned';
  const disabled = result !== null || animating;
  function check() {
    setAnimating(true);
  }
  return <div className="chef-workspace">
    <section className="chef-recipe" aria-labelledby="chef-recipe-title">
      <div className="chef-recipe-heading"><ChefArt /><h2 id="chef-recipe-title">{recipe.name}</h2></div>
      <div className={'chef-order chef-order-' + recipe.format}>
        <span className="chef-order-label">Saca el plato a esta hora:</span>
        {recipe.format === 'digital' ? <><span className="chef-clock-label">Reloj de 24 horas</span><DigitalClock value={recipe.target} /></>
          : recipe.format === 'analog' ? <><span className="chef-clock-label">Reloj de 12 horas</span><AnalogClock value={recipe.target} /></>
          : <strong>{spokenTime(recipe.target)}</strong>}
        <DayPeriod time={recipe.target} />
      </div>
      <div className={'chef-oven is-' + (result ?? 'ready')}><div className="chef-oven-bar"><span /><span /><span /></div><DishArt dish={recipe.dish} state={result ?? 'ready'} /></div>
      {guided && !result && !animating && <ClockHint time={recipe.target} guided={guided} />}
      <p className="sr-only">Saca el plato del fuego a la hora de la receta. No es la duración de la cocción. Todo ocurre en el mismo día.</p>
    </section>
    <section className="chef-controls" aria-labelledby="chef-controls-title">
      <h2 id="chef-controls-title">{animating ? 'Así pasa el tiempo' : mode === 'analog' ? 'Pon la hora' : 'Pon la alarma'}</h2>
      {animating ? <TimePassage answer={answer} clock={mode} onComplete={finish} /> : <div className="chef-time-input">
        <span className="chef-clock-label">{mode === 'analog' ? 'Reloj de 12 horas' : 'Reloj de 24 horas'}</span>
        {mode === 'analog' ? <>
          <DayTimelines value={answer}>
            <AnalogClock value={answer} onChange={setAnswer} disabled={disabled} minuteStep={minuteStep} />
          </DayTimelines>
          <p className="chef-hand-legend"><span>Corta: horas</span><span>Larga: minutos</span></p>
          <p className="chef-touch-cue">Arrastra las agujas. Dos vueltas de 12 horas hacen un día.</p>
          <p className="chef-current-time" aria-live="polite">{spokenTime(answer)}</p>
          <p className="sr-only">Arrastra las agujas o enfócalas y usa las flechas. Escape cancela el arrastre.</p>
        </> : <>
          <DigitalClock value={answer} onChange={setAnswer} disabled={disabled} minuteStep={minuteStep} label="Alarma de cocina" />
          <DayPeriod time={answer} />
          <p className="chef-current-time" aria-live="polite">{spokenTime(answer)}</p>
        </>}
      </div>}
      <div className={'chef-feedback ' + (result ? 'is-' + result : 'sr-only')} role="status" aria-atomic="true">
        {result && <div className="chef-feedback-dish"><DishArt dish={recipe.dish} state={result} /></div>}
        {result === 'perfect' ? <strong>¡En su punto!</strong> : failed ? <><strong>{result === 'burned' ? '¡Quemado! Muy tarde.' : '¡Crudo! Muy pronto.'}</strong><p>{answerAdvice(answer, recipe.target)}</p></> : null}
      </div>
      <div className="chef-actions">
        <button ref={action} className="primary" disabled={animating} onClick={result === 'perfect' ? onNext : failed ? () => setResult(null) : check}>
          {animating ? 'Mira el reloj…' : result === 'perfect' ? last ? 'Mi menú' : 'Siguiente' : failed ? 'Otra vez' : '¡Listo!'}
          {result === 'perfect' ? <ArrowRight size={21} aria-hidden="true" /> : failed ? <RotateCcw size={21} aria-hidden="true" /> : <Check size={21} aria-hidden="true" />}
        </button>
      </div>
    </section>
  </div>;
}

export default function TimeChef() {
  const sound = useSoundPreference();
  const [level, setLevel] = useState(0);
  const [menu, setMenu] = useState(() => createMenu(0));
  const [round, setRound] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const complete = round === menu.recipes.length;
  function reset(nextLevel = level) { setLevel(nextLevel); setMenu(createMenu(nextLevel)); setRound(0); setAttempt(value => value + 1); }
  useEffect(() => { heading.current?.focus(); }, [level, round, attempt]);
  return <SiteShell soundEnabled={sound.enabled} onToggleSound={sound.toggle}>
    <main className="time-chef">
      {sound.saveFailed && <p className="save-warning" role="alert">No se pudo guardar la preferencia de sonido.</p>}
      <header className="chef-heading">
        <h1 ref={heading} tabIndex={-1}>El chef del tiempo</h1>
        <div className="chef-heading-actions"><label><span className="sr-only">Nivel</span><select value={level} onChange={event => reset(Number(event.target.value))}>{menus.map((entry, index) => <option key={entry.name} value={index}>{index + 1} · {entry.name}</option>)}</select></label><button className="icon-button" aria-label="Empezar menú de nuevo" onClick={() => reset()}><RotateCcw size={23} aria-hidden="true" /></button></div>
      </header>
      <p className="chef-hour-fact"><Clock3 size={22} aria-hidden="true" /><strong>1 hora = 60 minutos</strong><span>Una vuelta de la aguja larga.</span></p>
      <ol className="chef-recipe-list" aria-label="Tus cuatro recetas">{menu.recipes.map((recipe, index) => <li key={recipe.dish} className={index < round ? 'is-done' : index === round ? 'is-current' : ''} aria-current={index === round ? 'step' : undefined}>
        <span className="chef-recipe-icon" aria-hidden="true">{dishIcons[recipe.dish]}{index < round && <Check size={18} />}</span>
        <span className="chef-recipe-step">{index === 0 ? 'Con pista' : 'Práctica ' + index}</span>
        <span className="sr-only">{recipe.name}{index < round ? ': servido' : ''}</span>
      </li>)}</ol>
      {complete ? <section className="chef-complete" aria-labelledby="chef-complete-title">
        <h2 id="chef-complete-title">¡Tu menú está servido!</h2><p>Una receta con pista y tres para practicar. ¡Las cuatro listas!</p>
        <div className="chef-served-menu">{menu.recipes.map(recipe => <div key={recipe.dish}><DishArt dish={recipe.dish} state="perfect" /><h3 className="sr-only">{recipe.name}</h3><strong>{digitalTime(recipe.target)}</strong></div>)}</div>
        <button className="primary" onClick={() => reset(level === menus.length - 1 ? 0 : level + 1)}>{level === menus.length - 1 ? 'Volver a jugar' : 'Siguiente nivel'}<ArrowRight size={21} aria-hidden="true" /></button>
      </section> : <RecipeRound key={level + '-' + round + '-' + attempt} recipe={menu.recipes[round]} guided={round === 0} sound={sound.enabled} last={round === menu.recipes.length - 1} onNext={() => { playSound(round === menu.recipes.length - 1 ? 'complete' : 'place', sound.enabled); setRound(value => value + 1); }} />}
    </main>
  </SiteShell>;
}
