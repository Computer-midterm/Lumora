// Unit tests for the scroll -> frame math. Run: npm run test:unit (Node's built-in runner, no deps).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  approach,
  coarseToFineOrder,
  decodeWindow,
  frameFromProgress,
  immersionTransform,
  nearestAvailable,
  nearestNotPast,
  progressFromScroll,
  smoothstep,
} from '../../src/sequence/frameMath.ts';

describe('progressFromScroll', () => {
  it('is 0 at and above the top of the track', () => {
    assert.equal(progressFromScroll(0, 0, 1000), 0);
    assert.equal(progressFromScroll(-50, 0, 1000), 0);
    assert.equal(progressFromScroll(100, 400, 1000), 0);
  });
  it('is linear inside the track and clamps at 1', () => {
    assert.equal(progressFromScroll(500, 0, 1000), 0.5);
    assert.equal(progressFromScroll(1000, 0, 1000), 1);
    assert.equal(progressFromScroll(5000, 0, 1000), 1);
  });
  it('guards a zero or negative distance', () => {
    assert.equal(progressFromScroll(10, 0, 0), 0);
    assert.equal(progressFromScroll(10, 0, -5), 0);
  });
});

describe('frameFromProgress', () => {
  it('maps 0 -> first frame and 1 -> last frame', () => {
    assert.equal(frameFromProgress(0, 201), 0);
    assert.equal(frameFromProgress(1, 201), 200);
  });
  it('is monotonic and clamped', () => {
    let prev = -1;
    for (let p = 0; p <= 1.0001; p += 0.001) {
      const f = frameFromProgress(p, 201);
      assert.ok(f >= prev, `frame went backwards at p=${p}`);
      prev = f;
    }
    assert.equal(frameFromProgress(-1, 201), 0);
    assert.equal(frameFromProgress(2, 201), 200);
  });
  it('handles a single frame', () => {
    assert.equal(frameFromProgress(0.7, 1), 0);
  });
});

describe('approach (smoothing)', () => {
  it('lands exactly on the target, including exactly 0 at the top', () => {
    let v = 0.4;
    for (let i = 0; i < 400 && v !== 0; i++) v = approach(v, 0, 16.7);
    assert.equal(v, 0);
    let w = 0;
    for (let i = 0; i < 400 && w !== 1; i++) w = approach(w, 1, 16.7);
    assert.equal(w, 1);
  });
  it('moves toward the target without overshooting', () => {
    const v = approach(0, 1, 16.7);
    assert.ok(v > 0 && v < 1);
    const down = approach(1, 0.5, 16.7);
    assert.ok(down < 1 && down > 0.5);
  });
  it('is frame-rate independent (two 8ms steps ~ one 16ms step)', () => {
    const one = approach(0, 1, 16);
    const two = approach(approach(0, 1, 8), 1, 8);
    assert.ok(Math.abs(one - two) < 1e-9);
  });
  it('caps huge time steps (tab was in the background)', () => {
    assert.equal(approach(0, 1, 10_000), approach(0, 1, 100));
  });
});

describe('coarseToFineOrder', () => {
  it('contains every frame exactly once, ends first and coarse', () => {
    const order = coarseToFineOrder(201);
    assert.equal(order.length, 201);
    assert.equal(new Set(order).size, 201);
    assert.deepEqual(order.slice(0, 4), [0, 200, 8, 16]);
  });
  it('can stop at a stride (data saver) and skip frames', () => {
    const even = coarseToFineOrder(201, [8, 4, 2]);
    assert.ok(even.every((i) => i % 2 === 0 || i === 200));
    const skipped = coarseToFineOrder(10, [1], new Set([3, 4]));
    assert.ok(!skipped.includes(3) && !skipped.includes(4));
  });
});

describe('nearestAvailable', () => {
  const has = (set: number[]) => (i: number) => set.includes(i);
  it('returns the target when available', () => {
    assert.equal(nearestAvailable(5, 10, has([5, 6])), 5);
  });
  it('prefers the frame we came from on ties (hold, do not jump ahead)', () => {
    assert.equal(nearestAvailable(5, 10, has([4, 6]), 1), 4);
    assert.equal(nearestAvailable(5, 10, has([4, 6]), -1), 6);
  });
  it('finds the closest available frame, or -1', () => {
    assert.equal(nearestAvailable(5, 10, has([0, 9]), 1), 9);
    assert.equal(nearestAvailable(5, 10, has([]), 1), -1);
  });
});

