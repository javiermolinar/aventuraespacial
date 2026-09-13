import { Component, Suspense, type ReactNode } from 'react';

/** Keep navigation and saved state mounted if an on-demand download fails. */
export class DeferredContent extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }

  render() {
    if (this.state.failed) return <section className="loading-panel" role="alert">
      <p>No se ha podido cargar esta pantalla. Comprueba la conexión y recarga la página.</p>
      <button className="secondary" onClick={() => window.location.reload()}>Recargar página</button>
    </section>;
    return <Suspense fallback={<p className="loading-panel" role="status">Cargando…</p>}>{this.props.children}</Suspense>;
  }
}
