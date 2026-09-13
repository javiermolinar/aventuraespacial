import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Check, Delete, PackageOpen } from 'lucide-react';
import { columnAnswer, needsExchange, needsTens, operationLabel, regroupUnits, resultOf, type Operation } from '../../lib/maths';
import { playSound } from '../../sound';
import { CarryNumbers, tensLabel } from './CarryNumbers';
import './math-puzzle.css';

function Cubes({ count, tone = 'purple', removed = 0 }: { count: number; tone?: 'purple' | 'gold'; removed?: number }) {
  return <div className="cubes" aria-label={`${count - removed} unidades${removed ? `, ${removed} tachadas` : ''}`}>
    {Array.from({ length: count }, (_, index) => <motion.span layout initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: index * 0.018 }} className={`cube ${tone} ${index >= count - removed ? 'removed' : ''}`} key={index} />)}
    {count === 0 && <span className="zero-blocks">0</span>}
  </div>;
}

function Rods({ count, removed = 0 }: { count: number; removed?: number }) {
  return <div className="rods" aria-label={`${count - removed} decenas${removed ? `, ${removed} tachadas` : ''}`}>
    {Array.from({ length: count }, (_, index) => <motion.span layout initial={{ y: -15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} key={index} className={`rod ${index >= count - removed ? 'removed' : ''}`}>
      {Array.from({ length: 10 }, (_, i) => <i key={i} />)}
    </motion.span>)}
    {count === 0 && <span className="zero-blocks">0</span>}
  </div>;
}

function CountingBlocks({ operation, exchanged, column }: { operation: Operation; exchanged: boolean; column: 'ones' | 'tens' }) {
  const { a, b, operator } = operation;
  const aOnes = a % 10, bOnes = b % 10;
  const isAddition = operator === '+';
  const exchange = needsExchange(operation);
  const aTens = Math.floor(a / 10), bTens = Math.floor(b / 10);
  return <div className="blocks-area" aria-label={column === 'ones' ? 'Bloques de unidades' : 'Barras de decenas'}>
    {column === 'ones' ? (
      isAddition ? <div className="block-equation"><Cubes count={aOnes} /><span className="block-sign">+</span><Cubes count={bOnes} tone="gold" /></div>
      : <div className="subtraction-blocks"><Cubes count={aOnes + (exchanged ? 10 : 0)} removed={exchange && !exchanged ? 0 : bOnes} />{exchange && !exchanged && <span className="exchange-caption">Necesitamos {bOnes} unidades.</span>}</div>
    ) : isAddition ? <div className="block-equation"><Rods count={aTens} /><span className="block-sign">+</span><Rods count={bTens} /></div> : <Rods count={aTens - (exchange ? 1 : 0)} removed={bTens} />}
  </div>;
}

export function MathPuzzle({ operation, partName, sound, onSolved }: { operation: Operation; partName: string; sound: boolean; onSolved: () => void }) {
  const [column, setColumn] = useState<'ones' | 'tens'>('ones');
  const [digit, setDigit] = useState('');
  const [exchanged, setExchanged] = useState(false);
  const [incorrect, setIncorrect] = useState(false);
  const [regrouping, setRegrouping] = useState(false);
  const [carrySelected, setCarrySelected] = useState(false);
  const carryTarget = useRef<HTMLButtonElement>(null);
  const tensAnswer = useRef<HTMLSpanElement>(null);
  const finishedRef = useRef(false);
  const exchange = needsExchange(operation);
  const tens = needsTens(operation);
  const isAddition = operation.operator === '+';
  const simpleAddition = isAddition && operation.a < 10 && operation.b < 10;
  const numericCarry = isAddition && !simpleAddition && exchange;
  const countingOnes = numericCarry && !exchanged && column === 'ones';
  const mustExchange = exchange && !exchanged && !isAddition;
  const onesTotal = operation.a % 10 + operation.b % 10;
  const carry = regroupUnits(onesTotal);
  // A complete simple sum and an intermediate column sum are different answers.
  const expected = simpleAddition ? resultOf(operation) : countingOnes ? onesTotal : columnAnswer(operation, column);
  const onesResult = columnAnswer(operation, 'ones');
  const aTens = Math.floor(operation.a / 10);
  const bTens = Math.floor(operation.b / 10);

  const enterDigit = (value: string) => {
    if (finishedRef.current || mustExchange || regrouping) return;
    setDigit(previous => (!simpleAddition && !countingOnes) || incorrect || previous.length >= 2 || previous === '0' ? value : previous + value);
    setIncorrect(false);
    playSound('tap', sound);
  };

  const check = () => {
    if (!digit || finishedRef.current || mustExchange || regrouping) return;
    if (Number(digit) !== expected) { setIncorrect(true); return; }
    playSound('success', sound);
    if (simpleAddition) {
      finishedRef.current = true;
      onSolved();
      return;
    }
    if (countingOnes) {
      setRegrouping(true);
      setIncorrect(false);
      return;
    }
    if (column === 'ones' && tens) {
      setColumn('tens');
      setDigit('');
      setIncorrect(false);
    } else {
      finishedRef.current = true;
      onSolved();
    }
  };

  const placeCarry = () => {
    if (!regrouping) return;
    setExchanged(true);
    setRegrouping(false);
    setCarrySelected(false);
    // The accepted units sum already supplies its result digit. Carrying moves
    // directly to the tens; never ask the child to type the units again.
    setColumn('tens');
    setDigit('');
    playSound('exchange', sound);
  };

  useEffect(() => {
    if (exchanged && numericCarry) tensAnswer.current?.focus({ preventScroll: true });
  }, [exchanged, numericCarry]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      // Native dialogs make the workshop inert; don't let global shortcuts bypass that.
      if (document.querySelector('dialog[open]')) return;
      const target = event.target as HTMLElement;
      if (target.matches('input, textarea, select') || event.ctrlKey || event.metaKey || event.altKey) return;
      if (/^[0-9]$/.test(event.key)) { event.preventDefault(); enterDigit(event.key); }
      else if ((event.key === 'Backspace' || event.key === 'Delete') && !regrouping) { event.preventDefault(); setDigit(''); setIncorrect(false); }
      else if (event.key === 'Enter' && !target.closest('button, a')) { event.preventDefault(); check(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  return <div className={`math-puzzle ${!tens ? 'single-column' : ''} ${numericCarry ? 'has-numeric-carry' : ''} ${regrouping ? 'is-regrouping' : ''}`}>
    <h2>Consigue {partName}</h2>
    {simpleAddition ? <div className="simple-sum" aria-label={`Suma: ${operationLabel(operation)}`}><span>{operation.a}</span><span className="simple-sign">+</span><span>{operation.b}</span><span className="simple-sign">=</span><span className={`answer-box ${incorrect ? 'incorrect' : ''}`} aria-label="Respuesta de la suma">{digit || '?'}</span></div> : <div className="column-board" aria-label={`Operación en columnas: ${operationLabel(operation)}`}>
      <div className="column-labels"><span /><span className={column === 'tens' || regrouping ? 'active' : ''}>Decenas</span><span className={column === 'ones' && !regrouping ? 'active' : ''}>Unidades</span></div>
      <div className="column-numbers">
        <div className={`column-glow ${regrouping ? 'tens' : column}`} />
        <div className="carry-row"><span /><span>{regrouping && <button ref={carryTarget} className={`carry-target ${carrySelected ? 'selected' : ''}`} aria-label="Decenas: colocar la llevada" onClick={() => { if (carrySelected) placeCarry(); }}>↓</button>}{exchanged && isAddition && <b className="carry-number" aria-label={`Llevamos ${tensLabel(carry.tens)}`}>{carry.tens}</b>}{exchanged && !isAddition && <motion.b initial={{ scale: 0 }} animate={{ scale: 1 }} className="carry-number">{aTens - 1}</motion.b>}</span><span>{exchanged && !isAddition && <motion.b initial={{ scale: 0 }} animate={{ scale: 1 }} className="carry-number borrowed">{operation.a % 10 + 10}</motion.b>}</span></div>
        <div className="number-row"><span /><span className={exchanged && !isAddition ? 'crossed-number' : ''}>{aTens || ''}</span><span className={exchanged && !isAddition ? 'crossed-number' : ''}>{operation.a % 10}</span></div>
        <div className="number-row"><span className="operator">{operation.operator}</span><span>{bTens || ''}</span><span>{operation.b % 10}</span></div>
        <div className="sum-line" />
        <div className="answer-row"><span /><span>{column === 'tens' ? <span ref={tensAnswer} tabIndex={-1} className={`answer-box ${incorrect ? 'incorrect' : ''}`} aria-label="Respuesta de las decenas">{digit || '?'}</span> : tens ? <span className="answer-placeholder">·</span> : null}</span><span>{column === 'ones' && !regrouping ? <span className={countingOnes ? 'answer-placeholder' : `answer-box ${incorrect ? 'incorrect' : ''}`} aria-label="Respuesta de las unidades">{countingOnes ? '·' : digit || '?'}</span> : <span className="answered-digit" aria-label="Respuesta de las unidades">{onesResult}<Check size={15} /></span>}</span></div>
      </div>
    </div>}
    {countingOnes && <div className="intermediate-sum" aria-label="Cálculo de las unidades"><span>{operation.a % 10} + {operation.b % 10} =</span><span className={`answer-box ${incorrect ? 'incorrect' : ''}`} aria-label="Suma de las unidades">{digit || '?'}</span></div>}
    {regrouping ? <CarryNumbers total={onesTotal} selected={carrySelected} onSelect={setCarrySelected} onCarry={placeCarry} target={carryTarget} /> : numericCarry ?
      column === 'ones' ? <p className="carry-prompt">Suma las unidades antes de separar las decenas.</p> : <section className="numeric-help" aria-label="Cálculo de las decenas">
        <p>Suma las decenas, incluida la llevada.</p>
        <div className="tens-calculation" aria-label={`${aTens} + ${bTens} + ${carry.tens} decenas`}><span>{aTens}</span><span>+</span><span>{bTens}</span><span>+</span><strong>{carry.tens}</strong></div>
      </section> : <CountingBlocks operation={operation} exchanged={exchanged} column={column} />}
    {regrouping ? null : mustExchange ? <div className="exchange-controls"><p>1 decena = 10 unidades</p><button className="primary exchange-button" onClick={() => { setExchanged(true); playSound('exchange', sound); }}><PackageOpen size={23} />Cambiar una decena<ArrowRight size={22} /></button></div> : <>
      {incorrect && <p className="retry-message" role="status">{numericCarry ? 'Revisa los números y prueba otra vez.' : 'Cuenta los bloques y prueba otra vez.'}</p>}
      <div className="keypad" role="group" aria-label="Elige tu respuesta">
        {Array.from({ length: 10 }, (_, index) => (index + 1) % 10).map(n => <button key={n} aria-label={`Número ${n}`} className={digit === String(n) ? 'chosen' : ''} onClick={() => enterDigit(String(n))}>{n}</button>)}
      </div>
      <div className="answer-controls"><button className="erase-key" aria-label="Borrar respuesta" disabled={!digit} onClick={() => { setDigit(''); setIncorrect(false); }}><Delete size={25} /></button><button className="primary check-button" disabled={!digit} onClick={check}>Comprobar<ArrowRight size={23} /></button></div>
    </>}
    <span className="sr-only" aria-live="polite">{simpleAddition ? '' : regrouping ? `El ${carry.ones} queda en las unidades. Lleva ${tensLabel(carry.tens)} a las decenas.` : column === 'tens' ? numericCarry ? `Llevamos ${tensLabel(carry.tens)}. Ahora suma las decenas.` : 'Ahora, las decenas.' : exchanged ? 'Hemos cambiado una decena por diez unidades.' : ''}</span>
  </div>;
}
