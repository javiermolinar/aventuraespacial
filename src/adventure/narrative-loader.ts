type NarrativeModule = typeof import('./NarrativeView');
let pending: Promise<NarrativeModule> | undefined;
let loaded: NarrativeModule | undefined;

/** Share the download and expose a fulfilled module without another suspense round-trip. */
export function loadNarrativeView(): Promise<NarrativeModule> {
  return pending ??= import('./NarrativeView').then(module => {
    loaded = module;
    return module;
  }).catch(error => {
    pending = undefined;
    throw error;
  });
}

export function prefetchedNarrativeView() { return loaded?.default; }

export function prefetchNarrativeView() {
  // Speculation must not interrupt setup, show an error, or change the saved run.
  void loadNarrativeView().catch(() => {});
}
