import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { gotoHome, readSeq, scrollForProgress, seqState, settle, watchConsole } from './helpers';

const LAST = 201;

/** Scroll by `delta` px, `count` times: real wheel input on desktop, touch-initiated scrolling on mobile. */
async function scrollSteps(page: Page, info: TestInfo, delta: number, count: number, gapMs = 40) {
  const mobile = info.project.name === 'mobile';
  if (mobile) await page.evaluate(() => window.dispatchEvent(new Event('touchstart')));
  else await page.mouse.move(400, 400);
  for (let i = 0; i < count; i++) {
    if (mobile) await page.evaluate((d) => window.scrollBy(0, d), delta);
    else await page.mouse.wheel(0, delta);
    if (gapMs) await page.waitForTimeout(gapMs);
  }
}

interface Sample {
  phase: string;
  f: number;
  live: boolean;
  mean: number;
  std: number;
}

/** Records, on every animation frame, which frame is shown and whether the canvas has real content. */
async function startMonitor(page: Page) {
  await page.evaluate(() => {
    const canvas = document.querySelector('.seq__canvas') as HTMLCanvasElement;
    const stage = document.querySelector('.seq__stage') as HTMLElement;
    const probe = document.createElement('canvas');
    probe.width = 32;
    probe.height = 18;
    const ctx = probe.getContext('2d', { willReadFrequently: true })!;
    const mon = { phase: 'idle', samples: [] as { phase: string; f: number; live: boolean; mean: number; std: number }[], run: true };
    (window as unknown as { __mon: typeof mon }).__mon = mon;
    const loop = () => {
      if (!mon.run) return;
      ctx.drawImage(canvas, 0, 0, 32, 18);
      const d = ctx.getImageData(0, 0, 32, 18).data;
      let sum = 0;
      let sq = 0;
      for (let i = 0; i < d.length; i += 4) {
        const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        sum += l;
        sq += l * l;
      }
      const n = d.length / 4;
      const mean = sum / n;
      const live = canvas.classList.contains('is-live') && getComputedStyle(canvas).visibility === 'visible';
      mon.samples.push({ phase: mon.phase, f: Number(stage.dataset.frame), live, mean, std: Math.sqrt(Math.max(0, sq / n - mean * mean)) });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}

const setPhase = (page: Page, phase: string) => page.evaluate((p) => ((window as unknown as { __mon: { phase: string } }).__mon.phase = p), phase);
const stopMonitor = (page: Page) =>
  page.evaluate(() => {
    const mon = (window as unknown as { __mon: { run: boolean; samples: Sample[] } }).__mon;
    mon.run = false;
    return mon.samples;
  });

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('frame 001 and the whole page content are in the HTML itself', async ({ page }) => {
    await page.goto('/');
    const img = page.locator('#seq-poster');
    await expect(img).toBeVisible();
    const { w, src, loaded } = await img.evaluate((el: HTMLImageElement) => ({ w: el.getBoundingClientRect().width, src: el.currentSrc, loaded: el.naturalWidth > 0 }));
    expect(loaded).toBe(true);
    expect(src).toMatch(/\/sequence\/w\d+\/f001\.(avif|webp)$/);
    expect(w).toBeGreaterThan(page.viewportSize()!.width * 0.9);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Build with AI.');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Nothing is pinned: the page is in its still, in-flow layout.
    expect(await page.locator('.seq__stage').evaluate((el) => getComputedStyle(el).position)).toBe('relative');
    for (const name of ['An app that looks finished', 'From a tangle', 'What you’d see', 'Early, and honest about it.', 'Built for the']) {
      const h = page.getByRole('heading', { name });
      await h.scrollIntoViewIfNeeded();
      await expect(h).toBeVisible();
    }
    // Tabs cannot work without scripts, so all three concept sketches are shown.
    await expect(page.locator('.ws__tabs')).toBeHidden();
    for (const text of ['Requirements · version 1', 'Test run 3 · against requirements v1', 'Report · requirements v1']) {
      await expect(page.getByText(text)).toBeVisible();
    }
  });
});

test.describe('scroll-driven sequence', () => {
  test('shows frame 001 at the top and holds it', async ({ page }) => {
    const problems = watchConsole(page);
    await gotoHome(page);
    expect((await readSeq(page)).frame).toBe(1);
    await expect(page.locator('#seq-poster')).toHaveCount(1);
    await page.waitForTimeout(2000);
    const s = await readSeq(page);
    expect(s.frame).toBe(1);
    expect(s.scrollY).toBe(0);
    expect(problems).toEqual([]);
  });

  test('scrolling down plays forward to 201, scrolling up reverses to 001 and holds', async ({ page }, info) => {
    await gotoHome(page);
    const end = await scrollForProgress(page, 1);
    const down: number[] = [];
    while ((await readSeq(page)).scrollY < end) {
      await scrollSteps(page, info, 140, 1, 0);
      await settle(page);
      down.push((await readSeq(page)).frame);
    }
    expect(down.at(-1)).toBe(LAST);
    for (let i = 1; i < down.length; i++) expect(down[i], `frame went backwards scrolling down: ${down.join(',')}`).toBeGreaterThanOrEqual(down[i - 1]);
    expect(new Set(down).size).toBeGreaterThan(15);

    const up: number[] = [];
    while ((await readSeq(page)).scrollY > 0) {
      await scrollSteps(page, info, -140, 1, 0);
      await settle(page);
      up.push((await readSeq(page)).frame);
    }
    for (let i = 1; i < up.length; i++) expect(up[i], `frame went forwards scrolling up: ${up.join(',')}`).toBeLessThanOrEqual(up[i - 1]);
    expect(up.at(-1)).toBe(1);
    await page.waitForTimeout(1500);
    expect((await readSeq(page)).frame).toBe(1);
  });

  test('fast scrolling never blanks, never flashes back, and lands on the right frame', async ({ page }, info) => {
    await gotoHome(page);
    await startMonitor(page);
    // Cold: frames are still loading while we fling down.
    await setPhase(page, 'down');
    await scrollSteps(page, info, 420, 14, 16);
    await settle(page);
    await setPhase(page, 'up');
    await scrollSteps(page, info, -420, 14, 16);
    await page.evaluate(() => window.scrollTo(0, 0));
    await settle(page);
    await setPhase(page, 'top');
    await page.waitForTimeout(600);
    const samples = await stopMonitor(page);

    const blank = samples.filter((s) => !s.live || s.std < 8 || s.mean < 15);
    expect(blank, `blank or hidden canvas samples: ${JSON.stringify(blank.slice(0, 5))}`).toEqual([]);
    for (const phase of ['down', 'up'] as const) {
      const fs = samples.filter((s) => s.phase === phase).map((s) => s.f);
      for (let i = 1; i < fs.length; i++) {
        if (phase === 'down') expect(fs[i], `down: ${fs.join(',')}`).toBeGreaterThanOrEqual(fs[i - 1]);
        else expect(fs[i], `up: ${fs.join(',')}`).toBeLessThanOrEqual(fs[i - 1]);
      }
    }
    const top = samples.filter((s) => s.phase === 'top');
    expect(top.length).toBeGreaterThan(10);
    expect(top.every((s) => s.f === 1)).toBe(true);
    expect(samples.length).toBeGreaterThan(30);
  });

  test('each position shows its own frame (deterministic mapping)', async ({ page }) => {
    await gotoHome(page);
    // Play order (source frames, 0-based) as configured; frames skipped in config are absent.
    const order = await page.evaluate(() => (document.querySelector('.seq__stage') as HTMLElement & { __sequence: { order: number[] } }).__sequence.order);
    expect(order[0]).toBe(0);
    expect(order.at(-1)).toBe(LAST - 1);
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]);
    for (const p of [0, 0.5, 1, 0.25, 0.8, 0]) {
      await page.evaluate((y) => window.scrollTo(0, y), await scrollForProgress(page, p));
      await settle(page);
      const expected = order[Math.round(p * (order.length - 1))] + 1;
      await expect.poll(async () => (await readSeq(page)).frame).toBe(expected);
    }
  });

  test('reload mid-sequence restores the same frame without replaying from 001', async ({ page }) => {
    await gotoHome(page);
    await page.evaluate((y) => window.scrollTo(0, y), await scrollForProgress(page, 0.5));
    await settle(page);
    const before = (await readSeq(page)).frame;
    await page.reload();
    await expect(page.locator('.seq__canvas.is-live')).toHaveCount(1);
    await settle(page);
    const after = await readSeq(page);
    expect(Math.abs(after.frame - before)).toBeLessThanOrEqual(1);
  });

  test('in-page navigation and Back keep the sequence in step', async ({ page }) => {
    await gotoHome(page);
    await page.getByRole('link', { name: 'See how it’s meant to work' }).click();
    await expect(page).toHaveURL(/#approach$/);
    await expect.poll(async () => (await readSeq(page)).frame, { timeout: 15_000 }).toBe(LAST);
    // Let the smooth scroll to the anchor finish (as a visitor would) before going Back.
    await expect
      .poll(async () => Math.abs(await page.evaluate(() => document.getElementById('approach')!.getBoundingClientRect().top)), { timeout: 15_000 })
      .toBeLessThan(2);
    await settle(page);
    await page.goBack();
    await expect.poll(async () => (await readSeq(page)).scrollY, { timeout: 15_000 }).toBe(0);
    await settle(page);
    expect((await readSeq(page)).frame).toBe(1);
  });

  test('frames load progressively: keyframes first, the rest only after the visitor scrolls', async ({ page }, info) => {
    const urls = new Set<string>();
    let bytes = 0;
    page.on('response', async (r) => {
      if (!r.url().includes('/sequence/w')) return;
      urls.add(new URL(r.url()).pathname);
      bytes += (await r.body().catch(() => Buffer.alloc(0))).length;
    });
    await gotoHome(page);
    await page.waitForTimeout(2500);
    expect(urls.size, 'poster + keyframes only before any interaction').toBeLessThanOrEqual(30);
    expect(urls.size).toBeGreaterThanOrEqual(2);

    await scrollSteps(page, info, 200, 3);
    const tier = (await seqState(page)).tier;
    const scrub = () => [...urls].filter((u) => u.includes(`/w${tier}/`));
    await expect.poll(() => scrub().length, { timeout: 30_000 }).toBeGreaterThanOrEqual(195);
    expect(scrub().length).toBeLessThanOrEqual(201);
    // One resolution for the whole sequence (plus the poster and at most a few sharpened rest frames),
    // all AVIF, and nowhere near the 56.5 MB of source PNGs or the 1.9 GB of masters.
    expect([...urls].every((u) => u.endsWith('.avif'))).toBe(true);
    expect(urls.size - scrub().length).toBeLessThanOrEqual(6);
    expect(bytes).toBeLessThan(11 * 1024 * 1024);
  });

  test('picks a resolution for the device and bounds decoded frames', async ({ page }, info) => {
    await gotoHome(page);
    const s = await seqState(page);
    expect(s.format).toBe('avif');
    if (info.project.name === 'mobile') {
      // 390 px phone at 3x: scrubs 1440, rests on 1920, never touches 2560 or 3840.
      expect(s.tier).toBe(1440);
      expect(s.restTier).toBe(1920);
      await expect.poll(async () => (await seqState(page)).restShown, { timeout: 15_000 }).toBe(1920);
    } else {
      // 1440x900 at 1x: the artwork is 1600 device px wide, so 1920 is already sharper than the screen.
      expect(s.tier).toBe(1920);
      expect(s.restTier).toBe(null);
      expect(Math.abs(s.canvas - 1600)).toBeLessThanOrEqual(2);
    }
    await scrollSteps(page, info, 300, 12, 30);
    await settle(page);
    const after = await seqState(page);
    expect(after.decoded).toBeLessThanOrEqual(after.window + 2);
  });
});

