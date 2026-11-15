// Unit tests for resolution-tier selection. Run: npm run test:unit
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { planTiers, type DeviceHints, type Tier } from '../../src/sequence/tiers.ts';

const TIERS: Tier[] = [960, 1440, 1920, 2560, 3840].map((w) => ({ width: w, height: (w * 9) / 16, bytes: 0 }));
const desktop = (o: Partial<DeviceHints>): DeviceHints => ({ boxCssWidth: 1600, dpr: 1, coarsePointer: false, constrainedNetwork: false, ...o });
const phone = (o: Partial<DeviceHints>): DeviceHints => ({ boxCssWidth: 585, dpr: 3, coarsePointer: true, constrainedNetwork: false, ...o });

describe('planTiers', () => {
  it('a 1440x900 desktop at 1x scrubs 1920 and needs no sharper rest frame', () => {
    const p = planTiers(TIERS, desktop({}));
    assert.equal(p.scrub.width, 1920);
    assert.equal(p.rest, null);
    assert.equal(p.canvasWidth, 1600);
    assert.equal(p.stride, 1);
  });
  it('a 1366x768 laptop scrubs 1440', () => {
    assert.equal(planTiers(TIERS, desktop({ boxCssWidth: 1366 })).scrub.width, 1440);
  });
  it('a 2x laptop scrubs 2560 and rests on 3840', () => {
    const p = planTiers(TIERS, desktop({ dpr: 2 }));
    assert.equal(p.scrub.width, 2560);
    assert.equal(p.rest?.width, 3840);
    assert.equal(p.canvasWidth, 3200);
  });
  it('a 4K-class desktop never scrubs above 2560', () => {
    const p = planTiers(TIERS, desktop({ boxCssWidth: 2560, dpr: 1.5 }));
    assert.equal(p.scrub.width, 2560);
    assert.equal(p.rest?.width, 3840);
  });
  it('a phone scrubs at most 1440 and rests one step sharper, never 3840', () => {
    const p = planTiers(TIERS, phone({}));
    assert.equal(p.scrub.width, 1440);
    assert.equal(p.rest?.width, 1920);
    assert.ok(p.canvasWidth <= 1920);
  });
  it('a small-screen 2x phone gets the smallest tier that covers it', () => {
    const p = planTiers(TIERS, phone({ boxCssWidth: 480, dpr: 2 }));
    assert.equal(p.scrub.width, 960);
  });
  it('data saver / slow connections: smallest tier, every second frame, no rest upgrade', () => {
    for (const d of [desktop({ constrainedNetwork: true }), phone({ constrainedNetwork: true })]) {
      const p = planTiers(TIERS, d);
      assert.equal(p.scrub.width, 960);
      assert.equal(p.rest, null);
      assert.equal(p.stride, 2);
    }
  });
  it('low-memory desktops are treated like phones', () => {
    const p = planTiers(TIERS, desktop({ dpr: 2, deviceMemory: 4 }));
    assert.equal(p.scrub.width, 1440);
    assert.ok(p.windowSize * ((1440 * 810 * 4) / 1048576) <= 72);
  });
  it('bounds decoded frames by a memory budget, not a fixed count', () => {
    for (const d of [desktop({}), desktop({ dpr: 2 }), phone({}), phone({ constrainedNetwork: true })]) {
      const p = planTiers(TIERS, d);
      const mb = (p.windowSize * p.scrub.width * p.scrub.height * 4) / 1048576;
      assert.ok(mb <= (d.coarsePointer ? 72 : 150) + 1, `${p.scrub.width}: ${mb.toFixed(0)} MB`);
      assert.ok(p.windowSize >= 8);
    }
  });
  it('works with the WebP fallback set (two widths)', () => {
    const fallback = TIERS.filter((t) => t.width === 960 || t.width === 1920);
    assert.equal(planTiers(fallback, desktop({ dpr: 2 })).scrub.width, 1920);
    assert.equal(planTiers(fallback, phone({})).scrub.width, 960);
  });
});
