import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { gotoHome, watchConsole } from './helpers';

test.describe('page quality', () => {
  test('no console errors, warnings or failed requests across the whole page', async ({ page }) => {
    const problems = watchConsole(page);
    await gotoHome(page);
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y <= h; y += 600) {
      await page.evaluate((y) => window.scrollTo(0, y), y);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(1000);
    expect(problems).toEqual([]);
  });

  test('no horizontal overflow at any width or scroll position', async ({ page }) => {
    await gotoHome(page);
    for (const [width, height] of [
      [1920, 1080],
      [1440, 900],
      [1280, 720],
      [1024, 768],
      [820, 1180],
      [768, 1024],
      [390, 760],
      [320, 568],
    ]) {
      await page.setViewportSize({ width, height });
      for (const p of [0, 0.25, 0.5, 0.75, 1]) {
        await page.evaluate((p) => window.scrollTo(0, document.documentElement.scrollHeight * p), p);
        await page.waitForTimeout(80);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(over, `overflow at ${width}px, ${p * 100}%`).toBeLessThanOrEqual(0);
      }
    }
  });

  test('the headline fits its line at every landscape size (no clipping, no overlap with the deck)', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', 'landscape layout');
    await gotoHome(page);
    for (const [width, height] of [
      [2560, 1440],
      [1920, 1080],
      [1440, 900],
      [1366, 768],
      [1280, 720],
      [1024, 768],
      [1280, 600],
    ]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(150);
      const m = await page.evaluate(() => {
        const rect = (sel: string) => document.querySelector(sel)!.getBoundingClientRect();
        const lines = [...document.querySelectorAll('.hero__line-inner')].map((l) => l.getBoundingClientRect());
        const deck = rect('.hero__deck');
        const title = rect('.hero__title');
        return { right: Math.max(...lines.map((l) => l.right)), line1Right: lines[0].right, line1Top: lines[0].top, deckLeft: deck.left, deckTop: deck.top, deckBottom: deck.bottom, titleBottom: title.bottom, vw: innerWidth, vh: innerHeight };
      });
      expect(m.right, `headline wider than ${width}px viewport`).toBeLessThanOrEqual(m.vw - 12);
      expect(m.titleBottom, `headline below the fold at ${width}x${height}`).toBeLessThanOrEqual(m.vh);
      // The deck sits to the right of line one, never on top of it, and clears the header.
      expect(m.line1Right, `deck overlaps headline at ${width}x${height}`).toBeLessThan(m.deckLeft);
      expect(m.deckTop, `deck under the header at ${width}x${height}`).toBeGreaterThan(64);
    }
  });

  test('the blended headline is actually legible where it crosses the artwork', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', 'the headline only overlaps the artwork in the landscape layout');
    await gotoHome(page);
    await page.waitForTimeout(1800);
    const box = (await page.locator('.hero__title').boundingBox())!;
    const clip = { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) };
    const grey = async () => sharp(await page.screenshot({ clip })).greyscale().raw().toBuffer();
    const withText = await grey();
    await page.addStyleTag({ content: '.hero__title{visibility:hidden!important}' });
    const without = await grey();
    // Pixels the text changed, and by how much (0-255 luminance).
    const deltas: number[] = [];
    for (let i = 0; i < withText.length; i++) {
      const d = Math.abs(withText[i] - without[i]);
      if (d > 24) deltas.push(d);
    }
    deltas.sort((a, b) => a - b);
    expect(deltas.length, 'the headline changed almost no pixels').toBeGreaterThan(withText.length * 0.04);
    const median = deltas[deltas.length >> 1];
    const strong = deltas.filter((d) => d >= 110).length / deltas.length;
    // 110/255 luminance difference is roughly a 4.5:1 contrast step at these tones.
    expect(median, 'median luminance difference between text and what is behind it').toBeGreaterThan(150);
    expect(strong, 'share of text pixels with a strong luminance difference').toBeGreaterThan(0.8);
  });

  test('axe: no serious or critical WCAG A/AA violations', async ({ page }) => {
    await gotoHome(page);
    await page.waitForTimeout(1800); // entrance animations settle
    for (const where of ['top', '#problem', '#approach', '#workspace', '#status', 'bottom']) {
      await page.evaluate((w) => {
        if (w === 'top') window.scrollTo(0, 0);
        else if (w === 'bottom') window.scrollTo(0, document.documentElement.scrollHeight);
        else document.querySelector(w)?.scrollIntoView({ behavior: 'instant' });
      }, where);
      await page.waitForTimeout(700);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        // The headline and scroll cue take the backdrop colour and are difference-blended over the
        // artwork, which axe cannot compute. Their real, rendered contrast is measured from pixels in
        // "the blended headline is actually legible" above.
        .exclude('.hero__title')
        .exclude('.hero__cue')
        .analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`), `at ${where}`).toEqual([]);
    }
  });

  test('every link is real: in-page anchors resolve, nothing external, no forms', async ({ page }) => {
    await gotoHome(page);
    const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
    expect(hrefs.length).toBeGreaterThan(8);
    for (const href of hrefs) {
      expect(href.startsWith('#'), `non-anchor link: ${href}`).toBe(true);
      if (href.length > 1) expect(await page.locator(href).count(), `missing target ${href}`).toBe(1);
    }
    expect(await page.locator('form, input, textarea, select').count()).toBe(0);
    // The only buttons are the phone menu toggle and the three concept-view tabs.
    const buttons = await page.locator('button').evaluateAll((bs) => bs.map((b) => b.getAttribute('role') ?? b.className));
    expect(buttons.filter((b) => b === 'tab').length).toBe(3);
    expect(buttons.filter((b) => b !== 'tab')).toEqual(['pill menu-btn']);
  });

  test('copy stays honest: planned and concept work is labelled, no invented proof or offers', async ({ page }) => {
    await gotoHome(page);
    const text = await page.evaluate(() => document.body.innerText);
    for (const must of [/working name/i, /not built yet/i, /in development/i, /not yet available/i, /concept/i, /not a screenshot/i, /not a real app/i, /made-up example data/i]) {
      expect(text).toMatch(must);
    }
    for (const banned of [
      /waitlist/i,
      /sign up|sign in|log in|create account/i,
      /subscribe/i,
      /testimonial|trusted by|loved by|our customers/i,
      /backed by|investor|funded/i,
      /kickstarter|pledge/i,
      /\$\s?\d|per month|\/mo\b/i,
      /\b\d+\s?(k|,000)?\+?\s+(users|teams|developers|customers)\b/i,
      /guarantee|bug-free|production-ready/i,
      /launch(es|ing)? (on|in)\b/i,
    ]) {
      expect(text, `found ${banned}`).not.toMatch(banned);
    }
  });

  test('page head: title, noindex, language, one h1, ordered headings', async ({ page }) => {
    await gotoHome(page);
    await expect(page).toHaveTitle(/Lumora/);
    expect(await page.locator('meta[name="robots"]').getAttribute('content')).toContain('noindex');
    expect(await page.locator('html').getAttribute('lang')).toBe('en');
    expect(await page.locator('h1').count()).toBe(1);
    const levels = await page.locator('h1, h2, h3').evaluateAll((hs) => hs.map((h) => Number(h.tagName[1])));
    for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1], `heading level jump at #${i}`).toBeLessThanOrEqual(1);
  });

  test('keyboard: the skip link comes first and is visible when focused', async ({ page }) => {
    await gotoHome(page);
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await page.waitForTimeout(300);
    const box = await skip.boundingBox();
    expect(box && box.y >= 0).toBe(true);
  });
});

