import { useEffect, useRef, useState } from 'react';
import { motion, MotionConfig } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, Hand, PartyPopper, RotateCcw } from 'lucide-react';
import { getOperations, levels, loadProgress, operationLabel, parts, resultOf, saveProgress, type PartId } from '../../game';
import { Factory } from './Factory';
import { conveyorDuration } from './useConveyor';
import { MathPuzzle } from '../../components/maths/MathPuzzle';
import { SiteShell } from '../../components/SiteShell';
import { BackgroundMusic } from '../../components/BackgroundMusic';
import { playSound } from '../../sound';
import './robot-lab.css';

function initialLevel() {
  const value = Number(new URLSearchParams(window.location.search).get('level'));
  return Number.isInteger(value) && value >= 1 && value <= levels.length ? value - 1 : 0;
}

export default function RobotLab() {
  const [progress, setProgress] = useState(loadProgress);
  const [level] = useState(initialLevel);
  const [round, setRound] = useState(0);
  const [operations, setOperations] = useState(() => getOperations(level));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [earned, setEarned] = useState<PartId[]>([]);
  const [placed, setPlaced] = useState<PartId[]>(level === 0 ? ['leftLeg', 'rightLeg'] : []);
  const [saveFailed, setSaveFailed] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [pieceExpired, setPieceExpired] = useState(false);
  const completedRef = useRef(false);
  const config = levels[level];
  const activeParts = parts.slice(0, config.pieceCount);
  const selectedPart = activeParts[selectedIndex];
  const selectedOperation = operations[selectedIndex];
  const placedCount = activeParts.filter(part => placed.includes(part.id)).length;
  const complete = placedCount === activeParts.length;
  const ready = earned.includes(selectedPart.id) && !placed.includes(selectedPart.id);

  useEffect(() => { setSaveFailed(!saveProgress(progress)); }, [progress]);

  const replay = () => {
    setRound(round + 1);
    setOperations(getOperations(level));
    setSelectedIndex(0);
    setEarned([]);
    setPlaced(level === 0 ? ['leftLeg', 'rightLeg'] : []);
    completedRef.current = false;
    setAnnouncement('');
    setPieceExpired(false);
  };

  const placePart = () => {
    if (!ready || complete) return;
    const nextPlaced = [...placed, selectedPart.id];
    setPlaced(nextPlaced);
    if (activeParts.every(part => nextPlaced.includes(part.id))) {
      if (!completedRef.current) {
        completedRef.current = true;
        setProgress(previous => ({ ...previous, completed: { ...previous.completed, [level]: (previous.completed[String(level)] || 0) + 1 } }));
      }
      playSound('complete', progress.sound);
      setAnnouncement(`¡Has construido a ${config.robot}!`);
    } else {
      playSound('place', progress.sound);
      setAnnouncement('¡Pieza colocada!');
      setSelectedIndex(activeParts.findIndex(part => !nextPlaced.includes(part.id)));
    }
  };

  const toggleSound = () => {
    const enabled = !progress.sound;
    setProgress(previous => ({ ...previous, sound: enabled }));
    playSound('tap', enabled);
  };

  return <MotionConfig reducedMotion="user"><SiteShell soundEnabled={progress.sound} onToggleSound={toggleSound}>
    <BackgroundMusic enabled={progress.sound} />
    <main className={`robot-lab ${ready ? 'piece-ready' : ''}`}>
      {saveFailed && <div className="save-warning" role="status">No se puede guardar el progreso en este navegador.</div>}
      <div className="page-heading"><h1>{complete ? `¡Hola, ${config.robot}!` : `Construye a ${config.robot}`}</h1><span className="level-label">Nivel {level + 1}</span></div>
      <div className="workshop-grid">
        <Factory placed={placed} selected={selectedPart.id} ready={ready} color={config.color} design={config.design} complete={complete} activeParts={activeParts} onPlace={placePart} travelMs={conveyorDuration(level)} onExpire={() => {
          setEarned(previous => previous.filter(id => id !== selectedPart.id));
          setPieceExpired(true);
          setAnnouncement('');
        }} />
        <section className="activity-panel" aria-label="Resuelve la operación">
          <>
            {complete ? <motion.div key="complete" className="completion-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <span className="celebration-icon"><PartyPopper size={48} /></span><h2>¡Lo has conseguido!</h2>
              <a autoFocus className="primary" href={level < levels.length - 1 ? `./robot-lab.html?level=${level + 2}` : '../practice.html'}>Otro robot<ArrowRight size={23} /></a><button className="text-button" onClick={replay}><RotateCcw size={18} />Otra vez</button>
            </motion.div> : ready ? <motion.div key={`earned-${selectedPart.id}`} className="earned-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <span className="success-label"><Check size={22} />{operationLabel(selectedOperation)} = {resultOf(selectedOperation)}</span><Hand className="drag-instruction-icon" size={62} /><h2>Coloca {selectedPart.name}</h2><ArrowLeft className="point-to-factory" size={38} />
            </motion.div> : <motion.div key={`puzzle-${round}-${selectedIndex}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
              {pieceExpired && <p className="conveyor-retry" role="status">¡Se fue la pieza! Resuelve otra vez para recuperarla.</p>}
              <MathPuzzle operation={selectedOperation} partName={selectedPart.name} sound={progress.sound} onSolved={() => { setPieceExpired(false); setEarned(previous => previous.includes(selectedPart.id) ? previous : [...previous, selectedPart.id]); setAnnouncement(`¡Has conseguido ${selectedPart.name}!`); }} />
            </motion.div>}
          </>
        </section>
      </div>
    </main>
    <div className="sr-only" aria-live="polite">{announcement}</div>
  </SiteShell></MotionConfig>;
}
