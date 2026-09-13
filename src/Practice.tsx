import { ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';
import { levelExamples, levels, loadProgress, operationLabel } from './game';
import { RobotPortrait } from './games/robot-lab/RobotArtwork';
import { soundtracks } from './music';
import './styles/landing.css';

/** Maths-only selection preserves the existing practice collection and level URLs. */
export default function Practice() {
  const [progress] = useState(loadProgress);
  return <div className="landing-page">
    <header className="landing-header"><a className="brand-link" href="./index.html"><img src="./favicon.svg" width="42" height="42" alt="" /><span>Una aventura espacial</span></a><a className="practice-home" href="./index.html">Volver al inicio</a></header>
    <main className="landing-main">
      <div className="landing-intro"><span className="landing-sparkle" aria-hidden="true">✦</span><h1>Vamos a jugar.</h1><p>Elige tus cuentas y practica a tu ritmo.</p></div>
      <section className="collection-section" aria-labelledby="collection-title"><h2 id="collection-title">Tus robots</h2><div className="collected-robots">{levels.map((level, index) => {
        const revealed = Boolean(progress.completed[String(index)]);
        return <div className={`collection-robot ${revealed ? 'collected-robot' : 'robot-silhouette'}`} key={level.robot}><div className="collection-portrait" aria-hidden="true"><RobotPortrait color={level.color} design={level.design} complete={revealed} /></div><h3>{level.robot}</h3><span className="sr-only">{revealed ? 'Conseguido' : 'Por descubrir'}</span></div>;
      })}</div></section>
      <section className="game-picker" aria-labelledby="robot-game-title">
        <div className="game-picker-heading"><div className="game-mark" aria-hidden="true">🤖</div><div><h2 id="robot-game-title">El taller de robots</h2><p>Sumas y restas, pieza a pieza.</p></div><span className="game-category">MATEMÁTICAS</span></div>
        <div className="level-grid">{levels.map((level, index) => <a className="level-card" key={level.robot} href={`./games/robot-lab.html?level=${index + 1}`} aria-label={`Nivel ${index + 1}: ${level.name}`}>
          <div className="level-card-top"><span>Nivel {index + 1}</span>{progress.completed[String(index)] && <span className="level-completed" aria-label="Completado"><Check size={18} /></span>}</div>
          <div className="level-preview" style={{ background: `${level.color}25` }}><RobotPortrait color={level.color} design={level.design} /></div>
          <h3>{level.name}</h3><p>{level.description}</p><div className="level-card-bottom"><strong>{operationLabel(levelExamples[index])}</strong><span className="play-arrow"><ArrowRight size={20} /></span></div>
        </a>)}</div>
      </section>
      <details className="parent-info"><summary>Para familias</summary><p>Empezamos con sumas y restas sencillas. Las sumas con llevadas se practican por separado en el nivel 4. Las restas con llevadas, más difíciles, tienen su propio nivel 6 y no aparecen en la práctica mixta. Cada operación resuelta da una pieza para construir un robot. No hay cronómetro, vidas ni penalizaciones.</p><p>Los robots terminados se guardan en este navegador, no entre dispositivos. Salir o recargar reinicia el puzzle en curso. El sonido es opcional. También se puede jugar con el teclado: números para responder y tabulador para moverse entre botones. Para colocar una pieza sin arrastrar, selecciónala y después selecciona su silueta.</p></details>
      <details className="parent-info music-credits"><summary>Créditos de música</summary><p>Música de Kevin MacLeod (incompetech.com), con licencia <a href="https://creativecommons.org/licenses/by/4.0/">Creative Commons Atribución 4.0</a>:</p><ul>{Object.values(soundtracks).map(track => <li key={track.isrc}><a href={`https://incompetech.com/music/royalty-free/index.html?isrc=${track.isrc}`}>{track.title}</a></li>)}</ul><p>Audio convertido a MP3 de 96 kbps. <a href="./music/ATTRIBUTION.txt">Créditos completos</a>.</p></details>
    </main>
  </div>;
}