test.describe('high-density desktop', () => {
  test.use({ deviceScaleFactor: 2 });

  test('scrubs 2560 and swaps in the 3840 frame at rest, without changing which frame is shown', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', 'desktop only');
    await gotoHome(page);
    expect((await seqState(page)).tier).toBe(2560);
    await expect.poll(async () => (await seqState(page)).restShown, { timeout: 15_000 }).toBe(3840);
    await page.evaluate((y) => window.scrollTo(0, y), await scrollForProgress(page, 0.5));
    await settle(page);
    const frame = (await readSeq(page)).frame;
    await expect.poll(async () => (await seqState(page)).restShown, { timeout: 15_000 }).toBe(3840);
    expect((await readSeq(page)).frame).toBe(frame);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('shows a still frame 001, nothing pinned, no frame downloads, every caption readable', async ({ page }) => {
    const problems = watchConsole(page);
    const frames = new Set<string>();
    page.on('request', (r) => {
      const m = r.url().match(/\/sequence\/w\d+\/(f\d+)\./);
      if (m) frames.add(m[1]);
    });
    await page.goto('/');
    await expect(page.locator('#seq-poster')).toBeVisible();
    await expect(page.locator('.seq__canvas.is-live')).toHaveCount(0);
    expect(await page.locator('html').evaluate((el) => el.classList.contains('motion'))).toBe(false);
    expect(await page.locator('.seq__stage').evaluate((el) => getComputedStyle(el).position)).toBe('relative');
    const { track, viewport } = await page.evaluate(() => ({
      track: (document.querySelector('.seq__track') as HTMLElement).offsetHeight,
      viewport: window.innerHeight,
    }));
    expect(track).toBeLessThan(viewport * 2.6);
    for (const text of ['Everything seems to be in place.', 'Now you can see what holds, and what doesn’t.']) {
      const el = page.getByText(text);
      await el.scrollIntoViewIfNeeded();
      await expect(el).toBeVisible();
    }
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(800);
    // Only frame 001 and the closing still (frame 096) are ever requested.
    expect([...frames].sort()).toEqual(['f001', 'f096']);
    expect(problems).toEqual([]);
  });
});
