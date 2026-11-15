import { expect, type Page } from '@playwright/test';

export interface SeqState {
  frame: number;
  scrollY: number;
  target: number | null;
  current: number | null;
  live: boolean;
}

/** Frame currently on the canvas (1-based source frame) plus engine state. */
export function readSeq(page: Page): Promise<SeqState> {
  return page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>('.seq__stage');
    const eng = (stage as (HTMLElement & { __sequence?: { state: { target: number; current: number } } }) | null)?.__sequence;
    return {
      frame: Number(stage?.dataset.frame ?? 0),
      scrollY: window.scrollY,
      target: eng ? eng.state.target : null,
      current: eng ? eng.state.current : null,
      live: !!document.querySelector('.seq__canvas.is-live'),
    };
  });
}

/** Wait until the browser's own (smooth) scrolling has stopped and the sequence has caught up with it. */
export async function settle(page: Page) {
  let lastY = -1;
  await expect
    .poll(
      async () => {
        const s = await readSeq(page);
        const still = s.scrollY === lastY;
        lastY = s.scrollY;
        return still && s.target !== null && s.target === s.current;
      },
      { intervals: [50, 80, 120, 120, 200] },
    )
    .toBe(true);
  // One more frame so a just-decoded frame can be painted.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/** Scroll position (px) at which the sequence reaches a given progress. */
export function scrollForProgress(page: Page, p: number) {
  return page.evaluate((p) => {
    const track = document.querySelector('.seq__track') as HTMLElement;
    const end = document.querySelector('.seq__end') as HTMLElement;
    return Math.round(track.getBoundingClientRect().top + window.scrollY + end.offsetTop * p);
  }, p);
}

export async function gotoHome(page: Page) {
  await page.goto('/');
  await expect(page.locator('.seq__canvas.is-live')).toHaveCount(1);
}

/** Collect console errors/warnings, page errors and failed requests. */
export function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText ?? ''}`));
  page.on('response', (r) => {
    if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`);
  });
  return problems;
}

export interface EngineState {
  tier: number;
  restTier: number | null;
  restShown: number | null;
  window: number;
  canvas: number;
  decoded: number;
  fetched: number;
  format: string | undefined;
}

/** Engine diagnostics: chosen resolution, rest frame, cache sizes. */
export function seqState(page: Page): Promise<EngineState> {
  return page.evaluate(() => {
    const stage = document.querySelector('.seq__stage') as HTMLElement & { __sequence: { state: Omit<EngineState, 'format'> } };
    return { ...stage.__sequence.state, format: stage.dataset.format };
  });
}
