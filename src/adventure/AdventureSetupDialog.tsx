import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import type { Character } from './types';
import { normalizePlayerName, playerNameMaxLength } from './personalization';
import '../components/text-entry-dialog.css';
import './adventure-setup-dialog.css';

/** Draft-only setup: the existing campaign is untouched until Empezar. */
export function AdventureSetupDialog({ initialName, initialCharacter, replacing, onStart, onCancel }: {
  initialName: string; initialCharacter: Character | null; replacing: boolean;
  onStart: (name: string, character: Character) => void; onCancel: () => void;
}) {
  const [step, setStep] = useState<'name' | 'character'>('name');
  const [name, setName] = useState(initialName);
  const [character, setCharacter] = useState(initialCharacter);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const choiceRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const validName = normalizePlayerName(name).length > 0 && name.length <= playerNameMaxLength;

  useEffect(() => {
    const dialog = dialogRef.current!;
    const opener = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    if (step === 'name') { inputRef.current?.focus(); inputRef.current?.select(); }
    else choiceRef.current?.focus();
  }, [step]);

  return <dialog ref={dialogRef} className="text-entry-dialog adventure-setup-dialog" aria-labelledby={`${id}-title`}
    onCancel={event => { event.preventDefault(); onCancel(); }} onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input');
      const first = controls[0], last = controls[controls.length - 1];
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    }}>
    <form onSubmit={event => {
      event.preventDefault();
      if (!validName) return;
      if (step === 'name') setStep('character');
      else if (character) onStart(normalizePlayerName(name), character);
    }}>
      <header>
        {step === 'character' && <button type="button" className="text-entry-close" aria-label="Anterior" onClick={() => setStep('name')}><ArrowLeft size={21} /></button>}
        <h2 id={`${id}-title`}>{step === 'name' ? '¿Cómo te llamas?' : '¿Niño o niña?'}</h2>
        <button type="button" className="text-entry-close" aria-label="Cancelar" onClick={onCancel}><X size={21} /></button>
      </header>
      {step === 'name' ? <>
        <label className="sr-only" htmlFor={`${id}-name`}>Tu nombre</label>
        <input ref={inputRef} id={`${id}-name`} type="text" value={name} onChange={event => setName(event.target.value)} maxLength={playerNameMaxLength} autoComplete="off" enterKeyHint="next" required />
      </> : <div className="setup-characters" role="group" aria-label="Elige tu personaje">
        {(['boy', 'girl'] as const).map(value => <button key={value} ref={value === (character ?? 'boy') ? choiceRef : undefined} type="button" aria-pressed={character === value} onClick={() => setCharacter(value)}>
          {value === 'boy' ? 'Niño' : 'Niña'}{character === value && <Check size={22} aria-hidden="true" />}
        </button>)}
      </div>}
      {replacing && <p className="setup-warning">Al empezar se reemplazará la partida de este capítulo. Los capítulos desbloqueados se conservarán.</p>}
      <button type="submit" className="primary" disabled={!validName || (step === 'character' && !character)}>{step === 'name' ? 'Siguiente' : 'Empezar'}<ArrowRight size={20} /></button>
    </form>
  </dialog>;
}
