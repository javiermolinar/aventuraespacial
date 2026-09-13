// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AdventureSetupDialog } from './AdventureSetupDialog';

beforeEach(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value(this: HTMLDialogElement) { this.open = true; } },
    close: { configurable: true, value(this: HTMLDialogElement) { this.open = false; } },
  });
});
afterEach(() => { cleanup(); Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal'); Reflect.deleteProperty(HTMLDialogElement.prototype, 'close'); });

it('asks only for name then character, and commits only after Empezar', () => {
  const start = vi.fn();
  const { container } = render(<AdventureSetupDialog initialName="" initialCharacter={null} replacing={false} onStart={start} onCancel={vi.fn()} />);
  const input = screen.getByRole('textbox', { name: 'Tu nombre' });
  expect(document.activeElement).toBe(input);
  expect(screen.queryByRole('button', { name: 'Niño' })).toBeNull();
  expect(container.querySelector('select, details, [role="tab"]')).toBeNull();
  for (const value of ['   ', 'a'.repeat(25)]) {
    fireEvent.change(input, { target: { value } });
    expect((screen.getByRole('button', { name: 'Siguiente' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(input.closest('form')!);
    expect(screen.getByRole('textbox')).toBeTruthy();
  }
  fireEvent.change(input, { target: { value: '  Ana   María ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Niño' }));
  expect((screen.getByRole('button', { name: 'Empezar' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Niña' }));
  expect(screen.getByRole('button', { name: 'Niña' }).getAttribute('aria-pressed')).toBe('true');
  expect(start).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
  expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('  Ana   María ');
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  fireEvent.click(screen.getByRole('button', { name: 'Empezar' }));
  expect(start).toHaveBeenCalledExactlyOnceWith('Ana María', 'girl');
});

it('prefills replay details, warns about replacement, and cancels without starting', () => {
  const start = vi.fn(), cancel = vi.fn();
  const opener = document.createElement('button');
  document.body.append(opener);
  opener.focus();
  const view = render(<AdventureSetupDialog initialName="Lucía" initialCharacter="girl" replacing onStart={start} onCancel={cancel} />);
  expect(screen.getByText(/Los capítulos desbloqueados se conservarán/)).toBeTruthy();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Mateo' } });
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(screen.getByRole('button', { name: 'Niña' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
  expect(cancel).toHaveBeenCalledOnce();
  expect(start).not.toHaveBeenCalled();
  view.unmount();
  expect(document.activeElement).toBe(opener);
  opener.remove();
});
