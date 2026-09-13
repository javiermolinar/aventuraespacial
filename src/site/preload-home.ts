import { chapterCatalog } from '../adventure/chapters/catalog';
import { preloadHomeArtwork } from './home-artwork';

// A separate async entry lets artwork start before React's larger module graph is ready.
// Preview must not read real saves or speculate about a different chapter's artwork.
if (!(import.meta.env.DEV && new URLSearchParams(window.location.search).has('chapter-preview'))) {
  try { preloadHomeArtwork(chapterCatalog); }
  catch { /* A resource hint must never prevent normal rendering or save-error handling. */ }
}
