import { ArrowRight, Droplets, Radio } from 'lucide-react';
import { connectionGames } from './levels';
import '../../styles/connections-picker.css';

export function ConnectionsPicker() {
  return <div className="connections-picker">{(['water', 'radio'] as const).map(theme => {
    const game = connectionGames[theme];
    const Icon = theme === 'water' ? Droplets : Radio;
    return <section key={theme} className={`connections-card connections-card-${theme}`} aria-labelledby={`connections-title-${theme}`}>
      <div className="connections-card-top"><span className="connections-card-category">LÓGICA Y CONEXIONES</span><span className="connections-card-badge">6 retos</span></div>
      <div className="connections-card-art" aria-hidden="true">
        <svg viewBox="0 0 240 86"><g className="connections-art-grid">{Array.from({ length: 12 }, (_, index) => <rect key={index} x={24 + index % 6 * 32} y={9 + Math.floor(index / 6) * 34} width="29" height="31" rx="5" />)}</g><path className="connections-art-rim" d="M 8 24 H 70 Q 86 24 86 40 V 44 Q 86 58 102 58 H 134 Q 150 58 150 42 V 40 Q 150 24 166 24 H 232" /><path className="connections-art-flow" d="M 8 24 H 70 Q 86 24 86 40 V 44 Q 86 58 102 58 H 134 Q 150 58 150 42 V 40 Q 150 24 166 24 H 232" /><circle cx="8" cy="24" r="6" /><circle cx="232" cy="24" r="6" /></svg>
        <span><Icon size={31} /></span>
      </div>
      <h2 id={`connections-title-${theme}`}>{game.title}</h2><p>{game.description}</p>
      <div className="connections-card-bottom"><span>3 × 3 → 5 × 5<br /><strong>De inicio a experto</strong></span><a className="primary" href={`./games/connections.html?theme=${theme}`}>Jugar<ArrowRight size={20} aria-hidden="true" /></a></div>
    </section>;
  })}</div>;
}