test.describe('workspace concept', () => {
  test('tabs switch between the three sketches, by click and by arrow keys', async ({ page }) => {
    await gotoHome(page);
    await page.locator('#workspace').scrollIntoViewIfNeeded();
    const tab = (name: string) => page.getByRole('tab', { name: new RegExp(name) });
    await expect(tab('Contract')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Requirements · version 1')).toBeVisible();
    await expect(page.getByText('Report · requirements v1')).toBeHidden();

    await tab('Test run').click();
    await expect(tab('Test run')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toContainText('Tester B');
    await expect(page.getByText('Requirements · version 1')).toBeHidden();

    await page.keyboard.press('ArrowRight');
    await expect(tab('Report')).toBeFocused();
    await expect(page.getByRole('tabpanel')).toContainText('2 of 4 verified');
    await page.keyboard.press('ArrowRight');
    await expect(tab('Contract')).toBeFocused();
    await page.keyboard.press('End');
    await expect(tab('Report')).toHaveAttribute('aria-selected', 'true');
    // It is labelled as a concept wherever you are in it.
    await expect(page.locator('.sheet__stamp')).toBeVisible();
  });
});

test.describe('navigation', () => {
  test('section links scroll to their sections and mark the current one', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', 'desktop nav');
    await gotoHome(page);
    const nav = page.getByRole('navigation', { name: 'Sections' });
    await nav.getByRole('link', { name: 'Workspace' }).click();
    await expect(page).toHaveURL(/#workspace$/);
    await expect(nav.getByRole('link', { name: 'Workspace' })).toHaveAttribute('aria-current', 'location', { timeout: 15_000 });
  });

  test('phone menu opens, closes with Escape (focus returns) and navigates', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'phone menu');
    await gotoHome(page);
    const btn = page.locator('button.menu-btn');
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    const menu = page.locator('#site-menu');
    await expect(menu.getByRole('link', { name: 'Approach' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(btn).toBeFocused();
    await btn.click();
    await menu.getByRole('link', { name: 'Problem' }).click();
    await expect(menu).toBeHidden();
    await expect(page).toHaveURL(/#problem$/);
  });
});
