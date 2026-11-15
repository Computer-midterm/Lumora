// Prerenders the page into dist/index.html after `vite build`.
// Result: the full content (and frame 001) is in the HTML, visible before and without JavaScript.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'dist', 'index.html');

const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { render, posterPreload } = await vite.ssrLoadModule('/src/entry-server.tsx');
  const body = render();
  let html = await readFile(file, 'utf8');
  if (!html.includes('<div id="root"></div>')) throw new Error('dist/index.html has no empty #root to fill');
  html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  const preload = `<link rel="preload" as="image" type="image/avif" imagesrcset="${posterPreload.srcset}" imagesizes="${posterPreload.sizes}" fetchpriority="high" />`;
  if (!html.includes('<!--poster-preload-->')) throw new Error('dist/index.html is missing the <!--poster-preload--> marker');
  html = html.replace('<!--poster-preload-->', preload);
  await writeFile(file, html);
  console.log(`Prerendered dist/index.html (${(body.length / 1024).toFixed(1)} KB of markup)`);
} finally {
  await vite.close();
}
