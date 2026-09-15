import { useEffect, useRef, useState } from 'react';
import { AlarmClock, ArrowRight, Check, Clock3, Lightbulb, Moon, RotateCcw, Sun } from 'lucide-react';
import { SiteShell } from '../../components/SiteShell';
import { AnalogClock, type ClockHand } from '../../components/clocks/AnalogClock';
import { DigitalClock } from '../../components/clocks/DigitalClock';
import { digitalTime, normalizeTime, spokenTime } from '../../components/clocks/time';
import { useSoundPreference } from '../../services/useSoundPreference';
import { playSound } from '../../sound';
import { cookingResult, menus, type Recipe } from './recipes';
import { ChefArt, DishArt } from './KitchenArt';
import './time-chef.css';

const dishIcons = { pancakes: '🥞', cake: '🍰', soup: '🥣' };
function DayIcon({ time }: { time: number }) {
  return time < 360 || time >= 1200 ? <Moon size={20} aria-hidden="true" /> : <Sun size={20} aria-hidden="true" />;
}

function ClockLesson() {
  const [time, setTime] = useState(7 * 60);
  return <details className="chef-lesson"><summary>Juega con las 24 h</summary>
    <div className="chef-lesson-demo">
      <AnalogClock value={time} onChange={setTime} />
      <span className="chef-equals" aria-hidden="true">=</span>
      <div className="chef-lesson-digital"><DigitalClock value={time} onChange={setTime} label="Reloj de prueba" /><button className="secondary" onClick={() => setTime(normalizeTime(time + 720))}><RotateCcw size={18} aria-hidden="true" />+12 h</button></div>
    </div>
    <label className="chef-day-slider"><span className="sr-only">Recorre un día</span><input type="range" min="0" max="23" value={Math.floor(time / 60)} onChange={event => setTime(Number(event.target.value) * 60 + time % 60)} aria-label="Hora del día" aria-valuetext={`${digitalTime(time)}, ${spokenTime(time)}`} /></label>
    <div className="chef-day-labels"><span>🌙 00</span><span>☀️ 12</span><span>23 🌙</span></div>
    <p className="sr-only">La aguja corta da dos vueltas al día. Las 00:00 son medianoche; las 12:00, mediodía. Pulsa +12 h para ver la misma posición de las agujas doce horas después.</p>
  </details>;
}

export function RecipeRound({ recipe, sound, onNext, last }: { recipe: Recipe; sound: boolean; onNext: () => void; last: boolean }) {
  const [mode, setMode] = useState<'analog' | 'digital'>(recipe.format === 'analog' ? 'digital' : 'analog');
  const [hand, setHand] = useState<ClockHand>('hour');
  const [answer, setAnswer] = useState(6 * 60);
  const [result, setResult] = useState<ReturnType<typeof cookingResult> | null>(null);
  const [hint, setHint] = useState(false);
  const action = useRef<HTMLButtonElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    action.current?.focus({ preventScroll: true });
  }, [result]);
  const failed = result === 'early' || result === 'burned';
  const disabled = result !== null;
  function check() {
    const next = cookingResult(answer, recipe.target);
    setResult(next);
    setHint(false);
    playSound(next === 'perfect' ? 'success' : 'tap', sound);
  }
  return <div className="chef-workspace">
    <section className="chef-recipe" aria-labelledby="chef-recipe-title">
      <div className="chef-recipe-heading"><ChefArt /><h2 id="chef-recipe-title">{recipe.name}</h2></div>
      <div className={`chef-order chef-order-${recipe.format}`}>
        <span className="chef-order-label">A las…</span>
        {recipe.format === 'digital' ? <DigitalClock value={recipe.target} /> : recipe.format === 'analog' ? <><AnalogClock value={recipe.target} /><span className="chef-order-period"><Sun size={18} aria-hidden="true" />Por la tarde</span></> : <strong>{spokenTime(recipe.target)}</strong>}
      </div>
      <div className={`chef-oven is-${result ?? 'ready'}`}><div className="chef-oven-bar"><span /><span /><span /></div><DishArt dish={recipe.dish} state={result ?? 'ready'} /></div>
      <p className="sr-only">Saca el plato del fuego a la hora de la receta. No es la duración de la cocción. Todo ocurre en el mismo día. La cocina solo avanza al confirmar.</p>
    </section>
    <section className="chef-controls" aria-labelledby="chef-controls-title">
      <h2 id="chef-controls-title">{mode === 'analog' ? 'Pon la hora' : 'Pon la alarma'}</h2>
      {recipe.format === 'words' && <div className="chef-mode" role="group" aria-label="Tipo de reloj"><button disabled={disabled} aria-label="Agujas" aria-pressed={mode === 'analog'} onClick={() => setMode('analog')}><Clock3 size={21} aria-hidden="true" /></button><button disabled={disabled} aria-label="Alarma digital" aria-pressed={mode === 'digital'} onClick={() => setMode('digital')}><AlarmClock size={21} aria-hidden="true" /></button></div>}
      <div className="chef-time-input">
        {mode === 'analog' ? <>
          <AnalogClock value={answer} onChange={setAnswer} disabled={disabled} activeHand={hand} onActiveHandChange={setHand} />
          <div className="chef-hand-picker" role="group" aria-label="Aguja para tocar los números">
            <button disabled={disabled} aria-pressed={hand === 'hour'} onClick={() => setHand('hour')}><span aria-hidden="true">↗</span>Horas</button>
            <button disabled={disabled} aria-pressed={hand === 'minute'} onClick={() => setHand('minute')}><span aria-hidden="true">↗</span>Minutos</button>
          </div>
          <p className="chef-touch-cue">Toca un número o arrastra.</p>
          <div className="chef-period" role="group" aria-label="Mitad del día">
            {[0, 720].map(offset => {
              const time = answer % 720 + offset;
              return <button key={offset} disabled={disabled} aria-label={`${offset === 0 ? 'Antes del mediodía' : 'Desde el mediodía'}: ${digitalTime(time)}`} aria-pressed={Math.floor(answer / 720) === offset / 720} onClick={() => setAnswer(time)}><DayIcon time={time} />{digitalTime(time)}</button>;
            })}
          </div>
          <p className="sr-only" aria-live="polite">{spokenTime(answer)}</p>
          <p className="sr-only">Elige Horas o Minutos y toca un número. También puedes arrastrar las agujas o enfocarlas y usar las flechas. Escape cancela el arrastre.</p>
        </> : <><AlarmClock className="chef-alarm-icon" size={38} aria-hidden="true" /><DigitalClock value={answer} onChange={setAnswer} disabled={disabled} label="Alarma de cocina" /></>}
      </div>
      <div className={`chef-feedback ${result ? `is-${result}` : 'sr-only'}`} role="status" aria-atomic="true">
        {result && <div className="chef-feedback-dish"><DishArt dish={recipe.dish} state={result} /></div>}
        {result === 'perfect' ? <strong>¡En su punto!</strong> : failed ? <strong>{result === 'burned' ? '¡Quemado! Muy tarde.' : '¡Crudo! Muy pronto.'}</strong> : null}
      </div>
      <div className="chef-actions">
        <button ref={action} className="primary" onClick={result === 'perfect' ? onNext : failed ? () => { setResult(null); setHint(true); } : check}>
          {result === 'perfect' ? last ? 'Mi menú' : 'Siguiente' : failed ? 'Otra vez' : '¡Listo!'}{result === 'perfect' ? <ArrowRight size={21} aria-hidden="true" /> : failed ? <RotateCcw size={21} aria-hidden="true" /> : <Check size={21} aria-hidden="true" />}
        </button>
        {!result && <button className="icon-button chef-hint-button" onClick={() => setHint(value => !value)} aria-label="Una pista" aria-expanded={hint}><Lightbulb size={23} aria-hidden="true" /></button>}
      </div>
      {hint && !result && <div className="chef-hint" role="group" aria-label="Pista: dos relojes, la misma hora"><AnalogClock value={recipe.target} /><span className="chef-equals" aria-hidden="true">=</span><DigitalClock value={recipe.target} /></div>}
    </section>
  </div>;
}

