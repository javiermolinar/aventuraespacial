import { lazy, useState, type ComponentProps } from 'react';
import type NarrativeView from '../adventure/NarrativeView';
import { loadNarrativeView, prefetchedNarrativeView } from '../adventure/narrative-loader';

const LazyNarrativeView = lazy(loadNarrativeView);

export function NarrativeScreen(props: ComponentProps<typeof NarrativeView>) {
  // A warm screen can render synchronously. Keep its component type fixed for the
  // whole play session, including cold starts, so sound/review updates never reset an answer.
  const [View] = useState(() => prefetchedNarrativeView() ?? LazyNarrativeView);
  return <View {...props} />;
}
