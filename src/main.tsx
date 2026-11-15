import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import '@fontsource-variable/instrument-sans/wght.css';
import '@fontsource-variable/geist-mono/wght.css';
import './styles/index.css';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Production builds are prerendered into index.html (scripts/prerender.mjs): hydrate that markup.
// The dev server serves an empty #root: render from scratch.
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