export default function TimeChef() {
  const sound = useSoundPreference();
  const [level, setLevel] = useState(0);
  const [round, setRound] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const menu = menus[level];
  const complete = round === menu.recipes.length;
  function reset(nextLevel = level) { setLevel(nextLevel); setRound(0); setAttempt(value => value + 1); }
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [level, round, attempt]);
  return <SiteShell soundEnabled={sound.enabled} onToggleSound={sound.toggle}>
    <main className="time-chef">
      {sound.saveFailed && <p className="save-warning" role="alert">No se pudo guardar la preferencia de sonido.</p>}
      <header className="chef-heading"><h1 ref={heading} tabIndex={-1}>El chef del tiempo</h1><div className="chef-heading-actions"><label><span className="sr-only">Nivel</span><select value={level} onChange={event => reset(Number(event.target.value))}>{menus.map((entry, index) => <option key={entry.name} value={index}>{index + 1} · {entry.name}</option>)}</select></label><button className="icon-button" aria-label="Empezar menú de nuevo" onClick={() => reset()}><RotateCcw size={23} aria-hidden="true" /></button></div></header>
      <ol className="chef-recipe-list" aria-label="Tus tres recetas">{menu.recipes.map((recipe, index) => <li key={recipe.dish} className={index < round ? 'is-done' : index === round ? 'is-current' : ''} aria-current={index === round ? 'step' : undefined}><span aria-hidden="true">{dishIcons[recipe.dish]}</span><span className="sr-only">{recipe.name}{index < round ? ': servido' : ''}</span>{index < round && <Check size={18} aria-hidden="true" />}</li>)}</ol>
      {complete ? <section className="chef-complete" aria-labelledby="chef-complete-title"><h2 id="chef-complete-title">¡Tu menú está servido!</h2><div className="chef-served-menu">{menu.recipes.map(recipe => <div key={recipe.dish}><DishArt dish={recipe.dish} state="perfect" /><h3 className="sr-only">{recipe.name}</h3><strong>{digitalTime(recipe.target)}</strong></div>)}</div><button className="primary" onClick={() => reset(level === menus.length - 1 ? 0 : level + 1)}>{level === menus.length - 1 ? 'Volver a jugar' : 'Siguiente nivel'}<ArrowRight size={21} aria-hidden="true" /></button></section> : <RecipeRound key={`${level}-${round}-${attempt}`} recipe={menu.recipes[round]} sound={sound.enabled} last={round === menu.recipes.length - 1} onNext={() => { playSound(round === menu.recipes.length - 1 ? 'complete' : 'place', sound.enabled); setRound(value => value + 1); }} />}
      <ClockLesson />
    </main>
  </SiteShell>;
}
