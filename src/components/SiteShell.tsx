import type { ReactNode } from 'react';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';

/** Minimal game frame. Game selection and other navigation belong on the landing page. */
export function SiteShell({ soundEnabled, onToggleSound, children, exitHref = '../practice.html' }: {
  exitHref?: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  children: ReactNode;
}) {
  return <div className="site-shell game-shell">
    <header className="game-header">
      <a className="exit-button" href={exitHref}><ArrowLeft size={21} />Salir</a>
      <button className="icon-button" onClick={onToggleSound} aria-label={soundEnabled ? 'Desactivar sonido' : 'Activar sonido'} aria-pressed={soundEnabled}>{soundEnabled ? <Volume2 size={23} /> : <VolumeX size={23} />}</button>
    </header>
    {children}
  </div>;
}