describe('nearestNotPast', () => {
  const has = (set: number[]) => (i: number) => set.includes(i);
  it('returns the target when available', () => {
    assert.equal(nearestNotPast(5, 10, has([5, 9]), 1), 5);
  });
  it('scrolling down: only frames at or before the target', () => {
    assert.equal(nearestNotPast(5, 10, has([2, 6]), 1), 2);
    assert.equal(nearestNotPast(5, 10, has([6, 9]), 1), -1);
  });
  it('scrolling up: only frames at or after the target (never the poster from far ahead)', () => {
    assert.equal(nearestNotPast(40, 201, has([0, 55]), -1), 55);
    assert.equal(nearestNotPast(40, 201, has([0]), -1), -1);
    assert.equal(nearestNotPast(0, 201, has([0]), -1), 0);
  });
});

describe('decodeWindow', () => {
  it('is centred, in range, nearest first, biased ahead', () => {
    const w = decodeWindow(100, 201, 20, 1);
    assert.equal(w[0], 100);
    assert.ok(w.every((i) => i >= 0 && i < 201));
    assert.ok(w.filter((i) => i > 100).length > w.filter((i) => i < 100).length);
    const edge = decodeWindow(0, 201, 20, -1);
    assert.ok(edge.every((i) => i >= 0));
  });
});

describe('smoothstep', () => {
  it('is 0 below, 1 above, 0.5 in the middle', () => {
    assert.equal(smoothstep(0.5, 0.7, 0.4), 0);
    assert.equal(smoothstep(0.5, 0.7, 0.8), 1);
    assert.ok(Math.abs(smoothstep(0, 1, 0.5) - 0.5) < 1e-12);
  });
});

describe('immersionTransform', () => {
  const melt = { left: 0, right: 0.24, top: 0, bottom: 0 };
  it('is identity at t = 0, with the melt fully on', () => {
    const t = immersionTransform({ w: 1440, h: 900 }, { x: -400, y: 0, w: 1600, h: 900 }, melt, 1.5, 0);
    assert.deepEqual(t, { tx: 0, ty: 0, scale: 1, meltK: 1 });
  });
  it('goes full-bleed without zooming when the frame already covers the stage', () => {
    const stage = { w: 1440, h: 900 };
    const box = { x: -400, y: 0, w: 1600, h: 900 };
    const t = immersionTransform(stage, box, melt, 1.5, 1);
    assert.equal(t.scale, 1); // 1600x900 already covers 1440x900
    assert.equal(t.meltK, 0); // edges fully un-melted
    assert.ok(Math.abs(box.x + box.w / 2 + t.tx - stage.w / 2) < 0.5); // centred
  });
  it('scales just enough to cover a wider stage', () => {
    const stage = { w: 1920, h: 900 };
    const box = { x: -300, y: 0, w: 1600, h: 900 };
    const t = immersionTransform(stage, box, melt, 1.5, 1);
    assert.ok(Math.abs(t.scale - 1.2) < 1e-9);
    assert.equal(t.meltK, 0);
  });
  it('keeps the melted edges and caps the scale when covering would exceed maxScale (portrait)', () => {
    const stage = { w: 390, h: 844 };
    const box = { x: -130, y: 42, w: 585, h: 329 };
    const m = { left: 0.08, right: 0.08, top: 0.16, bottom: 0.26 };
    const t = immersionTransform(stage, box, m, 1.32, 1);
    assert.equal(t.meltK, 1);
    assert.ok(t.scale <= 1.32 + 1e-9);
    // The opaque area's centre lands on the stage centre.
    const cy = box.y + box.h / 2;
    const oy = box.y + box.h * (m.top + (1 - m.top - m.bottom) / 2);
    assert.ok(Math.abs(cy + t.ty + (oy - cy) * t.scale - stage.h / 2) < 0.5);
  });
  it('interpolates smoothly in between', () => {
    const half = immersionTransform({ w: 1920, h: 900 }, { x: -300, y: 0, w: 1600, h: 900 }, melt, 1.5, 0.5);
    assert.ok(half.scale > 1 && half.scale < 1.2);
    assert.equal(half.meltK, 0.5);
  });
});
