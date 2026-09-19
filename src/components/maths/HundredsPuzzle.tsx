import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Delete } from 'lucide-react';
import { operationLabel, resultOf, type Operation } from '../../lib/maths';
import { playSound } from '../../sound';

const names = ['unidades', 'decenas', 'centenas'];
const digitAt = (value: number, place: number) => Math.floor(value / 10 ** place) % 10;

/** Three-digit practice shares the workshop's solve contract and keypad. */
export function HundredsPuzzle({ operation, partName, sound, onSolved }: { operation: Operation; partName: string; sound: boolean; onSolved: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const finished = useRef(false);
  const [place, setPlace] = useState(0);
  const [answer, setAnswer] = useState('');
  const [incorrect, setIncorrect] = useState(false);
  const [top, setTop] = useState(() => names.map((_, i) => digitAt(operation.a, i)));
  const [carries, setCarries] = useState([0, 0, 0]);
  const [carryPending, setCarryPending] = useState(false);
  const addition = operation.operator === '+';
  const extra = (operation.extraAddends ?? []).map(n => digitAt(n, place));
  const bottom = digitAt(operation.b, place);
  const borrow = !addition && top[place] < bottom;
  const total = addition ? top[place] + bottom + extra.reduce((sum, n) => sum + n, 0) + carries[place] : top[place] - bottom;
  const expected = addition ? total : digitAt(resultOf(operation), place);
  const donor = borrow ? top.findIndex((value, i) => i > place && value > 0) : -1;
  const borrowText = donor === place + 1
    ? `1 ${donor === 1 ? 'decena' : 'centena'} = 10 ${names[place]}`
    : '1 centena = 10 decenas; 1 decena = 10 unidades';

  function enter(value: string) {
    if (finished.current || borrow || carryPending) return;
    setAnswer(previous => incorrect || previous.length >= 2 || previous === '0' ? value : previous + value);
    setIncorrect(false); playSound('tap', sound);
  }
  function advance() {
    setAnswer(''); setIncorrect(false);
    if (place === 2) { finished.current = true; onSolved(); }
    else setPlace(place + 1);
  }
  function check() {
    if (!answer || finished.current || borrow || carryPending) return;
    if (Number(answer) !== expected) { setIncorrect(true); return; }
    playSound('success', sound);
    if (addition && total >= 10) setCarryPending(true);
    else advance();
  }
  function exchange() {
    if (!borrow || donor < 0) return;
    const next = [...top]; next[donor]--;
    for (let i = donor - 1; i > place; i--) next[i] = 9;
    next[place] += 10;
    setTop(next); playSound('exchange', sound);
  }
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (root.current?.closest('[hidden], [inert]') || document.querySelector('dialog[open]')) return;
      const target = event.target as HTMLElement;
      if (target.matches('input, textarea, select') || event.ctrlKey || event.metaKey || event.altKey) return;
      if (/^[0-9]$/.test(event.key)) { event.preventDefault(); enter(event.key); }
      else if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); setAnswer(''); setIncorrect(false); }
      else if (event.key === 'Enter' && !target.closest('button, a')) { event.preventDefault(); check(); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  return <div ref={root} className="math-puzzle hundreds-puzzle">
    <h2>Consigue {partName}</h2>
    <div className="column-board" aria-label={`Operación en columnas: ${operationLabel(operation)}`}>
      <div className="column-labels"><span />{[2, 1, 0].map(i => <span key={i} className={place === i ? 'active' : ''}>{names[i]}</span>)}</div>
      <div className="carry-row"><span />{[2, 1, 0].map(i => <span key={i}>{addition ? carries[i] > 0 && <b className="carry-number" aria-label={`Llevada de ${names[i]}`}>{carries[i]}</b> : top[i] !== digitAt(operation.a, i) && <b className="carry-number" aria-label={`${names[i]} tras cambiar`}>{top[i]}</b>}</span>)}</div>
      <div className="number-row"><span />{[2, 1, 0].map(i => <span key={i} className={!addition && top[i] !== digitAt(operation.a, i) ? 'crossed-number' : ''}>{digitAt(operation.a, i)}</span>)}</div>
      <div className="number-row"><span className="operator">{operation.operator}</span>{[2, 1, 0].map(i => <span key={i}>{digitAt(operation.b, i)}</span>)}</div>
      {(operation.extraAddends ?? []).map((value, index) => <div className="number-row" key={index}><span className="operator">+</span>{[2, 1, 0].map(i => <span key={i}>{digitAt(value, i)}</span>)}</div>)}
      <div className="sum-line" />
      <div className="answer-row"><span />{[2, 1, 0].map(i => <span key={i}>{i < place || (i === place && carryPending) ? <span className="answered-digit">{digitAt(resultOf(operation), i)}</span> : i === place ? <span className={`answer-box ${incorrect ? 'incorrect' : ''}`} aria-label={`Respuesta de las ${names[i]}`}>{addition && total >= 10 ? '·' : answer || '?'}</span> : <span className="answer-placeholder">·</span>}</span>)}</div>
    </div>
    <section className="numeric-help" aria-live="polite">
      <p>{borrow ? borrowText : carryPending ? `El ${total % 10} queda en las ${names[place]}. Llevamos ${Math.floor(total / 10)} a las ${names[place + 1]}.` : `Ahora, las ${names[place]}.`}</p>
      {!borrow && !carryPending && <div className="tens-calculation"><span>{top[place]} {operation.operator} {bottom}{extra.map(n => ` + ${n}`).join('')}{addition && carries[place] ? ` + ${carries[place]}` : ''} =</span><span aria-label={`Cálculo de las ${names[place]}`}>{answer || '?'}</span></div>}
    </section>
    {borrow ? <div className="exchange-controls"><button className="primary exchange-button" onClick={exchange}>Cambiar una {donor === 2 ? 'centena' : 'decena'}<ArrowRight /></button></div> : carryPending ? <div className="exchange-controls"><button className="primary exchange-button" onClick={() => { const next = [...carries]; next[place + 1] = Math.floor(total / 10); setCarries(next); setCarryPending(false); playSound('exchange', sound); advance(); }}>Llevar {Math.floor(total / 10)} a las {names[place + 1]}<ArrowRight /></button></div> : <>
      {incorrect && <p className="retry-message" role="status">Revisa los números y prueba otra vez.</p>}
      <div className="keypad" role="group" aria-label="Elige tu respuesta">{Array.from({ length: 10 }, (_, i) => (i + 1) % 10).map(n => <button key={n} aria-label={`Número ${n}`} onClick={() => enter(String(n))}>{n}</button>)}</div>
      <div className="answer-controls"><button className="erase-key" aria-label="Borrar respuesta" disabled={!answer} onClick={() => { setAnswer(''); setIncorrect(false); }}><Delete /></button><button className="primary check-button" disabled={!answer} onClick={check}>Comprobar<ArrowRight /></button></div>
    </>}
  </div>;
}
