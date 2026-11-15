// Review screenshots of the local build in Microsoft Edge (via Playwright, no browser download).
//
//   npm run build && npm run preview      (in one terminal)
//   npm run screenshots                   (in another)
//
// Writes docs/screenshots/*.png and docs/screenshots/index.html (open it to review everything at once).

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'docs', 'screenshots');
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4180/';

const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const RETINA = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };

/** [file, label, context options, position]. Position: sequence progress (number), '#id', 'closing', 'menu' or 'tab:<name>'. */
const SHOTS = [
  ['desktop-01-hero-frame001', 'Desktop 1440 — first screen (frame 001)', DESKTOP, 0],
  ['desktop-02-headline-over-art', 'Desktop — the headline crossing the artwork as it scrolls', DESKTOP, 0.12],
  ['desktop-03-chapter-one', 'Desktop — first chapter', DESKTOP, 0.25],
  ['desktop-04-chapter-two', 'Desktop — second chapter', DESKTOP, 0.43],
  ['desktop-05-full-bleed', 'Desktop — full-bleed', DESKTOP, 0.7],
  ['desktop-06-ink-rising', 'Desktop — ink rising over the closing frames', DESKTOP, 0.93],
  ['desktop-07-frame201', 'Desktop — end of sequence (frame 201)', DESKTOP, 1],
  ['desktop-08-problem', 'Desktop — The problem', DESKTOP, '#problem'],
  ['desktop-09-approach', 'Desktop — The approach (planned)', DESKTOP, '#approach'],
  ['desktop-10-workspace-contract', 'Desktop — Workspace concept: contract', DESKTOP, '#workspace'],
  ['desktop-11-workspace-run', 'Desktop — Workspace concept: test run', DESKTOP, 'tab:Test run'],
  ['desktop-12-workspace-report', 'Desktop — Workspace concept: report', DESKTOP, 'tab:Report'],
  ['desktop-13-status', 'Desktop — Status', DESKTOP, '#status'],
  ['desktop-14-closing', 'Desktop — Closing', DESKTOP, 'closing'],
  ['retina-hero-2x', 'Desktop at 2x density — first screen (3840 rest frame)', RETINA, 0],
  ['wide-1920-hero', 'Desktop 1920×1080 — first screen', { viewport: { width: 1920, height: 1080 } }, 0],
  ['laptop-1366-hero', 'Laptop 1366×768 — first screen', { viewport: { width: 1366, height: 768 } }, 0],
  ['laptop-1024-hero', 'Laptop 1024×768 — first screen', { viewport: { width: 1024, height: 768 } }, 0],
  ['tablet-768-hero', 'Tablet 768×1024 — first screen', { ...PHONE, viewport: { width: 768, height: 1024 } }, 0],
  ['phone-01-hero', 'Phone 390 — first screen', PHONE, 0],
  ['phone-02-sequence', 'Phone — scrolling (captions pass under the image)', PHONE, 0.3],
  ['phone-03-full', 'Phone — immersed', PHONE, 0.7],
  ['phone-04-problem', 'Phone — The problem', PHONE, '#problem'],
  ['phone-05-approach', 'Phone — The approach', PHONE, '#approach'],
  ['phone-06-workspace', 'Phone — Workspace concept', PHONE, '#workspace'],
  ['phone-07-status', 'Phone — Status', PHONE, '#status'],
  ['phone-08-closing', 'Phone — Closing', PHONE, 'closing'],
  ['phone-09-menu', 'Phone — menu open', PHONE, 'menu'],
  ['phone-320-hero', 'Narrow phone 320×568 — first screen', { ...PHONE, viewport: { width: 320, height: 568 } }, 0],
  ['reduced-motion-desktop', 'Reduced motion — desktop (still frame, no pinning)', { ...DESKTOP, reducedMotion: 'reduce' }, 0],
  ['reduced-motion-phone', 'Reduced motion — phone', { ...PHONE, reducedMotion: 'reduce' }, 0],
  ['no-js-desktop', 'JavaScript disabled — desktop', { ...DESKTOP, javaScriptEnabled: false }, 0],
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
try {
  const probe = await fetch(BASE).catch(() => null);
  if (!probe?.ok) throw new Error(`No server at ${BASE}. Run "npm run build && npm run preview" first.`);

  for (const [file, , opts, where] of SHOTS) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    await page.goto(BASE);
    const live = opts.reducedMotion !== 'reduce' && opts.javaScriptEnabled !== false;
    if (live) await page.waitForSelector('.seq__canvas.is-live');
    await page.waitForTimeout(1800); // entrance animation
    if (where === 'menu') {
      await page.click('button.menu-btn');
    } else if (where === 'closing') {
      await page.evaluate(() => window.scrollTo(0, document.querySelector('.closing').getBoundingClientRect().top + window.scrollY));
    } else if (typeof where === 'string' && where.startsWith('tab:')) {
      await page.evaluate(() => document.querySelector('#workspace').scrollIntoView({ behavior: 'instant' }));
      await page.getByRole('tab', { name: new RegExp(where.slice(4)) }).click();
    } else if (typeof where === 'string') {
      await page.evaluate((id) => document.querySelector(id).scrollIntoView({ behavior: 'instant' }), where);
    } else if (where > 0) {
      await page.evaluate((p) => {
        const track = document.querySelector('.seq__track');
        const end = document.querySelector('.seq__end');
        window.scrollTo(0, track.getBoundingClientRect().top + window.scrollY + end.offsetTop * p);
      }, where);
      // Let every frame load so the shot shows the exact frame for this position.
      await page.waitForFunction(() => (document.querySelector('.seq__stage').__sequence?.state.fetched ?? 0) >= 190, null, { timeout: 60_000 });
    }
    // On high-density screens, wait for the sharpened rest frame.
    if (live) await page.waitForFunction(() => { const s = document.querySelector('.seq__stage').__sequence?.state; return !s || !s.restTier || s.restShown === s.restTier || s.drawn < 0; }, null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, `${file}.png`) });
    await ctx.close();
    console.log(`  ${file}.png`);
  }
} finally {
  await browser.close();
}

const html = `<!doctype html><meta charset="utf-8"><title>Lumora landing — review screenshots</title>
<style>body{margin:0;padding:32px;background:#1b1b1a;color:#ebe8e1;font:15px/1.5 system-ui,sans-serif}
h1{font-weight:500;font-size:20px;margin:0 0 24px}figure{margin:0 0 40px}figcaption{margin:0 0 10px;color:#bdb9b0}
img{max-width:100%;max-height:88vh;border:1px solid #333;display:block}</style>
<h1>Lumora landing — local review screenshots (Microsoft Edge, ${new Date().toISOString().slice(0, 10)})</h1>
${SHOTS.map(([f, label]) => `<figure><figcaption>${label}</figcaption><img src="${f}.png" alt="${label}"></figure>`).join('\n')}`;
await writeFile(path.join(OUT, 'index.html'), html);
console.log(`Wrote ${SHOTS.length} screenshots + index.html to docs/screenshots`);
