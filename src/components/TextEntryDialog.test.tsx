// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TextEntryDialog } from './TextEntryDialog';

beforeEach(() => {
  // Native focus trapping is covered in Playwright; jsdom has no showModal implementation.
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value(this: HTMLDialogElement) { this.open = true; } },
    close: { configurable: true, value(this: HTMLDialogElement) { this.open = false; } },
  });
});
afterEach(() => { cleanup(); Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal'); Reflect.deleteProperty(HTMLDialogElement.prototype, 'close'); });

it('blocks blank and over-limit submissions and returns trimmed text', () => {
  const confirm = vi.fn();
  render(<TextEntryDialog title="¿Cómo te llamas?" label="Tu nombre" maxLength={24} onConfirm={confirm} onCancel={vi.fn()} />);
  const field = screen.getByRole('textbox', { name: 'Tu nombre' });
  const form = field.closest('form')!;
  expect(document.activeElement).toBe(field);
  fireEvent.change(field, { target: { value: '   ' } });
  expect((screen.getByRole('button', { name: 'Guardar' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.submit(form);
  fireEvent.change(field, { target: { value: 'a'.repeat(25) } });
  fireEvent.submit(form);
  expect(confirm).not.toHaveBeenCalled();
  fireEvent.change(field, { target: { value: ' Lucía ' } });
  fireEvent.submit(form);
  expect(confirm).toHaveBeenCalledWith('Lucía');
});

it('supports longer writing without losing internal newlines', () => {
  const confirm = vi.fn();
  render(<TextEntryDialog title="Escribe tu relato" label="Tu relato" multiline maxLength={500} initialValue="Chispa" confirmLabel="Enviar" onConfirm={confirm} onCancel={vi.fn()} />);
  const field = screen.getByRole('textbox', { name: 'Tu relato' });
  expect(field.tagName).toBe('TEXTAREA');
  expect(field.getAttribute('maxlength')).toBe('500');
  fireEvent.change(field, { target: { value: '  Construí a Chispa.\nDespués reparamos la radio.  ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  expect(confirm).toHaveBeenCalledWith('Construí a Chispa.\nDespués reparamos la radio.');
});

it('cancels without submitting and restores focus to its opener on unmount', () => {
  const cancel = vi.fn(), confirm = vi.fn();
  const opener = document.createElement('button');
  document.body.append(opener);
  opener.focus();
  const view = render(<TextEntryDialog title="Tu nombre" label="Tu nombre" onConfirm={confirm} onCancel={cancel} />);
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }));
  expect(cancel).toHaveBeenCalledOnce();
  expect(confirm).not.toHaveBeenCalled();
  view.unmount();
  expect(document.activeElement).toBe(opener);
  opener.remove();
});
