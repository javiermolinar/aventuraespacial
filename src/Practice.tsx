import { ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';
import { levelExamples, levels, loadProgress, operationLabel } from './game';
import { RobotPortrait } from './games/robot-lab/RobotArtwork';
import { ConnectionsPicker } from './games/connections/ConnectionsPicker';
import './styles/landing.css';
import './styles/shape-game-picker.css';
import './styles/time-chef-picker.css';
import './styles/laser-rats-picker.css';
import './styles/ten-lines-picker.css';
import './styles/resistor-board-picker.css';

/** Standalone games preserve the existing practice collection and level URLs. */
export default function Practice() {
  const [progress] = useState(loadProgress);
  return <div className="landing-page">
    <header className="landing-header"><a className="brand-link" href="./index.html"><img src="./favicon.svg" width="42" height="42" alt="" /><span>Una aventura espacial</span></a><a className="practice-home" href="./index.html">Volver al inicio</a></header>
    <main className="landing-main">
      <div className="landing-intro"><span className="landing-sparkle" aria-hidden="true">✦</span><h1>Vamos a jugar.</h1><p>Elige un juego y practica a tu ritmo.</p></div>
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
      <section className="ten-lines-picker" aria-labelledby="ten-lines-title">
        <div className="ten-lines-picker-art" aria-hidden="true">{[1, 5, 6, 3, 2, 3, 4, 5, 1].map((value, index) => <span key={index}>{value}</span>)}</div>
        <div><span className="ten-lines-picker-category">SUMAS Y LÓGICA</span><h2 id="ten-lines-title">Diez líneas</h2><p>Intercambia las fichas y consigue que cada fila y cada columna sume 10.</p></div>
        <a className="primary" href="./games/ten-lines.html">Jugar<ArrowRight size={20} aria-hidden="true" /></a>
      </section>
      <section className="resistor-picker" aria-labelledby="resistor-picker-title">
        <svg className="resistor-picker-art" viewBox="0 0 120 84" aria-hidden="true">
          <rect width="120" height="84" rx="14" fill="#175a42" /><rect x="3" y="3" width="114" height="78" rx="11" fill="none" stroke="#d1a85a" strokeWidth="2" />
          <path d="M16 42H34M34 42V20H72V42M34 42V64H72V42M72 42H86" fill="none" stroke="#d1a85a" strokeWidth="4" strokeLinejoin="round" />
          <circle cx="34" cy="42" r="5" fill="#edca81" /><circle cx="72" cy="42" r="5" fill="#edca81" />
          <rect x="45" y="14" width="18" height="12" rx="6" fill="#e8d3a2" stroke="#805f2d" strokeWidth="1.5" /><rect x="45" y="58" width="18" height="12" rx="6" fill="#d9a46d" stroke="#805f2d" strokeWidth="1.5" />
          <circle cx="99" cy="42" r="11" fill="#ffe184" /><path d="M93 42H97L99 38L102 46L104 42H106" fill="none" stroke="#805f2d" strokeWidth="1.6" />
        </svg>
        <div><span className="resistor-picker-category">LÓGICA Y SUMAS</span><h2 id="resistor-picker-title">El circuito impreso</h2><p>Coloca cables y resistencias para que la bombilla reciba justo las chispas que necesita. Siete placas.</p></div>
        <a className="primary" href="./games/resistor-board.html">Jugar<ArrowRight size={20} aria-hidden="true" /></a>
      </section>
      <ConnectionsPicker />
      <section className="shape-game-picker" aria-labelledby="shape-game-title">
        <div className="shape-game-art" aria-hidden="true"><span /><span /><span /><span /><span /><span /></div>
        <div><span className="shape-game-category">FORMAS Y ESPACIO</span><h2 id="shape-game-title">¡Todo encaja!</h2><p>Arrastra, gira y encaja todas las piezas en la caja. Seis retos, sin cronómetro.</p></div>
        <a className="primary" href="./games/shape-box.html">Jugar<ArrowRight size={20} aria-hidden="true" /></a>
      </section>
      <section className="laser-rats-picker" aria-labelledby="laser-rats-title">
        <div className="laser-rats-picker-art" aria-hidden="true">✣</div>
        <div><span className="laser-rats-category">LÓGICA Y ESPACIO</span><h2 id="laser-rats-title">La patrulla láser</h2><p>Descubre casillas seguras y coloca tus robots. ¡Que no quede ninguna rata!</p></div>
        <a className="primary" href="./games/laser-rats.html">Jugar<ArrowRight size={20} aria-hidden="true" /></a>
      </section>
      <section className="time-chef-picker" aria-labelledby="time-chef-title">
        <div className="time-chef-picker-art" aria-hidden="true">👨‍🍳<span>08:00</span></div>
        <div><span className="time-chef-category">EL RELOJ Y LAS 24 HORAS</span><h2 id="time-chef-title">El chef del tiempo</h2><p>Cuatro recetas: una con pista y tres para practicar. ¡Mueve las agujas y sirve en su punto!</p></div>
        <a className="primary" href="./games/time-chef.html">Jugar<ArrowRight size={20} aria-hidden="true" /></a>
      </section>
    </main>
  </div>;
}
