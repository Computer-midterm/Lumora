// Build-time only: renders the page to static HTML so the content is in index.html itself
// (readable without JavaScript, and painted before the script loads). See scripts/prerender.mjs.
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';
import { POSTER_SIZES } from './components/ScrollSequence';
import { frameSrcSet, SEQUENCE } from './sequence/config';

export function render(): string {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

/** Values for the poster <link rel="preload"> in the document head. */
export const posterPreload = {
  srcset: frameSrcSet(SEQUENCE.frames[0], 'avif'),
  sizes: POSTER_SIZES,
};
