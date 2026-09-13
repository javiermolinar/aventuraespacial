import { useState } from 'react';
import type { Chapter, Character, Illustration } from './types';

/** Use the chapter's establishing shot until a location has its own artwork. */
export function SceneArt({ image = 'ship', chapter, character, assetPrefix = '../' }: { image?: Illustration; chapter: Chapter; character: Character; assetPrefix?: './' | '../' }) {
  const artwork = (chapter.artwork[image] ?? chapter.artwork.ship)[character];
  const [failed, setFailed] = useState(false);
  return <>
    <div className="cinematic-backdrop" aria-hidden="true">
      <picture>
        <source media="(orientation: portrait)" srcSet={artwork.portrait.replace('../', assetPrefix)} />
        <img key={artwork.landscape} src={artwork.landscape.replace('../', assetPrefix)} alt="" fetchPriority="high" onError={() => setFailed(true)} onLoad={() => setFailed(false)} />
      </picture>
    </div>
    {failed && <p className="art-warning" role="status">La ilustración no se ha podido cargar. Puedes seguir leyendo.</p>}
  </>;
}
