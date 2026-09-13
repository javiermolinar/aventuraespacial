import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import './text-entry-dialog.css';

export type TextEntryDialogProps = {
  title: string;
  label: string;
  initialValue?: string;
  maxLength?: number;
  multiline?: boolean;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
};

/** Mount to open. The caller owns persistence and decides what the submitted text means. */
export function TextEntryDialog({ title, label, initialValue = '', maxLength = 200, multiline = false, confirmLabel = 'Guardar', onConfirm, onCancel }: TextEntryDialogProps) {
  const [draft, setDraft] = useState(initialValue);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const id = useId();
  const value = draft.trim();
  const valid = value.length > 0 && draft.length <= maxLength;

  useEffect(() => {
    const dialog = dialogRef.current!;
    const opener = document.activeElement;
    dialog.showModal();
    fieldRef.current?.focus();
    fieldRef.current?.select();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return <dialog ref={dialogRef} className="text-entry-dialog" aria-labelledby={`${id}-title`} onCancel={event => { event.preventDefault(); onCancel(); }} onKeyDown={event => {
    if (event.key !== 'Tab') return;
    const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea');
    const first = controls[0], last = controls[controls.length - 1];
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  }}>
    <form onSubmit={event => { event.preventDefault(); if (valid) onConfirm(value); }}>
      <header><h2 id={`${id}-title`}>{title}</h2><button type="button" className="text-entry-close" aria-label="Cancelar" onClick={onCancel}><X size={21} /></button></header>
      <label className="sr-only" htmlFor={`${id}-field`}>{label}</label>
      {multiline ? <textarea ref={element => { fieldRef.current = element; }} id={`${id}-field`} value={draft} onChange={event => setDraft(event.target.value)} maxLength={maxLength} rows={4} required /> : <input ref={element => { fieldRef.current = element; }} id={`${id}-field`} type="text" value={draft} onChange={event => setDraft(event.target.value)} maxLength={maxLength} autoComplete="off" enterKeyHint="done" required />}
      <button type="submit" className="primary" disabled={!valid}>{confirmLabel}<ArrowRight size={20} /></button>
    </form>
  </dialog>;
}
